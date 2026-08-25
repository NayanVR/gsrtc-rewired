import { captureException } from "@sentry/tanstackstart-react";
import { and, count, eq, gt, inArray, lt, sql } from "drizzle-orm";
import type { Passenger } from "#/api/schemas";
import {
	calculateBookingAmount,
	confirmHold,
	getHeldSeatNos,
	hasMatchingSeatNos,
} from "#/api/services/confirm-booking";
import { getDb } from "#/db/client";
import {
	bookedSeats,
	bookings,
	paymentIntents,
	paymentWebhookEvents,
	seatHolds,
	user,
	walletAccounts,
	walletTransactions,
} from "#/db/schema";
import { assertTestCheckoutUrl, dodo } from "#/lib/dodo";

export const PAYMENT_WINDOW_MS = 15 * 60 * 1000;
const BOOKING_INTENT_LIMIT = 5;
const WALLET_INTENT_LIMIT = 10;
const WALLET_RATE_WINDOW_MS = 60 * 60 * 1000;
const TERMINAL_PAYMENT_STATUSES = [
	"succeeded",
	"failed",
	"orphaned",
	"expired",
	"refunded",
] as const;

interface PaymentErrors {
	CONFLICT: () => unknown;
	NOT_FOUND: () => unknown;
	PAYMENT_FAILED: (options?: { message?: string }) => unknown;
	RATE_LIMITED: () => unknown;
}

interface BookingPaymentInput {
	contact: { email?: string; mobile: string };
	holdId: string;
	passengers: Passenger[];
	singleLady?: boolean;
	tripId: string;
}

interface PaymentCustomer {
	email: string;
	id: string;
	name: string;
}

export interface VerifiedDodoWebhook {
	eventType: string;
	payload: Record<string, unknown>;
	payment: {
		failureCode?: string;
		failureMessage?: string;
		metadata: Record<string, string>;
		paymentId: string;
		paymentMethod?: string;
		totalAmount?: number;
	};
	webhookId: string;
}

function getReturnUrl(paymentIntentId: string): string {
	const baseUrl = process.env.BETTER_AUTH_URL;
	if (!baseUrl) {
		throw new Error("BETTER_AUTH_URL is required for Dodo payment returns.");
	}
	return new URL(
		`/payment/return?intent=${paymentIntentId}`,
		baseUrl
	).toString();
}

async function createCheckoutSession(input: {
	amountPaise: number;
	customer: { email?: string; name: string };
	metadata: Record<string, string>;
	paymentIntentId: string;
	productId: string | undefined;
}): Promise<{ checkoutUrl: string; dodoSessionId: string }> {
	if (!input.productId) {
		throw new Error("The Dodo product ID is not configured.");
	}
	const session = await dodo.checkoutSessions.create({
		customer: input.customer.email
			? { email: input.customer.email, name: input.customer.name }
			: undefined,
		metadata: input.metadata,
		product_cart: [
			{ amount: input.amountPaise, product_id: input.productId, quantity: 1 },
		],
		return_url: getReturnUrl(input.paymentIntentId),
	});
	if (!session.checkout_url) {
		throw new Error("Dodo did not return a hosted checkout URL.");
	}
	return {
		checkoutUrl: assertTestCheckoutUrl(session.checkout_url),
		dodoSessionId: session.session_id,
	};
}

async function markSessionCreationFailed(
	paymentIntentId: string,
	error: unknown,
	incident = false
): Promise<void> {
	const message =
		error instanceof Error ? error.message : "Unknown Dodo error.";
	await getDb()
		.update(paymentIntents)
		.set({
			failureMessage: message,
			incidentReason: incident ? "non_test_checkout_url" : null,
			status: "failed",
		})
		.where(eq(paymentIntents.id, paymentIntentId));
}

function isNonTestCheckoutUrlError(error: unknown): boolean {
	return (
		error instanceof Error &&
		error.message === "Dodo returned a checkout URL outside test mode."
	);
}

