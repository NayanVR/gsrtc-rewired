import { oc } from "@orpc/contract";

// Base contract builder carrying the typed errors every procedure may raise.
// Domain procedures extend this so clients get exhaustive error typing.
export const base = oc.errors({
	CONFLICT: { message: "The resource changed; please retry." },
	NOT_FOUND: { message: "Not found." },
	PAYMENT_FAILED: { message: "Payment could not be completed." },
	RATE_LIMITED: { message: "Too many attempts. Try again shortly." },
	UNAUTHORIZED: { message: "Sign in to continue." },
});
