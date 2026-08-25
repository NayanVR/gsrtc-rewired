import { DodoPayments } from "dodopayments";

// Test mode is deliberately a source-level constant. A deployment variable
// must never be able to turn a checkout into a live-money payment.
export const DODO_ENVIRONMENT = "test_mode" as const;
const TEST_CHECKOUT_HOST = "test.checkout.dodopayments.com";

export type PaymentsProvider = "dodo" | "mock";

export const dodo = new DodoPayments({
	// The SDK validates a token while it is constructed. A placeholder keeps the
	// default mock provider usable without Dodo credentials; it can only ever
	// authenticate against the hardcoded test environment.
	bearerToken: process.env.DODO_PAYMENTS_API_KEY ?? "dodo_test_unconfigured",
	environment: DODO_ENVIRONMENT,
	webhookKey: process.env.DODO_PAYMENTS_WEBHOOK_KEY,
});

export function getPaymentsProvider(): PaymentsProvider {
	return process.env.PAYMENTS_PROVIDER === "dodo" ? "dodo" : "mock";
}

export function assertTestCheckoutUrl(checkoutUrl: string): string {
	let url: URL;
	try {
		url = new URL(checkoutUrl);
	} catch (error) {
		throw new Error("Dodo returned an invalid checkout URL.", { cause: error });
	}
	if (url.protocol !== "https:" || url.hostname !== TEST_CHECKOUT_HOST) {
		throw new Error("Dodo returned a checkout URL outside test mode.");
	}
	return checkoutUrl;
}
