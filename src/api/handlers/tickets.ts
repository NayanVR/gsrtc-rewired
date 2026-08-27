import { implement } from "@orpc/server";
import { and, desc, eq } from "drizzle-orm";
import { appContract } from "#/api/contract";
import {
	createSeatHold,
	isUniqueViolation,
	SeatConflictError,
	TripInventoryNotFoundError,
} from "#/api/services/seat-holds";
import {
	findTrip,
	findTripSeats,
	parseTripId,
	tripIdForLeg,
} from "#/api/trips";
import { cancellationCharge } from "#/data/cancellation-policy";
import { getDb } from "#/db/client";
import { bookedSeats, bookings, refunds, seatHolds } from "#/db/schema";
import { generateRefundRef } from "#/lib/ids";
import { sendTicket } from "#/lib/mock-ticket-delivery";

const os = implement(appContract);
const REFUND_PROCESSING_DAYS = 7;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

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

function dateString(date: Date): string {
	return date.toISOString().slice(0, 10);
}

async function departureForTrip(tripId: string): Promise<Date | null> {
	const trip = await findTrip(tripId);
	return trip ? new Date(trip.departure) : null;
}

async function fareForSeats(
	tripId: string,
	seatNos: string[]
): Promise<number | null> {
	const tripSeats = await findTripSeats(tripId);
	if (!tripSeats) {
		return null;
	}
	const fareBySeatNo = new Map(tripSeats.map((seat) => [seat.no, seat.fare]));
	return seatNos.reduce(
		(total, seatNo) => total + (fareBySeatNo.get(seatNo) ?? 0),
		0
	);
}

async function rescheduledTripId(
	currentTripId: string,
	newDate: string,
	newTripId: string | undefined
): Promise<string | null> {
	if (newTripId) {
		const newLeg = parseTripId(newTripId);
		if (newLeg?.date !== newDate) {
			return null;
		}
		return (await findTrip(newTripId)) ? newTripId : null;
	}
	const currentLeg = parseTripId(currentTripId);
	if (!currentLeg) {
		return null;
	}
	const candidate = tripIdForLeg({ ...currentLeg, date: newDate });
	return (await findTrip(candidate)) ? candidate : null;
}

const cancel = os.tickets.cancel.handler(async ({ input, errors }) =>
	getDb().transaction(async (tx) => {
		const [booking] = await tx
			.select()
			.from(bookings)
			.where(
				and(
					eq(bookings.contactMobile, input.mobile),
					eq(bookings.pnr, input.ticketNo)
				)
			)
			.for("update")
			.limit(1);
		if (!booking) {
			throw errors.NOT_FOUND({ data: { reason: "booking_unknown" } });
		}
		if (booking.status === "cancelled") {
			throw errors.CONFLICT({ data: { reason: "hold_already_consumed" } });
		}
		const [departureAt, seatFare] = await Promise.all([
			departureForTrip(booking.tripId),
			fareForSeats(booking.tripId, booking.seatNos),
		]);
		if (!(departureAt && seatFare !== null)) {
			throw errors.NOT_FOUND({ data: { reason: "trip_unknown" } });
		}
		const charge = cancellationCharge(seatFare, departureAt, new Date());
		if (charge === null) {
			throw errors.CONFLICT({ data: { reason: "hold_already_consumed" } });
		}
		const refundAmount = seatFare - charge;
		const expectedBy = new Date(
			Date.now() + REFUND_PROCESSING_DAYS * MS_PER_DAY
		);

		await tx
			.update(bookings)
			.set({ status: "cancelled" })
			.where(eq(bookings.pnr, booking.pnr));
		await tx.delete(bookedSeats).where(eq(bookedSeats.pnr, booking.pnr));
		await tx.insert(refunds).values({
			amount: refundAmount.toFixed(2),
			expectedBy: dateString(expectedBy),
			mobile: input.mobile,
			ref: generateRefundRef(),
			status: "initiated",
			ticketNo: booking.pnr,
		});

		return { refundAmount, status: "cancelled" as const };
	})
);

