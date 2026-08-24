import * as v from "valibot";
import { base } from "#/api/contract/base";
import {
	Booking,
	Mobile,
	Passenger,
	SeatMap,
	Timestamp,
	Trip,
} from "#/api/schemas";

export const booking = {
	create: base
		.route({ method: "POST", path: "/bookings", summary: "Confirm booking" })
		.input(
			v.object({
				contact: v.object({
					email: v.optional(v.pipe(v.string(), v.email())),
					mobile: Mobile,
				}),
				holdId: v.string(),
				passengers: v.array(Passenger),
				paymentMethod: v.optional(v.picklist(["upi", "card", "netbanking"])),
				singleLady: v.optional(v.boolean()),
				tripId: v.string(),
			})
		)
		.output(Booking),

	get: base
		.route({ method: "GET", path: "/bookings/{pnr}", summary: "Fetch booking" })
		.input(v.object({ mobile: Mobile, pnr: v.string() }))
		.output(Booking),

	hold: base
		.route({ method: "POST", path: "/bookings/hold", summary: "Hold seats" })
		.input(v.object({ seatNos: v.array(v.string()), tripId: v.string() }))
		.output(v.object({ expiresAt: Timestamp, holdId: v.string() })),

	seatMap: base
		.route({
			method: "GET",
			path: "/trips/{tripId}/seats",
			summary: "Seat map",
		})
		.input(v.object({ tripId: v.string() }))
		.output(SeatMap),
	trip: base
		.route({ method: "GET", path: "/trips/{tripId}", summary: "Trip detail" })
		.input(v.object({ tripId: v.string() }))
		.output(Trip),
};
