import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import type { bookings } from "#/db/schema";

type BookingInsert = InferInsertModel<typeof bookings>;
type BookingRow = InferSelectModel<typeof bookings>;

describe("bookings schema", () => {
	it("preserves contract passenger genders through a row round trip", () => {
		const booking: BookingInsert = {
			amountPaid: "360.00",
			contactMobile: "9876543210",
			from: "Ahmedabad",
			journeyDate: "2026-08-22",
			passengers: [
				{ age: 29, gender: "female", name: "Asha Patel", seatNo: "L12" },
			],
			pnr: "PNR-123456",
			seatNos: ["L12"],
			singleLady: false,
			status: "confirmed",
			to: "Surat",
			tripId: "Ahmedabad~Surat~2026-08-22~0",
		};
		const row: BookingRow = {
			...booking,
			contactEmail: null,
			createdAt: new Date("2026-08-01T00:00:00.000Z"),
			singleLady: booking.singleLady ?? false,
			status: booking.status ?? "confirmed",
		};

		expect(row.passengers).toEqual(booking.passengers);
		expect(row.passengers[0]?.gender).toBe("female");

		const invalidPassengers: BookingInsert["passengers"] = [
			{
				age: 29,
				// @ts-expect-error Passenger gender must match the API contract.
				gender: "M",
				name: "Asha Patel",
				seatNo: "L12",
			},
		];

		expect(invalidPassengers).toHaveLength(1);
	});
});