export function checkoutFailureMessage(error: unknown): string {
	if (
		typeof error !== "object" ||
		error === null ||
		!("status" in error) ||
		typeof error.status !== "number"
	) {
		return "Dodo checkout is temporarily unavailable. Please try again shortly.";
	}
	switch (error.status) {
		case 401:
		case 403:
			return "Dodo test credentials are invalid or unavailable. Please contact support.";
		case 404:
			return "A Dodo test product could not be found. Please contact support.";
		case 422:
			return "This fare is outside the Dodo product's allowed test price range. Please contact support.";
		case 429:
			return "Dodo is receiving too many requests. Please try again shortly.";
		default:
			return "Dodo checkout is temporarily unavailable. Please try again shortly.";
	}
}

function captureCheckoutFailure(
	error: unknown,
	paymentIntentId: string,
	purpose: "booking" | "wallet_topup"
): void {
	captureException(error, {
		tags: { payment_intent_id: paymentIntentId, purpose },
	});
}

export async function startBookingPayment(
	input: BookingPaymentInput,
	errors: PaymentErrors
) {
	const intent = await getDb().transaction(async (tx) => {
		const [hold] = await tx
			.select()
			.from(seatHolds)
			.where(eq(seatHolds.id, input.holdId))
			.for("update")
			.limit(1);
		if (!hold || hold.expiresAt <= new Date()) {
			throw errors.NOT_FOUND();
		}
		if (hold.tripId !== input.tripId || hold.consumedAt) {
			throw errors.CONFLICT();
		}
		const heldSeatNos = await getHeldSeatNos(tx, hold.id);
		if (
			!hasMatchingSeatNos(
				input.passengers.map((passenger) => passenger.seatNo),
				heldSeatNos
			)
		) {
			throw errors.CONFLICT();
		}

		const expiresAt = new Date(Date.now() + PAYMENT_WINDOW_MS);
		await tx
			.update(seatHolds)
			.set({ expiresAt })
			.where(eq(seatHolds.id, hold.id));
		await tx
			.update(bookedSeats)
			.set({ expiresAt })
			.where(
				and(eq(bookedSeats.holdId, hold.id), eq(bookedSeats.state, "held"))
			);

		const [reusedIntent] = await tx
			.select()
			.from(paymentIntents)
			.where(
				and(
					eq(paymentIntents.holdId, hold.id),
					eq(paymentIntents.status, "created"),
					gt(paymentIntents.expiresAt, new Date())
				)
			)
			.limit(1);
		if (reusedIntent?.checkoutUrl) {
			return reusedIntent;
		}

		const [intentCount] = await tx
			.select({ value: count() })
			.from(paymentIntents)
			.where(eq(paymentIntents.holdId, hold.id));
		if ((intentCount?.value ?? 0) >= BOOKING_INTENT_LIMIT) {
			throw errors.RATE_LIMITED();
		}

		const [createdIntent] = await tx
			.insert(paymentIntents)
			.values({
				amountPaise: Math.round(
					calculateBookingAmount(hold.tripId, heldSeatNos) * 100
				),
				contactEmail: input.contact.email,
				contactMobile: input.contact.mobile,
				expiresAt,
				holdId: hold.id,
				id: crypto.randomUUID(),
				passengers: input.passengers,
				purpose: "booking",
				singleLady: input.singleLady ?? false,
				status: "created",
				tripId: hold.tripId,
			})
			.returning();
		if (!createdIntent) {
			throw errors.PAYMENT_FAILED();
		}
		return createdIntent;
	});

	if (intent.checkoutUrl) {
		return toCheckoutResult(intent);
	}
	try {
		const session = await createCheckoutSession({
			amountPaise: intent.amountPaise,
			customer: {
				email: intent.contactEmail ?? undefined,
				name: intent.passengers?.[0]?.name ?? "GSRTC passenger",
			},
			metadata: {
				hold_id: intent.holdId ?? "",
				payment_intent_id: intent.id,
				purpose: "booking",
				trip_id: intent.tripId ?? "",
			},
			paymentIntentId: intent.id,
			productId: process.env.DODO_PRODUCT_ID_BOOKING,
		});
		await getDb()
			.update(paymentIntents)
			.set(session)
			.where(eq(paymentIntents.id, intent.id));
		return { ...toCheckoutResult(intent), checkoutUrl: session.checkoutUrl };
	} catch (error) {
		captureCheckoutFailure(error, intent.id, "booking");
		await markSessionCreationFailed(
			intent.id,
			error,
			isNonTestCheckoutUrlError(error)
		);
		throw errors.PAYMENT_FAILED({ message: checkoutFailureMessage(error) });
	}
}

