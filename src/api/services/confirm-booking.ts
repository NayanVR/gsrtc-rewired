import { and, eq } from "drizzle-orm";
import type { ErrorReason } from "#/api/contract/base";
import type { Passenger } from "#/api/schemas";
import type { DbTransaction } from "#/api/services/seat-holds";
import { findTrip, findTripSeats } from "#/api/trips";
import { bookedSeats, bookings, seatHolds } from "#/db/schema";
import { generatePnr } from "#/lib/ids";

const SERVICE_FEE_PER_SEAT = 15;

interface BookingConfirmationErrors {
	CONFLICT: (options?: {
		data?: { reason?: ErrorReason; traceId?: string };
	}) => unknown;
	NOT_FOUND: (options?: {
		data?: { reason?: ErrorReason; traceId?: string };
	}) => unknown;
	PAYMENT_FAILED: (options?: {
		data?: { reason?: ErrorReason; traceId?: string };
	}) => unknown;
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

export async function calculateBookingAmount(
	tripId: string,
	seatNos: string[]
): Promise<number> {
	const tripSeats = await findTripSeats(tripId);
	if (!tripSeats) {
		throw new Error(`Cannot calculate fare for unknown trip ${tripId}.`);
	}
	const fareBySeatNo = new Map(tripSeats.map((seat) => [seat.no, seat.fare]));
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
		throw errors.PAYMENT_FAILED({ data: { reason: "booking_write_failed" } });
	}
	const heldSeatNos = await getHeldSeatNos(tx, holdRow.id);
	const passengerSeatNos = input.passengers.map(
		(passenger) => passenger.seatNo
	);
	if (!hasMatchingSeatNos(passengerSeatNos, heldSeatNos)) {
		throw errors.CONFLICT({ data: { reason: "seat_passenger_mismatch" } });
	}

	const route = await findTrip(holdRow.tripId);
	if (!route) {
		throw errors.NOT_FOUND({ data: { reason: "trip_unknown" } });
	}
	const amount = await calculateBookingAmount(holdRow.tripId, heldSeatNos);
	const pnr = generatePnr();
	const [createdBooking] = await tx
		.insert(bookings)
		.values({
			amountPaid: amount.toFixed(2),
			contactEmail: input.contact.email,
			contactMobile: input.contact.mobile,
			from: route.from,
			journeyDate: route.departure.slice(0, 10),
			passengers: input.passengers,
			pnr,
			seatNos: heldSeatNos,
			singleLady: input.singleLady ?? false,
			to: route.to,
			tripId: holdRow.tripId,
		})
		.returning();
	if (!createdBooking) {
		throw errors.PAYMENT_FAILED({ data: { reason: "booking_write_failed" } });
	}
	const updatedSeats = await tx
		.update(bookedSeats)
		.set({ expiresAt: null, pnr, state: "booked" })
		.where(
			and(eq(bookedSeats.holdId, holdRow.id), eq(bookedSeats.state, "held"))
		)
		.returning({ seatNo: bookedSeats.seatNo });
	if (updatedSeats.length !== heldSeatNos.length) {
		throw errors.CONFLICT({ data: { reason: "seats_taken" } });
	}
	await tx
		.update(seatHolds)
		.set({ consumedAt: new Date() })
		.where(eq(seatHolds.id, holdRow.id));

	return toBooking(createdBooking);
}
