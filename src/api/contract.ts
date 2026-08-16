import { agents } from "#/api/contract/agents";
import { auth } from "#/api/contract/auth";
import { booking } from "#/api/contract/booking";
import { content } from "#/api/contract/content";
import { passes } from "#/api/contract/passes";
import { refunds } from "#/api/contract/refunds";
import { search } from "#/api/contract/search";
import { tickets } from "#/api/contract/tickets";
import { tracking } from "#/api/contract/tracking";
import { wallet } from "#/api/contract/wallet";

// The complete, type-safe GSRTC API surface. The server implements this and
// the browser client is derived from it — a single source of truth. It is also
// the source for the OpenAPI spec handed to GSRTC's existing integrators.
export const appContract = {
	agents,
	auth,
	booking,
	content,
	passes,
	refunds,
	search,
	tickets,
	tracking,
	wallet,
};

export type AppContract = typeof appContract;
