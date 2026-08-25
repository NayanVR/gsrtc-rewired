import { and, eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "#/api/server";
import { calculateBookingAmount } from "#/api/services/confirm-booking";
import {
	checkoutFailureMessage,
	processVerifiedDodoWebhook,
	type VerifiedDodoWebhook,
} from "#/api/services/payments";
import { getDb } from "#/db/client";
import {
	bookedSeats,
	bookings,
	paymentIntents,
	paymentWebhookEvents,
	seatHolds,
} from "#/db/schema";
import { assertTestCheckoutUrl, DODO_ENVIRONMENT, dodo } from "#/lib/dodo";

const TEST_TRIP_ID = "Ahmedabad~Surat~2026-08-24~0";
const TEST_MOBILE = "9876543210";

function passenger(seatNo: string) {
	return { age: 29, gender: "female" as const, name: "Asha Patel", seatNo };
}

function webhook(input: {
	paymentId: string;
	paymentIntentId: string;
	totalAmount: number;
	webhookId: string;
}): VerifiedDodoWebhook {
	return {
		eventType: "payment.succeeded",
		payload: { type: "payment.succeeded" },
		payment: {
			metadata: { payment_intent_id: input.paymentIntentId },
			paymentId: input.paymentId,
			paymentMethod: "upi",
			totalAmount: input.totalAmount,
		},
		webhookId: input.webhookId,
	};
}

async function clearPayments(): Promise<void> {
	const db = getDb();
	await db.delete(paymentWebhookEvents);
	await db
		.delete(paymentIntents)
		.where(eq(paymentIntents.tripId, TEST_TRIP_ID));
	await db.delete(bookings).where(eq(bookings.tripId, TEST_TRIP_ID));
	await db.delete(bookedSeats).where(eq(bookedSeats.tripId, TEST_TRIP_ID));
	await db.delete(seatHolds).where(eq(seatHolds.tripId, TEST_TRIP_ID));
}

async function createBookingIntent() {
	const hold = await api.booking.hold({
		seatNos: ["1"],
		tripId: TEST_TRIP_ID,
	});
	const amountPaise = Math.round(
		calculateBookingAmount(TEST_TRIP_ID, ["1"]) * 100
	);
	const paymentIntentId = crypto.randomUUID();
	await getDb()
		.insert(paymentIntents)
		.values({
			amountPaise,
			contactMobile: TEST_MOBILE,
			dodoSessionId: "cks_test",
			expiresAt: new Date(Date.now() + 60_000),
			holdId: hold.holdId,
			id: paymentIntentId,
			passengers: [passenger("1")],
			purpose: "booking",
			singleLady: false,
			status: "created",
			tripId: TEST_TRIP_ID,
		});
	return { amountPaise, hold, paymentIntentId };
}

describe("Dodo Payments", () => {
	beforeEach(clearPayments);
	afterEach(async () => {
		vi.restoreAllMocks();
		await clearPayments();
	});

	it("is structurally locked to Dodo test mode", () => {
		expect(DODO_ENVIRONMENT).toBe("test_mode");
		expect(() =>
			assertTestCheckoutUrl("https://live.dodopayments.com/checkout/test")
		).toThrow("outside test mode");
		expect(
			assertTestCheckoutUrl(
				"https://test.checkout.dodopayments.com/session/cks_test"
			)
		).toBe("https://test.checkout.dodopayments.com/session/cks_test");
	});

	it("maps Dodo setup failures to safe recovery messages", () => {
		expect(checkoutFailureMessage({ status: 401 })).toContain("credentials");
		expect(checkoutFailureMessage({ status: 404 })).toContain("product");
		expect(checkoutFailureMessage({ status: 422 })).toContain("price range");
	});

	it("deduplicates a verified booking success webhook", async () => {
		const { amountPaise, paymentIntentId } = await createBookingIntent();
		const event = webhook({
			paymentId: "pay_duplicate",
			paymentIntentId,
			totalAmount: amountPaise,
			webhookId: "wh_duplicate",
		});

		await processVerifiedDodoWebhook(event);
		await processVerifiedDodoWebhook(event);

		const [intent] = await getDb()
			.select()
			.from(paymentIntents)
			.where(eq(paymentIntents.id, paymentIntentId));
		const savedBookings = await getDb()
			.select()
			.from(bookings)
			.where(eq(bookings.tripId, TEST_TRIP_ID));
		const events = await getDb()
			.select()
			.from(paymentWebhookEvents)
			.where(eq(paymentWebhookEvents.webhookId, "wh_duplicate"));

		expect(intent?.status).toBe("succeeded");
		expect(intent?.pnr).toBeTruthy();
		expect(savedBookings).toHaveLength(1);
		expect(events).toHaveLength(1);
	});

	it("refunds paid booking when its held seats cannot be fulfilled", async () => {
		const { amountPaise, hold, paymentIntentId } = await createBookingIntent();
		await getDb()
			.delete(bookedSeats)
			.where(
				and(eq(bookedSeats.holdId, hold.holdId), eq(bookedSeats.state, "held"))
			);
		const refund = vi.spyOn(dodo.refunds, "create").mockResolvedValue({
			refund_id: "ref_orphaned",
		} as never);

		await processVerifiedDodoWebhook(
			webhook({
				paymentId: "pay_orphaned",
				paymentIntentId,
				totalAmount: amountPaise,
				webhookId: "wh_orphaned",
			})
		);

		const [intent] = await getDb()
			.select()
			.from(paymentIntents)
			.where(eq(paymentIntents.id, paymentIntentId));
		const savedBookings = await getDb()
			.select()
			.from(bookings)
			.where(eq(bookings.tripId, TEST_TRIP_ID));

		expect(savedBookings).toHaveLength(0);
		expect(intent?.incidentReason).toBe("seats_taken");
		expect(intent?.status).toBe("refunded");
		expect(refund).toHaveBeenCalledWith({
			metadata: { payment_intent_id: paymentIntentId },
			payment_id: "pay_orphaned",
			reason: "seats_taken",
		});
	});
});
