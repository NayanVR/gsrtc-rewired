import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { api } from "#/api/server";
import { getDb } from "#/db/client";
import {
	bookedSeats,
	bookings,
	refundComplaints,
	refunds,
	seatHolds,
} from "#/db/schema";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const TEST_MOBILE = `7${String(Date.now()).slice(-9)}`;
const TEST_DATE = new Date(Date.now() + 2 * MS_PER_DAY)
	.toISOString()
	.slice(0, 10);
const TEST_TRIP_ID = `RefundTestOrigin~RefundTestDestination~${TEST_DATE}~0`;

vi.setConfig({ testTimeout: 30_000 });

function passenger(seatNo: string) {
	return { age: 29, gender: "female" as const, name: "Asha Patel", seatNo };
}

async function createCancelledBooking() {
	const hold = await api.booking.hold({
		seatNos: ["1"],
		tripId: TEST_TRIP_ID,
	});
	const booking = await api.booking.create({
		contact: { mobile: TEST_MOBILE },
		holdId: hold.holdId,
		passengers: [passenger("1")],
		tripId: TEST_TRIP_ID,
	});
	await api.tickets.cancel({ mobile: TEST_MOBILE, ticketNo: booking.pnr });
	return booking;
}

function submitComplaint(ticketNo: string, message: string) {
	return api.refunds.complaint({
		email: "asha@example.com",
		message,
		mobile: TEST_MOBILE,
		ticketNo,
	});
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
	await Promise.all([
		db.delete(refundComplaints).where(eq(refundComplaints.mobile, TEST_MOBILE)),
		db.delete(refunds).where(eq(refunds.mobile, TEST_MOBILE)),
		db.delete(bookings).where(eq(bookings.contactMobile, TEST_MOBILE)),
		db.delete(bookedSeats).where(eq(bookedSeats.tripId, TEST_TRIP_ID)),
		db.delete(seatHolds).where(eq(seatHolds.tripId, TEST_TRIP_ID)),
	]);
}

describe("refunds", () => {
	beforeEach(clearTestData);
	afterEach(clearTestData);

	it("finds the refund created by ticket cancellation", async () => {
		const booking = await createCancelledBooking();
		const [createdRefund] = await getDb()
			.select()
			.from(refunds)
			.where(eq(refunds.ticketNo, booking.pnr));
		expect(createdRefund).toBeDefined();
		if (!createdRefund) {
			return;
		}

		await expect(
			api.refunds.status({ mobile: TEST_MOBILE, ref: createdRefund.ref })
		).resolves.toMatchObject({
			amount: Number(createdRefund.amount),
			expectedBy: createdRefund.expectedBy,
			ref: createdRefund.ref,
			status: "initiated",
		});
		await expect(
			api.refunds.status({ mobile: "1111111111", ref: createdRefund.ref })
		).rejects.toMatchObject({ code: "NOT_FOUND" });
	});

	it("checks ticket ownership before accepting a complaint", async () => {
		const booking = await createCancelledBooking();

		await expect(
			api.refunds.complaint({
				email: "asha@example.com",
				message: "The refund has not reached my account.",
				mobile: "1111111111",
				ticketNo: booking.pnr,
			})
		).rejects.toMatchObject({ code: "NOT_FOUND" });
	});

	it("rate-limits repeated complaints from one mobile", async () => {
		const booking = await createCancelledBooking();
		await submitComplaint(
			booking.pnr,
			"Refund complaint attempt one needs review."
		);
		await submitComplaint(
			booking.pnr,
			"Refund complaint attempt two needs review."
		);
		await submitComplaint(
			booking.pnr,
			"Refund complaint attempt three needs review."
		);

		await expect(
			api.refunds.complaint({
				email: "asha@example.com",
				message: "A fourth complaint should be rate limited.",
				mobile: TEST_MOBILE,
				ticketNo: booking.pnr,
			})
		).rejects.toMatchObject({ code: "RATE_LIMITED" });
	});

	it("rejects a short complaint message during contract validation", async () => {
		const booking = await createCancelledBooking();

		await expect(
			api.refunds.complaint({
				email: "asha@example.com",
				message: "Too short",
				mobile: TEST_MOBILE,
				ticketNo: booking.pnr,
			})
		).rejects.toBeDefined();
	});
});