export async function startWalletTopUp(
	amount: number,
	currentUser: PaymentCustomer,
	errors: PaymentErrors
) {
	const intent = await getDb().transaction(async (tx) => {
		const rateLimitAt = new Date(Date.now() - WALLET_RATE_WINDOW_MS);
		const [intentCount] = await tx
			.select({ value: count() })
			.from(paymentIntents)
			.where(
				and(
					eq(paymentIntents.userId, currentUser.id),
					gt(paymentIntents.createdAt, rateLimitAt),
					inArray(paymentIntents.status, ["created", "processing"])
				)
			);
		if ((intentCount?.value ?? 0) >= WALLET_INTENT_LIMIT) {
			throw errors.RATE_LIMITED();
		}
		const [createdIntent] = await tx
			.insert(paymentIntents)
			.values({
				amountPaise: Math.round(amount * 100),
				expiresAt: new Date(Date.now() + PAYMENT_WINDOW_MS),
				id: crypto.randomUUID(),
				purpose: "wallet_topup",
				status: "created",
				userId: currentUser.id,
			})
			.returning();
		if (!createdIntent) {
			throw errors.PAYMENT_FAILED();
		}
		return createdIntent;
	});
	try {
		const session = await createCheckoutSession({
			amountPaise: intent.amountPaise,
			customer: { email: currentUser.email, name: currentUser.name },
			metadata: {
				payment_intent_id: intent.id,
				purpose: "wallet_topup",
				user_id: currentUser.id,
			},
			paymentIntentId: intent.id,
			productId: process.env.DODO_PRODUCT_ID_WALLET,
		});
		await getDb()
			.update(paymentIntents)
			.set(session)
			.where(eq(paymentIntents.id, intent.id));
		return { ...toCheckoutResult(intent), checkoutUrl: session.checkoutUrl };
	} catch (error) {
		captureCheckoutFailure(error, intent.id, "wallet_topup");
		await markSessionCreationFailed(
			intent.id,
			error,
			isNonTestCheckoutUrlError(error)
		);
		throw errors.PAYMENT_FAILED({ message: checkoutFailureMessage(error) });
	}
}

function toCheckoutResult(intent: typeof paymentIntents.$inferSelect) {
	return {
		checkoutUrl: intent.checkoutUrl ?? "",
		expiresAt: intent.expiresAt.toISOString(),
		paymentIntentId: intent.id,
	};
}

function toBooking(row: typeof bookings.$inferSelect) {
	return {
		amountPaid: Number(row.amountPaid),
		from: row.from,
		journeyDate: row.journeyDate,
		passengers: row.passengers,
		pnr: row.pnr,
		status: row.status,
		to: row.to,
		tripId: row.tripId,
	};
}

