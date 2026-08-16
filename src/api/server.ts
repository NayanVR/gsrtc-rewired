import { createRouterClient } from "@orpc/server";
import { router } from "#/api/router";

// In-process typed client over the contract implementation. Server-only: it
// pulls in the router and its mock/adapter data, so import it exclusively from
// createServerFn handlers (never a component), keeping it out of the browser
// bundle.
export const api = createRouterClient(router);
