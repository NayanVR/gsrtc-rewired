import { implement } from "@orpc/server";
import { and, eq, gt, or } from "drizzle-orm";
import { appContract } from "#/api/contract";
import type { Passenger } from "#/api/schemas";
import {
	createSeatHold,
	isUniqueViolation,
	SeatConflictError,
} from "#/api/services/seat-holds";
import { buildSeats, buildTrip, parseTripId } from "#/api/trips";
import { getDb } from "#/db/client";
import { bookedSeats, bookings, seatHolds } from "#/db/schema";
import { generatePnr } from "#/lib/ids";
import { mockCharge, type PaymentMethod } from "#/lib/mock-payment";

const os = implement(appContract);
const SERVICE_FEE_PER_SEAT = 15;

type DbTransaction = Parameters<
	Parameters<ReturnType<typeof getDb>["transaction"]>[0]
>[0];

interface CreateBookingInput {
	contact: { email?: string; mobile: string };
	holdId: string;
	passengers: Passenger[];
	paymentMethod?: PaymentMethod;
	singleLady?: boolean;
	tripId: string;
}

interface CreateBookingErrors {
	CONFLICT: () => unknown;
	NOT_FOUND: () => unknown;
	PAYMENT_FAILED: () => unknown;
}

function hasMatchingSeatNos(
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

function calculateBookingAmount(tripId: string, seatNos: string[]): number {
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

const trip = os.booking.trip.handler(({ input, errors }) => {
	const leg = parseTripId(input.tripId);
	if (!leg) {
		throw errors.NOT_FOUND();
	}
	return buildTrip(leg);
});

const seatMap = os.booking.seatMap.handler(async ({ input }) => {
	const now = new Date();
	const activeSeats = await getDb()
		.select({ seatNo: bookedSeats.seatNo, state: bookedSeats.state })
		.from(bookedSeats)
		.where(
			and(
				eq(bookedSeats.tripId, input.tripId),
				or(
					eq(bookedSeats.state, "booked"),
					and(eq(bookedSeats.state, "held"), gt(bookedSeats.expiresAt, now))
				)
			)
		);
	const stateBySeatNo = new Map(
		activeSeats.map(({ seatNo, state }) => [seatNo, state])
	);

	return {
		seats: buildSeats(input.tripId).map((seat) => {
			const state = stateBySeatNo.get(seat.no);
			return state ? { ...seat, status: state } : seat;
		}),
		tripId: input.tripId,
	};
});

const hold = os.booking.hold.handler(async ({ input, errors }) => {
	try {
		const createdHold = await getDb().transaction((tx) =>
			createSeatHold(tx, input)
		);
		return {
			expiresAt: createdHold.expiresAt.toISOString(),
			holdId: createdHold.holdId,
		};
	} catch (error) {
		if (error instanceof SeatConflictError || isUniqueViolation(error)) {
			throw errors.CONFLICT();
		}
		throw error;
	}
});

const holdStatus = os.booking.holdStatus.handler(async ({ input, errors }) => {
	const [holdRow] = await getDb()
		.select()
		.from(seatHolds)
		.where(
			and(eq(seatHolds.id, input.holdId), eq(seatHolds.tripId, input.tripId))
		)
		.limit(1);
	if (!holdRow || holdRow.consumedAt || holdRow.expiresAt <= new Date()) {
		throw errors.NOT_FOUND();
	}
	return {
		expiresAt: holdRow.expiresAt.toISOString(),
		holdId: holdRow.id,
		seatNos: holdRow.seatNos,
	};
});

async function findBookingForConsumedHold(tx: DbTransaction, holdId: string) {
	const [bookedSeat] = await tx
		.select({ pnr: bookedSeats.pnr })
		.from(bookedSeats)
		.where(and(eq(bookedSeats.holdId, holdId), eq(bookedSeats.state, "booked")))
		.limit(1);
	if (!bookedSeat?.pnr) {
		return null;
	}
	const [existingBooking] = await tx
		.select()
		.from(bookings)
		.where(eq(bookings.pnr, bookedSeat.pnr))
		.limit(1);
	return existingBooking ? toBooking(existingBooking) : null;
}

async function confirmLiveHold(
	tx: DbTransaction,
	holdRow: typeof seatHolds.$inferSelect,
	input: CreateBookingInput,
	errors: CreateBookingErrors
) {
	const heldSeats = await tx
		.select({ seatNo: bookedSeats.seatNo })
		.from(bookedSeats)
		.where(
			and(eq(bookedSeats.holdId, holdRow.id), eq(bookedSeats.state, "held"))
		);
	const heldSeatNos = heldSeats.map((seat) => seat.seatNo);
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
	const charge = mockCharge({
		amount,
		idempotencyKey: holdRow.id,
		method: input.paymentMethod ?? "upi",
	});
	if (charge.status !== "success") {
		throw errors.PAYMENT_FAILED();
	}

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

const create = os.booking.create.handler(({ input, errors }) =>
	getDb().transaction(async (tx) => {
		const [holdRow] = await tx
			.select()
			.from(seatHolds)
			.where(eq(seatHolds.id, input.holdId))
			.for("update")
			.limit(1);
		if (!holdRow || holdRow.expiresAt <= new Date()) {
			throw errors.NOT_FOUND();
		}
		if (holdRow.tripId !== input.tripId) {
			throw errors.CONFLICT();
		}
		if (holdRow.consumedAt) {
			const existingBooking = await findBookingForConsumedHold(tx, holdRow.id);
			if (!existingBooking) {
				throw errors.NOT_FOUND();
			}
			return existingBooking;
		}
		return confirmLiveHold(tx, holdRow, input, errors);
	})
);

const get = os.booking.get.handler(async ({ input, errors }) => {
	const [booking] = await getDb()
		.select()
		.from(bookings)
		.where(
			and(eq(bookings.contactMobile, input.mobile), eq(bookings.pnr, input.pnr))
		)
		.limit(1);
	if (!booking) {
		throw errors.NOT_FOUND();
	}
	return toBooking(booking);
});

export const bookingHandlers = {
	create,
	get,
	hold,
	holdStatus,
	seatMap,
	trip,
};