const history = os.tickets.history.handler(async ({ input }) => {
	const rows = await getDb()
		.select()
		.from(bookings)
		.where(eq(bookings.contactMobile, input.mobile))
		.orderBy(desc(bookings.createdAt));
	return { bookings: rows.map(toBooking) };
});

const print = os.tickets.print.handler(async ({ input, errors }) => {
	const [booking] = await getDb()
		.select({ pnr: bookings.pnr })
		.from(bookings)
		.where(
			and(
				eq(bookings.contactMobile, input.mobile),
				eq(bookings.pnr, input.ticketNo)
			)
		)
		.limit(1);
	if (!booking) {
		throw errors.NOT_FOUND({ data: { reason: "booking_unknown" } });
	}
	return {
		sent: sendTicket({
			channel: input.channel,
			mobile: input.mobile,
			ticketNo: booking.pnr,
		}),
	};
});

const reschedule = os.tickets.reschedule.handler(async ({ input, errors }) => {
	try {
		return await getDb().transaction(async (tx) => {
			const [booking] = await tx
				.select()
				.from(bookings)
				.where(
					and(
						eq(bookings.contactMobile, input.mobile),
						eq(bookings.pnr, input.ticketNo)
					)
				)
				.for("update")
				.limit(1);
			if (!booking) {
				throw errors.NOT_FOUND({ data: { reason: "booking_unknown" } });
			}
			if (booking.status !== "confirmed") {
				throw errors.CONFLICT({ data: { reason: "hold_already_consumed" } });
			}
			const newTripId = await rescheduledTripId(
				booking.tripId,
				input.newDate,
				input.newTripId
			);
			const route = newTripId ? await findTrip(newTripId) : null;
			if (!(newTripId && route)) {
				throw errors.NOT_FOUND({ data: { reason: "trip_unknown" } });
			}
			const hold = await createSeatHold(tx, {
				seatNos: booking.seatNos,
				tripId: newTripId,
			});
			await tx
				.delete(bookedSeats)
				.where(
					and(
						eq(bookedSeats.pnr, booking.pnr),
						eq(bookedSeats.tripId, booking.tripId)
					)
				);
			const updatedSeats = await tx
				.update(bookedSeats)
				.set({ expiresAt: null, pnr: booking.pnr, state: "booked" })
				.where(eq(bookedSeats.holdId, hold.holdId))
				.returning({ seatNo: bookedSeats.seatNo });
			if (updatedSeats.length !== booking.seatNos.length) {
				throw errors.CONFLICT({ data: { reason: "seats_taken" } });
			}
			await tx
				.update(seatHolds)
				.set({ consumedAt: new Date() })
				.where(eq(seatHolds.id, hold.holdId));
			const [rescheduledBooking] = await tx
				.update(bookings)
				.set({
					from: route.from,
					journeyDate: input.newDate,
					to: route.to,
					tripId: newTripId,
				})
				.where(eq(bookings.pnr, booking.pnr))
				.returning();
			if (!rescheduledBooking) {
				throw errors.NOT_FOUND({ data: { reason: "booking_unknown" } });
			}
			return toBooking(rescheduledBooking);
		});
	} catch (error) {
		if (error instanceof TripInventoryNotFoundError) {
			throw errors.NOT_FOUND({ data: { reason: "trip_unknown" } });
		}
		if (error instanceof SeatConflictError || isUniqueViolation(error)) {
			throw errors.CONFLICT({ data: { reason: "seats_taken" } });
		}
		throw error;
	}
});

const waitingListStatus = os.tickets.waitingListStatus.handler(
	async ({ input, errors }) => {
		const [booking] = await getDb()
			.select({ seatNos: bookings.seatNos, status: bookings.status })
			.from(bookings)
			.where(eq(bookings.pnr, input.ticketNo))
			.limit(1);
		if (!booking) {
			throw errors.NOT_FOUND({ data: { reason: "booking_unknown" } });
		}
		if (booking.status === "cancelled") {
			return { status: "cancelled" as const };
		}
		if (booking.status === "waiting") {
			return { status: "waiting" as const };
		}
		return { confirmedSeat: booking.seatNos[0], status: "confirmed" as const };
	}
);

export const ticketHandlers = {
	cancel,
	history,
	print,
	reschedule,
	waitingListStatus,
};
