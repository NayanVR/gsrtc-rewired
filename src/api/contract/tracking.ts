import * as v from "valibot";
import { base } from "#/api/contract/base";
import { JourneyProgress, VehiclePosition } from "#/api/schemas";

export const tracking = {
	progress: base
		.route({
			method: "GET",
			path: "/tracking/progress",
			summary: "Journey progress",
		})
		.input(v.object({ vehicleNo: v.string() }))
		.output(JourneyProgress),
	route: base
		.route({
			method: "GET",
			path: "/tracking/route",
			summary: "Vehicles on route",
		})
		.input(v.object({ routeCode: v.string() }))
		.output(v.object({ vehicles: v.array(VehiclePosition) })),
	vehicle: base
		.route({
			method: "GET",
			path: "/tracking/vehicle",
			summary: "Live vehicle",
		})
		.input(v.object({ vehicleNo: v.string() }))
		.output(VehiclePosition),
};