export async function getPaymentStatus(
	paymentIntentId: string,
	errors: PaymentErrors
) {
	const [intent] = await getDb()
		.select()
		.from(paymentIntents)
		.where(eq(paymentIntents.id, paymentIntentId))
		.limit(1);
	if (!intent) {
		throw errors.NOT_FOUND();
	}
	const result = {
		failureReason: intent.failureMessage ?? undefined,
		purpose: intent.purpose,
		status: intent.status,
	};
	if (intent.purpose === "booking" && intent.pnr) {
		const [booking] = await getDb()
			.select()
			.from(bookings)
			.where(eq(bookings.pnr, intent.pnr))
			.limit(1);
		return { ...result, booking: booking ? toBooking(booking) : undefined };
	}
	if (intent.purpose === "wallet_topup" && intent.userId) {
		const [account] = await getDb()
			.select({ balance: walletAccounts.balance })
			.from(walletAccounts)
			.where(eq(walletAccounts.userId, intent.userId))
			.limit(1);
		return { ...result, balance: Number(account?.balance ?? 0) };
	}
	return result;
}

function isTerminalPaymentStatus(status: string): boolean {
	return TERMINAL_PAYMENT_STATUSES.some(
		(terminalStatus) => terminalStatus === status
	);
}

function isFinalisedPayment(status: string): boolean {
	return ["succeeded", "failed", "orphaned", "refunded"].includes(status);
}

function paymentFailureMessage(
	payment: VerifiedDodoWebhook["payment"]
): string {
	return payment.failureMessage ?? payment.failureCode ?? "Payment failed.";
}

function toStringMetadata(
	metadata: Record<string, unknown>
): Record<string, string> {
	const stringMetadata: Record<string, string> = {};
	for (const [key, value] of Object.entries(metadata)) {
		if (typeof value === "string") {
			stringMetadata[key] = value;
		}
	}
	return stringMetadata;
}

async function refundOrphanedIntent(
	intent: typeof paymentIntents.$inferSelect,
	reason: string
): Promise<void> {
	if (!intent.dodoPaymentId) {
		await getDb()
			.update(paymentIntents)
			.set({
				incidentReason: `${reason}; refund unavailable: payment ID missing`,
			})
			.where(eq(paymentIntents.id, intent.id));
		return;
	}

	captureException(new Error(`Paid ${intent.purpose} cannot be fulfilled.`), {
		tags: {
			dodo_payment_id: intent.dodoPaymentId,
			hold_id: intent.holdId ?? "",
			payment_intent_id: intent.id,
			purpose: intent.purpose,
			trip_id: intent.tripId ?? "",
			user_id: intent.userId ?? "",
		},
	});
	try {
		const refund = await dodo.refunds.create({
			metadata: { payment_intent_id: intent.id },
			payment_id: intent.dodoPaymentId,
			reason,
		});
		await getDb()
			.update(paymentIntents)
			.set({ refundId: refund.refund_id, status: "refunded" })
			.where(eq(paymentIntents.id, intent.id));
	} catch (error) {
		const refundError =
			error instanceof Error ? error.message : "Unknown error";
		captureException(error);
		await getDb()
			.update(paymentIntents)
			.set({ incidentReason: `${reason}; refund failed: ${refundError}` })
			.where(eq(paymentIntents.id, intent.id));
	}
}

async function refundCurrentOrphanedIntent(
	paymentIntentId: string
): Promise<void> {
	const [intent] = await getDb()
		.select()
		.from(paymentIntents)
		.where(eq(paymentIntents.id, paymentIntentId))
		.limit(1);
	if (intent?.status === "orphaned") {
		await refundOrphanedIntent(
			intent,
			intent.incidentReason ?? "unfulfillable"
		);
	}
}

