import { ERROR_REASONS, type ErrorReason } from "#/api/contract/base";

export interface AppError {
	action: string;
	code: string;
	detail: string;
	reason?: ErrorReason;
	recoverable: boolean;
	title: string;
	traceId?: string;
}

type ErrorCopy = Omit<AppError, "code" | "reason" | "traceId">;

const COPY: Record<
	| ErrorReason
	| "CONFLICT"
	| "NOT_FOUND"
	| "PAYMENT_FAILED"
	| "RATE_LIMITED"
	| "UNAUTHORIZED"
	| "INTERNAL"
	| "NETWORK",
	ErrorCopy
> = {
	agent_unknown: {
		action: "Check the agent code and try again.",
		detail: "We could not find that agent record.",
		recoverable: true,
		title: "Agent not found",
	},
	booking_unknown: {
		action: "Check the booking reference and try again.",
		detail: "We could not find that booking.",
		recoverable: true,
		title: "Booking not found",
	},
	booking_write_failed: {
		action: "Try again shortly. Quote the reference if you contact us.",
		detail: "Your booking could not be saved. Nothing was charged.",
		recoverable: false,
		title: "We could not confirm your booking",
	},
	CONFLICT: {
		action: "Refresh the page and try again.",
		detail: "This changed while we were processing your request.",
		recoverable: true,
		title: "Something changed",
	},
	charge_declined: {
		action: "Try a different card or UPI ID.",
		detail: "Your bank declined the payment. No money left your account.",
		recoverable: true,
		title: "Your payment was declined",
	},
	checkout_session_failed: {
		action: "Try again shortly while your seat hold is active.",
		detail: "We could not start the secure payment page. Nothing was charged.",
		recoverable: true,
		title: "Payment could not be started",
	},
	hold_already_consumed: {
		action: "Check your booking confirmation or choose seats again.",
		detail: "This seat hold has already been used.",
		recoverable: false,
		title: "This seat hold was already used",
	},
	hold_expired: {
		action: "Pick your seats again. They may still be free.",
		detail:
			"Seats are held for 10 minutes so they do not stay locked for others.",
		recoverable: true,
		title: "Your seat hold ran out",
	},
	hold_unknown: {
		action: "Pick your seats again to create a new hold.",
		detail: "We could not find this seat hold.",
		recoverable: true,
		title: "Seat hold not found",
	},
	INTERNAL: {
		action: "Try again shortly. Quote reference {traceId} if you contact us.",
		detail: "This is not your fault and nothing was charged.",
		recoverable: false,
		title: "Something broke on our side",
	},
	mobile_mismatch: {
		action: "Check the mobile number used for this booking.",
		detail: "The booking does not match that mobile number.",
		recoverable: true,
		title: "Booking details do not match",
	},
	mock_provider_disabled: {
		action: "Choose the available payment option and try again.",
		detail: "This payment option is not available right now.",
		recoverable: true,
		title: "Payment option unavailable",
	},
	NETWORK: {
		action: "Check your connection, then try again.",
		detail: "We could not reach GSRTC right now.",
		recoverable: true,
		title: "Connection problem",
	},
	NOT_FOUND: {
		action: "Check the details and try again.",
		detail: "We could not find the requested record.",
		recoverable: true,
		title: "Not found",
	},
	otp_throttled: {
		action: "Wait a minute before requesting another OTP.",
		detail: "Too many OTPs were requested for this number.",
		recoverable: true,
		title: "Too many OTP requests",
	},
	PAYMENT_FAILED: {
		action: "Try again while your seat hold is active.",
		detail: "Your payment could not be completed. Nothing was charged.",
		recoverable: true,
		title: "Payment failed",
	},
	pass_unknown: {
		action: "Check the pass application number and try again.",
		detail: "We could not find that bus pass.",
		recoverable: true,
		title: "Pass not found",
	},
	payment_intent_unknown: {
		action: "Check the payment reference and try again.",
		detail: "We could not find that payment.",
		recoverable: true,
		title: "Payment not found",
	},
	pnr_unknown: {
		action: "Check the PNR and mobile number, then try again.",
		detail: "We could not find that ticket.",
		recoverable: true,
		title: "Ticket not found",
	},
	provider_unavailable: {
		action: "Try again shortly or use another payment method.",
		detail:
			"Our payment provider is temporarily unavailable. Nothing was charged.",
		recoverable: true,
		title: "Payments are temporarily unavailable",
	},
	RATE_LIMITED: {
		action: "Wait a moment, then try again.",
		detail: "Too many attempts were made in a short time.",
		recoverable: true,
		title: "Please wait before trying again",
	},
	seat_passenger_mismatch: {
		action: "Refresh your seats and enter passenger details again.",
		detail: "The passenger details no longer match the seats being held.",
		recoverable: true,
		title: "Your selected seats changed",
	},
	seats_taken: {
		action: "Choose from the refreshed seat map.",
		detail: "Another passenger confirmed that seat first.",
		recoverable: true,
		title: "That seat was just booked",
	},
	session_expired: {
		action: "Sign in again. Your booking details are saved.",
		detail: "Sessions end after a period of inactivity.",
		recoverable: true,
		title: "You have been signed out",
	},
	session_missing: {
		action: "Sign in to continue.",
		detail: "This action needs an active account session.",
		recoverable: true,
		title: "Sign in required",
	},
	too_many_hold_attempts: {
		action: "Wait a minute, then try once more.",
		detail: "You have tried to lock seats several times in a row.",
		recoverable: true,
		title: "Too many attempts",
	},
	too_many_topup_attempts: {
		action: "Wait a while before trying another top-up.",
		detail: "You have started several payment attempts recently.",
		recoverable: true,
		title: "Too many top-up attempts",
	},
	trip_mismatch: {
		action: "Return to search and choose the trip again.",
		detail: "This hold belongs to a different trip.",
		recoverable: true,
		title: "Trip details changed",
	},
	trip_unknown: {
		action: "Return to search and choose another trip.",
		detail: "That trip is no longer available.",
		recoverable: true,
		title: "Trip not found",
	},
	UNAUTHORIZED: {
		action: "Sign in to continue.",
		detail: "Your account session is required for this action.",
		recoverable: true,
		title: "Sign in required",
	},
	vehicle_unknown: {
		action: "Check the PNR and try again.",
		detail: "We could not find a journey for that PNR.",
		recoverable: true,
		title: "Journey not found",
	},
	wallet_account_missing: {
		action: "Try again shortly. Quote the reference if you contact us.",
		detail: "Your wallet account could not be opened.",
		recoverable: false,
		title: "Wallet unavailable",
	},
};

