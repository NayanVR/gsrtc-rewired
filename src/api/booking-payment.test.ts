import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { api } from "#/api/server";
import { getDb } from "#/db/client";
import { bookedSeats, bookings, seatHolds } from "#/db/schema";
import * as payment from "#/lib/mock-payment";

const TEST_TRIP_ID = "Ahmedabad~Surat~2026-08-23~0";
const TEST_MOBILE = "9876543210";

vi.setConfig({ testTimeout: 20_000 });

function passenger(seatNo: string) {
	return { age: 29, gender: "female" as const, name: "Asha Patel", seatNo };
}

async function clearTestBookings(): Promise<void> {
	const db = getDb();
	await db.delete(bookings).where(eq(bookings.tripId, TEST_TRIP_ID));
	await db.delete(bookedSeats).where(eq(bookedSeats.tripId, TEST_TRIP_ID));
	await db.delete(seatHolds).where(eq(seatHolds.tripId, TEST_TRIP_ID));
}

describe("booking confirmation", () => {
	beforeEach(clearTestBookings);
	afterEach(async () => {
		vi.restoreAllMocks();
		await clearTestBookings();
	});

	it("confirms once for a hold and returns the same booking on retry", async () => {
		const charge = vi.spyOn(payment, "mockCharge");
		const hold = await api.booking.hold({
			seatNos: ["1"],
			tripId: TEST_TRIP_ID,
		});
		const input = {
			contact: { mobile: TEST_MOBILE },
			holdId: hold.holdId,
			passengers: [passenger("1")],
			paymentMethod: "card" as const,
			tripId: TEST_TRIP_ID,
		};

		const firstBooking = await api.booking.create(input);
		const retryBooking = await api.booking.create(input);

		expect(retryBooking.pnr).toBe(firstBooking.pnr);
		expect(charge).toHaveBeenCalledTimes(1);
		expect(charge).toHaveBeenCalledWith(
			expect.objectContaining({
				idempotencyKey: hold.holdId,
				method: "card",
			})
		);

		const savedSeats = await getDb()
			.select({ pnr: bookedSeats.pnr, state: bookedSeats.state })
			.from(bookedSeats)
			.where(eq(bookedSeats.holdId, hold.holdId));
		expect(savedSeats).toEqual([{ pnr: firstBooking.pnr, state: "booked" }]);
	});

	it("rejects expired holds", async () => {
		const holdId = crypto.randomUUID();
		await getDb()
			.insert(seatHolds)
			.values({
				expiresAt: new Date(Date.now() - 60_000),
				id: holdId,
				seatNos: ["1"],
				tripId: TEST_TRIP_ID,
			});

		await expect(
			api.booking.create({
				contact: { mobile: TEST_MOBILE },
				holdId,
				passengers: [passenger("1")],
				tripId: TEST_TRIP_ID,
			})
		).rejects.toMatchObject({ code: "NOT_FOUND" });
	});

	it("rejects passenger seats that do not match the hold", async () => {
		const hold = await api.booking.hold({
			seatNos: ["1"],
			tripId: TEST_TRIP_ID,
		});

		await expect(
			api.booking.create({
				contact: { mobile: TEST_MOBILE },
				holdId: hold.holdId,
				passengers: [passenger("2")],
				tripId: TEST_TRIP_ID,
			})
		).rejects.toMatchObject({ code: "CONFLICT" });
	});

	it("scopes booking retrieval to the contact mobile", async () => {
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

		await expect(
			api.booking.get({ mobile: "1111111111", pnr: booking.pnr })
		).rejects.toMatchObject({ code: "NOT_FOUND" });
	});

	it("rolls back when the payment charge fails", async () => {
		vi.spyOn(payment, "mockCharge").mockReturnValue({
			amount: 0,
			method: "upi",
			status: "failed",
		});
		const hold = await api.booking.hold({
			seatNos: ["1"],
			tripId: TEST_TRIP_ID,
		});

		await expect(
			api.booking.create({
				contact: { mobile: TEST_MOBILE },
				holdId: hold.holdId,
				passengers: [passenger("1")],
				tripId: TEST_TRIP_ID,
			})
		).rejects.toMatchObject({ code: "PAYMENT_FAILED" });

		const savedBookings = await getDb()
			.select({ pnr: bookings.pnr })
			.from(bookings)
			.where(eq(bookings.tripId, TEST_TRIP_ID));
		const seatStates = await getDb()
			.select({ state: bookedSeats.state })
			.from(bookedSeats)
			.where(eq(bookedSeats.holdId, hold.holdId));
		expect(savedBookings).toEqual([]);
		expect(seatStates).toEqual([{ state: "held" }]);
	});
});