async function fulfilBookingIntent(
	paymentIntentId: string,
	payment: VerifiedDodoWebhook["payment"]
): Promise<void> {
	const outcome = await getDb().transaction(async (tx) => {
		const [intent] = await tx
			.select()
			.from(paymentIntents)
			.where(eq(paymentIntents.id, paymentIntentId))
			.for("update")
			.limit(1);
		if (intent?.purpose !== "booking") {
			return null;
		}
		if (isFinalisedPayment(intent.status)) {
			return null;
		}
		if (!(intent.holdId && intent.passengers && intent.contactMobile)) {
			await tx
				.update(paymentIntents)
				.set({ incidentReason: "booking_snapshot_missing", status: "orphaned" })
				.where(eq(paymentIntents.id, intent.id));
			return intent;
		}
		if (intent.status === "expired") {
			await tx
				.update(paymentIntents)
				.set({ incidentReason: "hold_expired", status: "orphaned" })
				.where(eq(paymentIntents.id, intent.id));
			return intent;
		}

		const [hold] = await tx
			.select()
			.from(seatHolds)
			.where(eq(seatHolds.id, intent.holdId))
			.for("update")
			.limit(1);
		if (!hold || hold.consumedAt || hold.expiresAt <= new Date()) {
			await tx
				.update(paymentIntents)
				.set({ incidentReason: "hold_expired", status: "orphaned" })
				.where(eq(paymentIntents.id, intent.id));
			return intent;
		}
		const heldSeatNos = await getHeldSeatNos(tx, hold.id);
		if (
			!hasMatchingSeatNos(
				intent.passengers.map((passenger) => passenger.seatNo),
				heldSeatNos
			)
		) {
			await tx
				.update(paymentIntents)
				.set({ incidentReason: "seats_taken", status: "orphaned" })
				.where(eq(paymentIntents.id, intent.id));
			return intent;
		}

		const booking = await confirmHold(
			tx,
			hold,
			{
				contact: {
					email: intent.contactEmail ?? undefined,
					mobile: intent.contactMobile,
				},
				passengers: intent.passengers,
				paymentRef: payment.paymentId,
				singleLady: intent.singleLady ?? false,
			},
			{
				CONFLICT: () => new Error("Booking seats changed during fulfilment."),
				NOT_FOUND: () => new Error("Booking trip is no longer resolvable."),
				PAYMENT_FAILED: () => new Error("Booking confirmation failed."),
			}
		);
		await tx
			.update(paymentIntents)
			.set({
				incidentReason:
					payment.totalAmount === undefined ||
					payment.totalAmount === intent.amountPaise
						? null
						: `amount_mismatch: expected ${intent.amountPaise}, received ${payment.totalAmount}`,
				pnr: booking.pnr,
				status: "succeeded",
			})
			.where(eq(paymentIntents.id, intent.id));
		return null;
	});
	if (outcome) {
		await refundCurrentOrphanedIntent(outcome.id);
	}
}

async function fulfilWalletIntent(
	paymentIntentId: string,
	payment: VerifiedDodoWebhook["payment"]
): Promise<void> {
	const outcome = await getDb().transaction(async (tx) => {
		const [intent] = await tx
			.select()
			.from(paymentIntents)
			.where(eq(paymentIntents.id, paymentIntentId))
			.for("update")
			.limit(1);
		if (intent?.purpose !== "wallet_topup") {
			return null;
		}
		if (isFinalisedPayment(intent.status)) {
			return null;
		}
		if (!intent.userId) {
			await tx
				.update(paymentIntents)
				.set({ incidentReason: "user_missing", status: "orphaned" })
				.where(eq(paymentIntents.id, intent.id));
			return intent;
		}
		const [owner] = await tx
			.select({ id: user.id })
			.from(user)
			.where(eq(user.id, intent.userId))
			.limit(1);
		if (!owner) {
			await tx
				.update(paymentIntents)
				.set({ incidentReason: "user_missing", status: "orphaned" })
				.where(eq(paymentIntents.id, intent.id));
			return intent;
		}
		await tx
			.insert(walletAccounts)
			.values({ userId: intent.userId })
			.onConflictDoNothing({ target: walletAccounts.userId });
		await tx
			.select()
			.from(walletAccounts)
			.where(eq(walletAccounts.userId, intent.userId))
			.for("update")
			.limit(1);
		const [credit] = await tx
			.insert(walletTransactions)
			.values({
				amount: (intent.amountPaise / 100).toFixed(2),
				description: payment.paymentMethod
					? `Wallet top-up · ${payment.paymentMethod}`
					: "Wallet top-up",
				id: intent.id,
				type: "credit",
				userId: intent.userId,
			})
			.onConflictDoNothing()
			.returning({ id: walletTransactions.id });
		if (credit) {
			await tx
				.update(walletAccounts)
				.set({
					balance: sql`${walletAccounts.balance} + ${intent.amountPaise / 100}`,
				})
				.where(eq(walletAccounts.userId, intent.userId));
		}
		await tx
			.update(paymentIntents)
			.set({ status: "succeeded" })
			.where(eq(paymentIntents.id, intent.id));
		return null;
	});
	if (outcome) {
		await refundCurrentOrphanedIntent(outcome.id);
	}
}

