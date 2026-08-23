import { createRouterClient, ORPCError, onError } from "@orpc/server";
import { router } from "#/api/router";

// In-process typed client over the contract implementation. Server-only: it
// pulls in the router and its mock/adapter data, so import it exclusively from
// createServerFn handlers (never a component), keeping it out of the browser
// bundle.
// oRPC validation issues retain the rejected input by default. Registration
// includes a PAN, so replace that error before it reaches a server function.
const redactAgentRegistrationErrors = onError<
	Promise<unknown>,
	{ next: () => Promise<unknown>; path: readonly string[] },
	[]
>((error, options) => {
	if (options.path.join(".") === "agents.register") {
		throw new ORPCError("BAD_REQUEST", {
			message: "Invalid agent registration details.",
		});
	}
	throw error;
});

export const api = createRouterClient(router, {
	interceptors: [redactAgentRegistrationErrors],
});
