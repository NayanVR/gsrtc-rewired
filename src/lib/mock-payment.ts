// Payment is explicitly out of scope for this concept build (per the
// migration plan, real payment orchestration talks to GSRTC's existing
// gateway and stays untouched). This simulator stands in for that call: it
// always succeeds and returns an opaque transaction id, so every flow that
// needs a "payment happened" fact (booking, wallet top-up) can be built and
// exercised end-to-end without a real gateway integration.
export type PaymentMethod = "upi" | "card" | "netbanking";

export type PaymentResult =
	| {
			amount: number;
			method: PaymentMethod;
			status: "failed";
	  }
	| {
			amount: number;
			method: PaymentMethod;
			status: "success";
			transactionId: string;
	  };

export function mockCharge(input: {
	amount: number;
	idempotencyKey: string;
	method: PaymentMethod;
}): PaymentResult {
	return {
		amount: input.amount,
		method: input.method,
		status: "success" as const,
		transactionId: `TXN${input.idempotencyKey.replaceAll("-", "").slice(0, 8).toUpperCase()}${Date.now().toString(36).toUpperCase()}${Math.random()
			.toString(36)
			.slice(2, 8)
			.toUpperCase()}`,
	};
}
