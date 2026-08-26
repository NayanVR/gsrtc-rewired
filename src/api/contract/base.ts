import { oc } from "@orpc/contract";
import * as v from "valibot";

export const ERROR_REASONS = [
	"hold_expired",
	"hold_unknown",
	"booking_unknown",
	"mobile_mismatch",
	"trip_unknown",
	"pnr_unknown",
	"pass_unknown",
	"agent_unknown",
	"vehicle_unknown",
	"payment_intent_unknown",
	"seats_taken",
	"seat_passenger_mismatch",
	"hold_already_consumed",
	"trip_mismatch",
	"wallet_account_missing",
	"checkout_session_failed",
	"provider_unavailable",
	"charge_declined",
	"booking_write_failed",
	"mock_provider_disabled",
	"too_many_hold_attempts",
	"too_many_topup_attempts",
	"otp_throttled",
	"session_missing",
	"session_expired",
] as const;

export type ErrorReason = (typeof ERROR_REASONS)[number];

const errorData = v.optional(
	v.object({
		reason: v.optional(v.picklist(ERROR_REASONS)),
		traceId: v.optional(v.string()),
	})
);

// Base contract builder carrying the typed errors every procedure may raise.
// Domain procedures extend this so clients get exhaustive error typing.
export const base = oc.errors({
	CONFLICT: { data: errorData, message: "The resource changed; please retry." },
	NOT_FOUND: { data: errorData, message: "Not found." },
	PAYMENT_FAILED: {
		data: errorData,
		message: "Payment could not be completed.",
	},
	RATE_LIMITED: {
		data: errorData,
		message: "Too many attempts. Try again shortly.",
	},
	UNAUTHORIZED: { data: errorData, message: "Sign in to continue." },
});