async function persistUnknownIntent(
	webhook: VerifiedDodoWebhook
): Promise<void> {
	const [existing] = await getDb()
		.select({ id: paymentIntents.id })
		.from(paymentIntents)
		.where(eq(paymentIntents.dodoPaymentId, webhook.payment.paymentId))
		.limit(1);
	if (existing) {
		return;
	}
	await getDb()
		.insert(paymentIntents)
		.values({
			amountPaise: webhook.payment.totalAmount ?? 0,
			dodoPaymentId: webhook.payment.paymentId,
			expiresAt: new Date(),
			id: crypto.randomUUID(),
			incidentReason: "unknown_payment_intent",
			purpose: "booking",
			status: "orphaned",
		});
	captureException(
		new Error("Dodo webhook referenced an unknown payment intent.")
	);
}

export async function processVerifiedDodoWebhook(
	webhook: VerifiedDodoWebhook
): Promise<void> {
	const [createdEvent] = await getDb()
		.insert(paymentWebhookEvents)
		.values({
			eventType: webhook.eventType,
			payload: webhook.payload,
			paymentIntentId: webhook.payment.metadata.payment_intent_id,
			webhookId: webhook.webhookId,
		})
		.onConflictDoNothing()
		.returning({ webhookId: paymentWebhookEvents.webhookId });
	if (!createdEvent) {
		const [existingEvent] = await getDb()
			.select({ processedAt: paymentWebhookEvents.processedAt })
			.from(paymentWebhookEvents)
			.where(eq(paymentWebhookEvents.webhookId, webhook.webhookId))
			.limit(1);
		if (existingEvent?.processedAt) {
			return;
		}
	}

	try {
		const intent = await resolveWebhookIntent(webhook);
		if (intent) {
			await dispatchWebhookEvent(intent, webhook);
		}
		await markWebhookProcessed(webhook.webhookId);
	} catch (error) {
		await markWebhookProcessingError(webhook.webhookId, error);
		throw error;
	}
}

async function expirePaymentIntent(
	intent: typeof paymentIntents.$inferSelect
): Promise<void> {
	await getDb().transaction(async (tx) => {
		await tx
			.update(paymentIntents)
			.set({ status: "expired" })
			.where(eq(paymentIntents.id, intent.id));
		if (intent.purpose !== "booking" || !intent.holdId) {
			return;
		}
		await tx
			.delete(bookedSeats)
			.where(
				and(
					eq(bookedSeats.holdId, intent.holdId),
					eq(bookedSeats.state, "held")
				)
			);
	});
}

async function reconcilePaymentIntent(
	intent: typeof paymentIntents.$inferSelect
): Promise<void> {
	let paymentId = intent.dodoPaymentId;
	if (!paymentId && intent.dodoSessionId) {
		const session = await dodo.checkoutSessions.retrieve(intent.dodoSessionId);
		paymentId = session.payment_id ?? null;
	}
	if (!paymentId) {
		await expirePaymentIntent(intent);
		return;
	}
	const payment = await dodo.payments.retrieve(paymentId);
	if (payment.status === "succeeded" || payment.status === "failed") {
		await processVerifiedDodoWebhook({
			eventType: `payment.${payment.status}`,
			payload: { payment, reconciliation: true },
			payment: {
				metadata: toStringMetadata(payment.metadata),
				paymentId: payment.payment_id,
				paymentMethod: payment.payment_method ?? undefined,
				totalAmount: payment.total_amount,
			},
			webhookId: `reconcile:${intent.id}:${payment.payment_id}:${payment.status}`,
		});
		return;
	}
	await expirePaymentIntent(intent);
}

