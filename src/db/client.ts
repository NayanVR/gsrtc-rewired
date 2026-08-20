import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
	bookedSeats,
	bookings,
	otpCodes,
	passes,
	refundComplaints,
	refunds,
	seatHolds,
	users,
	walletAccounts,
	walletTransactions,
} from "#/db/schema";

const schema = {
	bookedSeats,
	bookings,
	otpCodes,
	passes,
	refundComplaints,
	refunds,
	seatHolds,
	users,
	walletAccounts,
	walletTransactions,
};

// Server-only Postgres connection (Neon / Supabase / any wire-compatible
// Postgres). One connection pool per server process; never import this from
// client code.
function createDb() {
	const url = process.env.DATABASE_URL;
	if (!url) {
		throw new Error(
			"DATABASE_URL is not set. Point it at a Postgres instance (Neon, Supabase, or any Postgres) to enable bookings, wallet, tickets, passes and refunds."
		);
	}
	const client = postgres(url, { prepare: false });
	return drizzle(client, { schema });
}

let cached: ReturnType<typeof createDb> | null = null;

export function getDb() {
	cached ??= createDb();
	return cached;
}
