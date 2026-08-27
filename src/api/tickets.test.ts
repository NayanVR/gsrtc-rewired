import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { api } from "#/api/server";
import { cancellationCharge } from "#/data/cancellation-policy";
import { getDb } from "#/db/client";
import { bookedSeats, bookings, refunds, seatHolds } from "#/db/schema";
import { generatePnr } from "#/lib/ids";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const TEST_MOBILE = `8${String(Date.now()).slice(-9)}`;
const TEST_DATE = new Date(Date.now() + 2 * MS_PER_DAY)
	.toISOString()
	.slice(0, 10);
const TEST_TRIP_ID = `TicketTestOrigin~TicketTestDestination~${TEST_DATE}~0`;
const testTripIds = new Set([TEST_TRIP_ID]);

function passenger(seatNo: string) {
	return { age: 29, gender: "female" as const, name: "Asha Patel", seatNo };
}

async function createTestBooking() {
	const pnr = generatePnr();
	await getDb()
		.insert(bookings)
		.values({
			amountPaid: "500.00",
			contactMobile: TEST_MOBILE,
			from: "TicketTestOrigin",
			journeyDate: TEST_DATE,
			passengers: [passenger("1")],
			pnr,
			seatNos: ["1"],
			to: "TicketTestDestination",
			tripId: TEST_TRIP_ID,
		});
	await getDb().insert(bookedSeats).values({
		id: crypto.randomUUID(),
		pnr,
		seatNo: "1",
		state: "booked",
		tripId: TEST_TRIP_ID,
	});
	return { pnr };
}

async function clearTestData(): Promise<void> {
	const db = getDb();
	const ticketRows = await db
		.select({ pnr: bookings.pnr })
		.from(bookings)
		.where(eq(bookings.contactMobile, TEST_MOBILE));
	await Promise.all(
		ticketRows.map(({ pnr }) =>
			db.delete(bookedSeats).where(eq(bookedSeats.pnr, pnr))
		)
	);
	await db.delete(refunds).where(eq(refunds.mobile, TEST_MOBILE));
	await db.delete(bookings).where(eq(bookings.contactMobile, TEST_MOBILE));
	await Promise.all(
		[...testTripIds].flatMap((tripId) => [
			db.delete(bookedSeats).where(eq(bookedSeats.tripId, tripId)),
			db.delete(seatHolds).where(eq(seatHolds.tripId, tripId)),
		])
	);
}

describe("cancellationCharge", () => {
	const fare = 100;
	const departureAt = new Date("2040-01-10T06:15:00+05:30");
	const beforeDeparture = (days: number) =>
		new Date(departureAt.getTime() - days * MS_PER_DAY);

	it("applies every policy band at its boundaries", () => {
		expect(cancellationCharge(fare, departureAt, beforeDeparture(1))).toBe(25);
		expect(cancellationCharge(fare, departureAt, beforeDeparture(2))).toBe(20);
		expect(cancellationCharge(fare, departureAt, beforeDeparture(5))).toBe(20);
		expect(cancellationCharge(fare, departureAt, beforeDeparture(6))).toBe(15);
		expect(cancellationCharge(fare, departureAt, beforeDeparture(60))).toBe(15);
		expect(cancellationCharge(fare, departureAt, beforeDeparture(61))).toBe(0);
	});

	it("handles current and departed bookings", () => {
		expect(cancellationCharge(fare, departureAt, departureAt)).toBe(100);
		expect(
			cancellationCharge(fare, departureAt, new Date(departureAt.getTime() + 1))
		).toBeNull();
	});
});

describe("tickets", () => {
	beforeEach(clearTestData);
	afterEach(clearTestData);

	it("cancels once, releases seats, and creates a refund", async () => {
		const booking = await createTestBooking();
		const cancellation = await api.tickets.cancel({
			mobile: TEST_MOBILE,
			ticketNo: booking.pnr,
		});

		expect(cancellation.status).toBe("cancelled");
		expect(cancellation.refundAmount).toBeGreaterThan(0);
		const seatMap = await api.booking.seatMap({ tripId: TEST_TRIP_ID });
		expect(seatMap.seats.find((seat) => seat.no === "1")?.status).toBe(
			"available"
		);
		const refundRows = await getDb()
			.select({ amount: refunds.amount, ticketNo: refunds.ticketNo })
			.from(refunds)
			.where(eq(refunds.ticketNo, booking.pnr));
		expect(refundRows).toEqual([
			{ amount: cancellation.refundAmount.toFixed(2), ticketNo: booking.pnr },
		]);

		await expect(
			api.tickets.cancel({ mobile: TEST_MOBILE, ticketNo: booking.pnr })
		).rejects.toMatchObject({ code: "CONFLICT" });
		const duplicateRefunds = await getDb()
			.select({ ref: refunds.ref })
			.from(refunds)
			.where(eq(refunds.ticketNo, booking.pnr));
		expect(duplicateRefunds).toHaveLength(1);
	});

	it("returns an empty booking history for an unknown mobile", async () => {
		await expect(
			api.tickets.history({ mobile: `8${String(Date.now()).slice(-9)}` })
		).resolves.toEqual({ bookings: [] });
	});

	it("reschedules, prints, and reports confirmed ticket status", async () => {
		const booking = await createTestBooking();
		const newDate = new Date(Date.now() + 3 * MS_PER_DAY)
			.toISOString()
			.slice(0, 10);
		const newTripId = `TicketTestOrigin~TicketTestDestination~${newDate}~0`;
		testTripIds.add(newTripId);

		const rescheduled = await api.tickets.reschedule({
			mobile: TEST_MOBILE,
			newDate,
			newTripId,
			ticketNo: booking.pnr,
		});
		expect(rescheduled).toMatchObject({
			journeyDate: newDate,
			pnr: booking.pnr,
			tripId: newTripId,
		});
		expect(
			(await api.booking.seatMap({ tripId: newTripId })).seats.find(
				(seat) => seat.no === "1"
			)?.status
		).toBe("booked");
		expect(
			await api.tickets.waitingListStatus({ ticketNo: booking.pnr })
		).toEqual({ confirmedSeat: "1", status: "confirmed" });
		expect(
			await api.tickets.print({
				channel: "email",
				mobile: TEST_MOBILE,
				ticketNo: booking.pnr,
			})
		).toEqual({ sent: true });
	});
});
