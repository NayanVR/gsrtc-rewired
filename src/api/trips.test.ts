import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { api } from "#/api/server";
import { getDb } from "#/db/client";
import { buses, busSeats, tripSchedules } from "#/db/schema";

const BUS_ID = "bus-volvo-ac-sleeper";
const DATE = "2026-08-27";
const SCHEDULE_ID = "Vadodara~Surat~0";
const TRIP_ID = `Vadodara~Surat~${DATE}~0`;

describe("database-backed transport inventory", () => {
	it("serves timetable and bus changes directly from the database", async () => {
		const db = getDb();
		const [originalSchedule] = await db
			.select({ fareFrom: tripSchedules.fareFrom })
			.from(tripSchedules)
			.where(eq(tripSchedules.id, SCHEDULE_ID))
			.limit(1);
		const [originalBus] = await db
			.select({ amenities: buses.amenities })
			.from(buses)
			.where(eq(buses.id, BUS_ID))
			.limit(1);
		expect(originalSchedule).toBeDefined();
		expect(originalBus).toBeDefined();

		try {
			await db
				.update(tripSchedules)
				.set({ fareFrom: "321.50" })
				.where(eq(tripSchedules.id, SCHEDULE_ID));
			await db
				.update(buses)
				.set({ amenities: ["wifi"] })
				.where(eq(buses.id, BUS_ID));

			const searchResult = await api.search.trips({
				date: DATE,
				from: "Vadodara",
				passengers: 1,
				to: "Surat",
			});
			const trip = searchResult.trips.find((item) => item.id === TRIP_ID);
			expect(trip).toMatchObject({
				amenities: ["wifi"],
				fareFrom: 321.5,
			});
			await expect(
				api.booking.trip({ tripId: TRIP_ID })
			).resolves.toMatchObject({
				amenities: ["wifi"],
				fareFrom: 321.5,
			});
		} finally {
			if (originalSchedule) {
				await db
					.update(tripSchedules)
					.set({ fareFrom: originalSchedule.fareFrom })
					.where(eq(tripSchedules.id, SCHEDULE_ID));
			}
			if (originalBus) {
				await db
					.update(buses)
					.set({ amenities: originalBus.amenities })
					.where(eq(buses.id, BUS_ID));
			}
		}
	});

	it("uses the persisted bus seat layout for availability", async () => {
		const db = getDb();
		const seatCondition = and(
			eq(busSeats.busId, BUS_ID),
			eq(busSeats.seatNo, "1")
		);
		const [originalSeat] = await db
			.select({ status: busSeats.defaultStatus })
			.from(busSeats)
			.where(seatCondition)
			.limit(1);
		expect(originalSeat).toBeDefined();

		try {
			await db
				.update(busSeats)
				.set({ defaultStatus: "booked" })
				.where(seatCondition);

			const seatMap = await api.booking.seatMap({ tripId: TRIP_ID });
			expect(seatMap.seats.find((seat) => seat.no === "1")?.status).toBe(
				"booked"
			);
			await expect(
				api.booking.hold({ seatNos: ["1"], tripId: TRIP_ID })
			).rejects.toMatchObject({ code: "CONFLICT" });
		} finally {
			if (originalSeat) {
				await db
					.update(busSeats)
					.set({ defaultStatus: originalSeat.status })
					.where(seatCondition);
			}
		}
	});
});
