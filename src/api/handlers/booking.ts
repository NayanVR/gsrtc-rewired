import { implement } from "@orpc/server";
import { and, eq, gt, or } from "drizzle-orm";
import { appContract } from "#/api/contract";
import {
	calculateBookingAmount,
	confirmHold,
	getHeldSeatNos,
	hasMatchingSeatNos,
} from "#/api/services/confirm-booking";
import { getPaymentStatus, startBookingPayment } from "#/api/services/payments";
import {
	createSeatHold,
	isUniqueViolation,
	SeatConflictError,
} from "#/api/services/seat-holds";
import { buildSeats, buildTrip, parseTripId } from "#/api/trips";
import { getDb } from "#/db/client";
import { bookedSeats, bookings, seatHolds } from "#/db/schema";
import { getPaymentsProvider } from "#/lib/dodo";
import { addEventFields } from "#/lib/events";
import { mockCharge } from "#/lib/mock-payment";

const os = implement(appContract);
type DbTransaction = Parameters<
	Parameters<ReturnType<typeof getDb>["transaction"]>[0]
>[0];

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
	addEventFields({ trip_id: input.tripId });
	const leg = parseTripId(input.tripId);
	if (!leg) {
		throw errors.NOT_FOUND({ data: { reason: "trip_unknown" } });
	}
	return buildTrip(leg);
});

const seatMap = os.booking.seatMap.handler(async ({ input }) => {
	addEventFields({ trip_id: input.tripId });
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
	addEventFields({ seat_count: input.seatNos.length, trip_id: input.tripId });
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
			throw errors.CONFLICT({ data: { reason: "seats_taken" } });
		}
		throw error;
	}
});

const holdStatus = os.booking.holdStatus.handler(async ({ input, errors }) => {
	addEventFields({ hold_id: input.holdId, trip_id: input.tripId });
	const [holdRow] = await getDb()
		.select()
		.from(seatHolds)
		.where(
			and(eq(seatHolds.id, input.holdId), eq(seatHolds.tripId, input.tripId))
		)
		.limit(1);
	if (!holdRow || holdRow.consumedAt || holdRow.expiresAt <= new Date()) {
		throw errors.NOT_FOUND({ data: { reason: "hold_expired" } });
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

const create = os.booking.create.handler(({ input, errors }) => {
	addEventFields({
		hold_id: input.holdId,
		seat_count: input.passengers.length,
		trip_id: input.tripId,
	});
	if (getPaymentsProvider() === "dodo") {
		throw errors.PAYMENT_FAILED({ data: { reason: "mock_provider_disabled" } });
	}
	return getDb().transaction(async (tx) => {
		const [holdRow] = await tx
			.select()
			.from(seatHolds)
			.where(eq(seatHolds.id, input.holdId))
			.for("update")
			.limit(1);
		if (!holdRow || holdRow.expiresAt <= new Date()) {
			throw errors.NOT_FOUND({ data: { reason: "hold_expired" } });
		}
		if (holdRow.tripId !== input.tripId) {
			throw errors.CONFLICT({ data: { reason: "trip_mismatch" } });
		}
		if (holdRow.consumedAt) {
			const existingBooking = await findBookingForConsumedHold(tx, holdRow.id);
			if (!existingBooking) {
				throw errors.NOT_FOUND({ data: { reason: "booking_unknown" } });
			}
			return existingBooking;
		}
		const heldSeatNos = await getHeldSeatNos(tx, holdRow.id);
		if (
			!hasMatchingSeatNos(
				input.passengers.map((passenger) => passenger.seatNo),
				heldSeatNos
			)
		) {
			throw errors.CONFLICT({ data: { reason: "seat_passenger_mismatch" } });
		}
		const charge = mockCharge({
			amount: calculateBookingAmount(holdRow.tripId, heldSeatNos),
			idempotencyKey: holdRow.id,
			method: input.paymentMethod ?? "upi",
		});
		if (charge.status !== "success") {
			throw errors.PAYMENT_FAILED({ data: { reason: "charge_declined" } });
		}
		return confirmHold(
			tx,
			holdRow,
			{
				contact: input.contact,
				passengers: input.passengers,
				paymentRef: charge.transactionId,
				singleLady: input.singleLady,
			},
			errors
		);
	});
});

const startPayment = os.booking.startPayment.handler(({ input, errors }) => {
	addEventFields({
		hold_id: input.holdId,
		payment_provider: getPaymentsProvider(),
		seat_count: input.passengers.length,
		trip_id: input.tripId,
	});
	if (getPaymentsProvider() !== "dodo") {
		throw errors.PAYMENT_FAILED({ data: { reason: "mock_provider_disabled" } });
	}
	return startBookingPayment(input, errors);
});

const paymentStatus = os.booking.paymentStatus.handler(({ input, errors }) => {
	addEventFields({ payment_intent_id: input.paymentIntentId });
	return getPaymentStatus(input.paymentIntentId, errors);
});

const get = os.booking.get.handler(async ({ input, errors }) => {
	addEventFields({ pnr: input.pnr });
	const [booking] = await getDb()
		.select()
		.from(bookings)
		.where(
			and(eq(bookings.contactMobile, input.mobile), eq(bookings.pnr, input.pnr))
		)
		.limit(1);
	if (!booking) {
		throw errors.NOT_FOUND({ data: { reason: "booking_unknown" } });
	}
	return toBooking(booking);
});

export const bookingHandlers = {
	create,
	get,
	hold,
	holdStatus,
	paymentStatus,
	seatMap,
	startPayment,
	trip,
};
