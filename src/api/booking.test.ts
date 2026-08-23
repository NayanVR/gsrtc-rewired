import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { api } from "#/api/server";
import { getDb } from "#/db/client";
import { bookedSeats, seatHolds } from "#/db/schema";

const TEST_TRIP_ID = "Ahmedabad~Surat~2026-08-22~0";

async function clearTestReservations(): Promise<void> {
	const db = getDb();
	await db.delete(bookedSeats).where(eq(bookedSeats.tripId, TEST_TRIP_ID));
	await db.delete(seatHolds).where(eq(seatHolds.tripId, TEST_TRIP_ID));
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

	it("does not hold seats occupied by the baseline inventory", async () => {
		await expect(
			api.booking.hold({ seatNos: ["3"], tripId: TEST_TRIP_ID })
		).rejects.toMatchObject({ code: "CONFLICT" });
	});
});
