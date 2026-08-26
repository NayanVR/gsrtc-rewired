import { createRouterClient, ORPCError, onError } from "@orpc/server";
import { router } from "#/api/router";
import { getEventTraceId, withEvent } from "#/lib/events";

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

const emitWideEvent = async (options: {
	next: () => Promise<unknown>;
	path: readonly string[];
}): Promise<unknown> =>
	withEvent(`orpc.${options.path.join(".")}`, async () => {
		try {
			return await options.next();
		} catch (error) {
			if (!(error instanceof ORPCError)) {
				throw error;
			}
			const data =
				typeof error.data === "object" && error.data !== null ? error.data : {};
			throw new ORPCError(error.code, {
				cause: error,
				data: { ...data, traceId: getEventTraceId() ?? crypto.randomUUID() },
				message: error.message,
				status: error.status,
			});
		}
	});

export const api = createRouterClient(router, {
	interceptors: [emitWideEvent, redactAgentRegistrationErrors],
});
