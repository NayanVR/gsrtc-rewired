import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { api } from "#/api/server";
import { getDb } from "#/db/client";
import {
	bookedSeats,
	bookings,
	refundComplaints,
	refunds,
	seatHolds,
} from "#/db/schema";
import { generatePnr } from "#/lib/ids";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const TEST_DATE = new Date(Date.now() + 2 * MS_PER_DAY)
	.toISOString()
	.slice(0, 10);
const TEST_RUN_ID = String(Date.now()).slice(-7);

let testCase = 0;

interface TestFixture {
	mobile: string;
	tripId: string;
}

function createTestFixture(): TestFixture {
	testCase += 1;
	return {
		mobile: `7${String(Date.now() + testCase).slice(-9)}`,
		tripId: `RefundTest${TEST_RUN_ID}${testCase}~Destination~${TEST_DATE}~0`,
	};
}

let fixture = createTestFixture();

function passenger(seatNo: string) {
	return { age: 29, gender: "female" as const, name: "Asha Patel", seatNo };
}

async function createCancelledBooking(testFixture: TestFixture) {
	const pnr = generatePnr();
	await getDb()
		.insert(bookings)
		.values({
			amountPaid: "500.00",
			contactMobile: testFixture.mobile,
			from: testFixture.tripId.split("~")[0] ?? "Refund origin",
			journeyDate: TEST_DATE,
			passengers: [passenger("1")],
			pnr,
			seatNos: ["1"],
			to: "Destination",
			tripId: testFixture.tripId,
		});
	await api.tickets.cancel({
		mobile: testFixture.mobile,
		ticketNo: pnr,
	});
	return { pnr };
}

function submitComplaint(
	testFixture: TestFixture,
	ticketNo: string,
	message: string
) {
	return api.refunds.complaint({
		email: "asha@example.com",
		message,
		mobile: testFixture.mobile,
		ticketNo,
	});
}

async function clearTestData(testFixture: TestFixture): Promise<void> {
	const db = getDb();
	const ticketRows = await db
		.select({ pnr: bookings.pnr })
		.from(bookings)
		.where(eq(bookings.contactMobile, testFixture.mobile));
	await Promise.all(
		ticketRows.map(({ pnr }) =>
			db.delete(bookedSeats).where(eq(bookedSeats.pnr, pnr))
		)
	);
	await Promise.all([
		db
			.delete(refundComplaints)
			.where(eq(refundComplaints.mobile, testFixture.mobile)),
		db.delete(refunds).where(eq(refunds.mobile, testFixture.mobile)),
		db.delete(bookings).where(eq(bookings.contactMobile, testFixture.mobile)),
		db.delete(bookedSeats).where(eq(bookedSeats.tripId, testFixture.tripId)),
		db.delete(seatHolds).where(eq(seatHolds.tripId, testFixture.tripId)),
	]);
}

describe("refunds", () => {
	beforeEach(() => {
		fixture = createTestFixture();
	});
	afterEach(() => clearTestData(fixture));

	it("finds the refund created by ticket cancellation", async () => {
		const testFixture = fixture;
		const booking = await createCancelledBooking(testFixture);
		const [createdRefund] = await getDb()
			.select()
			.from(refunds)
			.where(eq(refunds.ticketNo, booking.pnr));
		expect(createdRefund).toBeDefined();
		if (!createdRefund) {
			return;
		}

		await expect(
			api.refunds.status({
				mobile: testFixture.mobile,
				ref: createdRefund.ref,
			})
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
		const booking = await createCancelledBooking(fixture);

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
		const testFixture = fixture;
		const booking = await createCancelledBooking(testFixture);
		await submitComplaint(
			testFixture,
			booking.pnr,
			"Refund complaint attempt one needs review."
		);
		await submitComplaint(
			testFixture,
			booking.pnr,
			"Refund complaint attempt two needs review."
		);
		await submitComplaint(
			testFixture,
			booking.pnr,
			"Refund complaint attempt three needs review."
		);

		await expect(
			api.refunds.complaint({
				email: "asha@example.com",
				message: "A fourth complaint should be rate limited.",
				mobile: testFixture.mobile,
				ticketNo: booking.pnr,
			})
		).rejects.toMatchObject({ code: "RATE_LIMITED" });
	});

	it("rejects a short complaint message during contract validation", async () => {
		const testFixture = fixture;
		const booking = await createCancelledBooking(testFixture);

		await expect(
			api.refunds.complaint({
				email: "asha@example.com",
				message: "Too short",
				mobile: testFixture.mobile,
				ticketNo: booking.pnr,
			})
		).rejects.toBeDefined();
	});
});
