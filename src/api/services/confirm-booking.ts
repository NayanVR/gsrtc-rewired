import { and, eq } from "drizzle-orm";
import type { Passenger } from "#/api/schemas";
import type { DbTransaction } from "#/api/services/seat-holds";
import { buildSeats, buildTrip, parseTripId } from "#/api/trips";
import { bookedSeats, bookings, seatHolds } from "#/db/schema";
import { generatePnr } from "#/lib/ids";

const SERVICE_FEE_PER_SEAT = 15;

interface BookingConfirmationErrors {
	CONFLICT: () => unknown;
	NOT_FOUND: () => unknown;
	PAYMENT_FAILED: () => unknown;
}

interface ConfirmHoldInput {
	contact: { email?: string; mobile: string };
	passengers: Passenger[];
	paymentRef: string;
	singleLady?: boolean;
}

export function hasMatchingSeatNos(
	passengerSeatNos: string[],
	heldSeatNos: string[]
): boolean {
	if (passengerSeatNos.length !== heldSeatNos.length) {
		return false;
	}
	const sortedPassengerSeats = [...passengerSeatNos].sort();
	const sortedHeldSeats = [...heldSeatNos].sort();
	return sortedPassengerSeats.every(
		(seatNo, index) => seatNo === sortedHeldSeats[index]
	);
}

export function calculateBookingAmount(
	tripId: string,
	seatNos: string[]
): number {
	const fareBySeatNo = new Map(
		buildSeats(tripId).map((seat) => [seat.no, seat.fare])
	);
	const seatFare = seatNos.reduce(
		(total, seatNo) => total + (fareBySeatNo.get(seatNo) ?? 0),
		0
	);
	return seatFare + seatNos.length * SERVICE_FEE_PER_SEAT;
}

function toBooking(row: typeof bookings.$inferSelect) {
	return {
		amountPaid: Number(row.amountPaid),
		from: row.from,
		journeyDate: row.journeyDate,
		passengers: row.passengers,
		pnr: row.pnr,
		status: row.status,
		to: row.to,
		tripId: row.tripId,
	};
}

export async function getHeldSeatNos(
	tx: DbTransaction,
	holdId: string
): Promise<string[]> {
	const heldSeats = await tx
		.select({ seatNo: bookedSeats.seatNo })
		.from(bookedSeats)
		.where(and(eq(bookedSeats.holdId, holdId), eq(bookedSeats.state, "held")));
	return heldSeats.map((seat) => seat.seatNo);
}

export async function confirmHold(
	tx: DbTransaction,
	holdRow: typeof seatHolds.$inferSelect,
	input: ConfirmHoldInput,
	errors: BookingConfirmationErrors
) {
	if (!input.paymentRef) {
		throw errors.PAYMENT_FAILED();
	}
	const heldSeatNos = await getHeldSeatNos(tx, holdRow.id);
	const passengerSeatNos = input.passengers.map(
		(passenger) => passenger.seatNo
	);
	if (!hasMatchingSeatNos(passengerSeatNos, heldSeatNos)) {
		throw errors.CONFLICT();
	}

	const leg = parseTripId(holdRow.tripId);
	if (!leg) {
		throw errors.NOT_FOUND();
	}
	const route = buildTrip(leg);
	const amount = calculateBookingAmount(holdRow.tripId, heldSeatNos);
	const pnr = generatePnr();
	const [createdBooking] = await tx
		.insert(bookings)
		.values({
			amountPaid: amount.toFixed(2),
			contactEmail: input.contact.email,
			contactMobile: input.contact.mobile,
			from: route.from,
			journeyDate: leg.date,
			passengers: input.passengers,
			pnr,
			seatNos: heldSeatNos,
			singleLady: input.singleLady ?? false,
			to: route.to,
			tripId: holdRow.tripId,
		})
		.returning();
	if (!createdBooking) {
		throw errors.PAYMENT_FAILED();
	}
	const updatedSeats = await tx
		.update(bookedSeats)
		.set({ expiresAt: null, pnr, state: "booked" })
		.where(
			and(eq(bookedSeats.holdId, holdRow.id), eq(bookedSeats.state, "held"))
		)
		.returning({ seatNo: bookedSeats.seatNo });
	if (updatedSeats.length !== heldSeatNos.length) {
		throw errors.CONFLICT();
	}
	await tx
		.update(seatHolds)
		.set({ consumedAt: new Date() })
		.where(eq(seatHolds.id, holdRow.id));

	return toBooking(createdBooking);
}
