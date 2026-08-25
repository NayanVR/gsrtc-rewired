import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
	account,
	agentETopTransactions,
	agents,
	bookedSeats,
	bookings,
	pageForms,
	passes,
	paymentIntents,
	paymentWebhookEvents,
	refundComplaints,
	refunds,
	seatHolds,
	session,
	user,
	verification,
	walletAccounts,
	walletTransactions,
} from "#/db/schema";

const schema = {
	account,
	agentETopTransactions,
	agents,
	bookedSeats,
	bookings,
	pageForms,
	passes,
	paymentIntents,
	paymentWebhookEvents,
	refundComplaints,
	refunds,
	seatHolds,
	session,
	user,
	verification,
	walletAccounts,
	walletTransactions,
};

// Server-only direct Postgres connection. One connection pool per server
// process; never import this from client code.
function createDb() {
	const url = process.env.DATABASE_URL;
	if (!url) {
		throw new Error(
			"DATABASE_URL is not set. Point it at a Postgres instance (Neon, Supabase, or any Postgres) to enable bookings, agents, wallet, tickets, passes and refunds."
		);
	}
	// Prepared statements are safe for a direct Postgres connection. They were
	// disabled only for Supabase's transaction pooler.
	const client = postgres(url, { prepare: true });
	return drizzle(client, { schema });
}

let cached: ReturnType<typeof createDb> | null = null;

export function getDb() {
	cached ??= createDb();
	return cached;
}