export async function reconcileExpiredPayments(): Promise<
	(typeof paymentIntents.$inferSelect)[]
> {
	const expiredIntents = await getDb()
		.select()
		.from(paymentIntents)
		.where(
			and(
				inArray(paymentIntents.status, ["created", "processing"]),
				lt(paymentIntents.expiresAt, new Date())
			)
		);
	await Promise.all(expiredIntents.map(reconcilePaymentIntent));
	return getDb()
		.select()
		.from(paymentIntents)
		.where(sql`${paymentIntents.incidentReason} IS NOT NULL`)
		.orderBy(paymentIntents.createdAt);
}

async function resolveWebhookIntent(webhook: VerifiedDodoWebhook) {
	if (!webhook.payment.paymentId) {
		return null;
	}
	const paymentIntentId = webhook.payment.metadata.payment_intent_id;
	if (!paymentIntentId) {
		await persistUnknownIntent(webhook);
		return null;
	}
	const [intent] = await getDb()
		.select()
		.from(paymentIntents)
		.where(eq(paymentIntents.id, paymentIntentId))
		.limit(1);
	if (!intent) {
		await persistUnknownIntent(webhook);
		return null;
	}
	await getDb()
		.update(paymentIntents)
		.set({
			dodoPaymentId: webhook.payment.paymentId,
			lastWebhookAt: new Date(),
			lastWebhookId: webhook.webhookId,
		})
		.where(eq(paymentIntents.id, intent.id));
	return intent;
}

async function markWebhookProcessed(webhookId: string): Promise<void> {
	await getDb()
		.update(paymentWebhookEvents)
		.set({ processedAt: new Date() })
		.where(eq(paymentWebhookEvents.webhookId, webhookId));
}

async function markWebhookProcessingError(
	webhookId: string,
	error: unknown
): Promise<void> {
	const message =
		error instanceof Error ? error.message : "Unknown processing error.";
	await getDb()
		.update(paymentWebhookEvents)
		.set({ processingError: message })
		.where(eq(paymentWebhookEvents.webhookId, webhookId));
}

async function dispatchWebhookEvent(
	intent: typeof paymentIntents.$inferSelect,
	webhook: VerifiedDodoWebhook
): Promise<void> {
	switch (webhook.eventType) {
		case "payment.processing":
			return markIntentProcessing(intent);
		case "payment.failed":
			return markIntentFailed(intent, webhook.payment);
		case "refund.succeeded":
			await getDb()
				.update(paymentIntents)
				.set({ status: "refunded" })
				.where(eq(paymentIntents.id, intent.id));
			return;
		case "payment.succeeded":
			return intent.purpose === "booking"
				? fulfilBookingIntent(intent.id, webhook.payment)
				: fulfilWalletIntent(intent.id, webhook.payment);
		default:
			return;
	}
}

async function markIntentProcessing(
	intent: typeof paymentIntents.$inferSelect
): Promise<void> {
	if (isTerminalPaymentStatus(intent.status)) {
		return;
	}
	await getDb()
		.update(paymentIntents)
		.set({ status: "processing" })
		.where(eq(paymentIntents.id, intent.id));
}

async function markIntentFailed(
	intent: typeof paymentIntents.$inferSelect,
	payment: VerifiedDodoWebhook["payment"]
): Promise<void> {
	if (isTerminalPaymentStatus(intent.status)) {
		return;
	}
	await getDb()
		.update(paymentIntents)
		.set({
			failureCode: payment.failureCode ?? null,
			failureMessage: paymentFailureMessage(payment),
			status: "failed",
		})
		.where(eq(paymentIntents.id, intent.id));
}
