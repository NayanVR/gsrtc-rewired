import { eq, inArray } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { api } from "#/api/server";
import { getDb } from "#/db/client";
import { bookedSeats, seatHolds } from "#/db/schema";

const TEST_TRIP_ID = "Ahmedabad~Surat~2026-08-22~0";
const RELEASE_TEST_TRIP_ID = "Ahmedabad~Vadodara~2026-08-22~0";

async function clearTestReservations(): Promise<void> {
	const db = getDb();
	const testTripIds = [TEST_TRIP_ID, RELEASE_TEST_TRIP_ID];
	await db.delete(bookedSeats).where(inArray(bookedSeats.tripId, testTripIds));
	await db.delete(seatHolds).where(inArray(seatHolds.tripId, testTripIds));
}

describe("booking seat inventory", () => {
	beforeEach(clearTestReservations);
	afterEach(clearTestReservations);

	it("renders a held seat and rejects a concurrent duplicate hold", async () => {
		const [firstAttempt, secondAttempt] = await Promise.allSettled([
			api.booking.hold({ seatNos: ["1"], tripId: TEST_TRIP_ID }),
			api.booking.hold({ seatNos: ["1"], tripId: TEST_TRIP_ID }),
		]);
		const successfulHold = [firstAttempt, secondAttempt].find(
			(attempt) => attempt.status === "fulfilled"
		);
		const rejectedHold = [firstAttempt, secondAttempt].find(
			(attempt) => attempt.status === "rejected"
		);

		expect(successfulHold?.status).toBe("fulfilled");
		expect(rejectedHold?.status).toBe("rejected");
		if (successfulHold?.status === "fulfilled") {
			expect(successfulHold.value.holdId).toBeTypeOf("string");
			expect(successfulHold.value.expiresAt).toBeTypeOf("string");
		}
		if (rejectedHold?.status === "rejected") {
			expect(rejectedHold.reason).toMatchObject({ code: "CONFLICT" });
		}

		const seatMap = await api.booking.seatMap({ tripId: TEST_TRIP_ID });
		expect(seatMap.seats.find((seat) => seat.no === "1")?.status).toBe("held");
	});

	it("ignores expired holds without a cleanup job", async () => {
		await getDb()
			.insert(bookedSeats)
			.values({
				expiresAt: new Date(Date.now() - 60_000),
				holdId: crypto.randomUUID(),
				id: crypto.randomUUID(),
				seatNo: "2",
				state: "held",
				tripId: TEST_TRIP_ID,
			});

		const seatMap = await api.booking.seatMap({ tripId: TEST_TRIP_ID });
		expect(seatMap.seats.find((seat) => seat.no === "2")?.status).toBe(
			"available"
		);
	});

	it("releases a cancelled hold immediately", async () => {
		const hold = await api.booking.hold({
			seatNos: ["1"],
			tripId: RELEASE_TEST_TRIP_ID,
		});

		await expect(
			api.booking.releaseHold({
				holdId: hold.holdId,
				tripId: RELEASE_TEST_TRIP_ID,
			})
		).resolves.toEqual({ released: true });
		await expect
			.poll(
				async () => {
					const remainingHeldSeats = await getDb()
						.select({ id: bookedSeats.id })
						.from(bookedSeats)
						.where(eq(bookedSeats.tripId, RELEASE_TEST_TRIP_ID));
					return remainingHeldSeats.length;
				},
				{ interval: 250, timeout: 10_000 }
			)
			.toBe(0);

		const seatMap = await api.booking.seatMap({
			tripId: RELEASE_TEST_TRIP_ID,
		});
		expect(seatMap.seats.find((seat) => seat.no === "1")?.status).toBe(
			"available"
		);
		await expect(
			api.booking.holdStatus({
				holdId: hold.holdId,
				tripId: RELEASE_TEST_TRIP_ID,
			})
		).rejects.toMatchObject({ code: "NOT_FOUND" });
	});

	it("does not hold seats occupied by the baseline inventory", async () => {
		await expect(
			api.booking.hold({ seatNos: ["3"], tripId: TEST_TRIP_ID })
		).rejects.toMatchObject({ code: "CONFLICT" });
	});
});
