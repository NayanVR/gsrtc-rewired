import { and, eq, lte } from "drizzle-orm";
import { findTripSeats } from "#/api/trips";
import type { getDb } from "#/db/client";
import { bookedSeats, seatHolds } from "#/db/schema";

const HOLD_TTL_MS = 10 * 60 * 1000;

export type DbTransaction = Parameters<
	Parameters<ReturnType<typeof getDb>["transaction"]>[0]
>[0];

export class SeatConflictError extends Error {}
export class TripInventoryNotFoundError extends Error {}

export function isUniqueViolation(error: unknown): boolean {
	if (typeof error !== "object" || error === null) {
		return false;
	}
	if ("code" in error && error.code === "23505") {
		return true;
	}
	return "cause" in error && isUniqueViolation(error.cause);
}

export async function createSeatHold(
	tx: DbTransaction,
	input: { seatNos: string[]; tripId: string }
): Promise<{ expiresAt: Date; holdId: string }> {
	if (input.seatNos.length === 0) {
		throw new SeatConflictError("A hold requires at least one seat.");
	}
	const tripSeats = await findTripSeats(input.tripId);
	if (!tripSeats) {
		throw new TripInventoryNotFoundError("The requested trip does not exist.");
	}
	const knownSeats = new Set(tripSeats.map((seat) => seat.no));
	const unavailableSeats = new Set(
		tripSeats.filter((seat) => seat.status === "booked").map((seat) => seat.no)
	);
	if (
		input.seatNos.some(
			(seatNo) => !knownSeats.has(seatNo) || unavailableSeats.has(seatNo)
		)
	) {
		throw new SeatConflictError("The requested seat is already occupied.");
	}

	const now = new Date();
	const expiresAt = new Date(now.getTime() + HOLD_TTL_MS);
	const holdId = crypto.randomUUID();
	await tx
		.delete(bookedSeats)
		.where(
			and(
				eq(bookedSeats.tripId, input.tripId),
				eq(bookedSeats.state, "held"),
				lte(bookedSeats.expiresAt, now)
			)
		);
	await tx.insert(seatHolds).values({
		expiresAt,
		id: holdId,
		seatNos: input.seatNos,
		tripId: input.tripId,
	});
	await tx.insert(bookedSeats).values(
		input.seatNos.map((seatNo) => ({
			expiresAt,
			holdId,
			id: crypto.randomUUID(),
			seatNo,
			state: "held" as const,
			tripId: input.tripId,
		}))
	);

	return { expiresAt, holdId };
}
