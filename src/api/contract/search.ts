import * as v from "valibot";
import { base } from "#/api/contract/base";
import { BusType, City, DateStr, Passengers, Trip } from "#/api/schemas";

export const search = {
	cities: base
		.route({
			method: "GET",
			path: "/search/cities",
			summary: "City autocomplete",
		})
		.input(v.object({ q: v.optional(v.string()) }))
		.output(v.array(City)),
	trips: base
		.route({ method: "GET", path: "/search/trips", summary: "Search trips" })
		.input(
			v.object({
				busType: v.optional(BusType),
				date: DateStr,
				from: City,
				passengers: Passengers,
				to: City,
			})
		)
		.output(v.object({ trips: v.array(Trip) })),
};