function readError(error: unknown): {
	code?: string;
	reason?: string;
	traceId?: string;
} {
	if (typeof error !== "object" || error === null) {
		return {};
	}
	const value = error as Record<string, unknown>;
	const data =
		typeof value.data === "object" && value.data !== null
			? (value.data as Record<string, unknown>)
			: {};
	return {
		code: typeof value.code === "string" ? value.code : undefined,
		reason: typeof data.reason === "string" ? data.reason : undefined,
		traceId: typeof data.traceId === "string" ? data.traceId : undefined,
	};
}

function isReason(value: string | undefined): value is ErrorReason {
	return (
		typeof value === "string" && ERROR_REASONS.includes(value as ErrorReason)
	);
}

export function toAppError(error: unknown, context?: string): AppError {
	const { code: rawCode, reason: rawReason, traceId } = readError(error);
	const code = rawCode ?? (context === "network" ? "NETWORK" : "INTERNAL");
	const reason = isReason(rawReason) ? rawReason : undefined;
	const copy = reason
		? COPY[reason]
		: (COPY[code as keyof typeof COPY] ?? COPY.INTERNAL);
	return {
		...copy,
		code,
		...(reason ? { reason } : {}),
		...(traceId ? { traceId } : {}),
	};
}

export const ERROR_COPY = COPY;

export const ERROR_REASON_FIELDS = {
	booking_unknown: "reference",
	mobile_mismatch: "mobile",
	otp_throttled: "otp",
	pnr_unknown: "reference",
	vehicle_unknown: "vehicle",
} as const satisfies Partial<Record<ErrorReason, string>>;

export function errorFieldForReason(
	reason: ErrorReason | undefined
): string | undefined {
	return reason ? ERROR_REASON_FIELDS[reason] : undefined;
}

export function appErrorFieldMessage(
	error: AppError,
	translate: (
		message: string,
		values?: Record<string, string | number>
	) => string
): string {
	return `${translate(error.detail)} ${translate(error.action, {
		traceId: error.traceId ?? "Not available",
	})}`;
}
