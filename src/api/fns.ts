import { createServerFn } from "@tanstack/react-start";
import { api } from "#/api/server";

// The client↔server boundary. Each server function wraps a contract call; the
// handler body runs only on the server (the compiler strips it and the `api`
// import from the browser bundle) and the front-end calls these isomorphically.

export const listCities = createServerFn()
	.validator((q: string | undefined) => q)
	.handler(({ data }) => api.search.cities({ q: data }));

export const searchTrips = createServerFn()
	.validator(
		(d: { date: string; from: string; passengers: number; to: string }) => d
	)
	.handler(({ data }) => api.search.trips(data));

export const getTrip = createServerFn()
	.validator((tripId: string) => tripId)
	.handler(({ data }) => api.booking.trip({ tripId: data }));

export const getSeatMap = createServerFn()
	.validator((tripId: string) => tripId)
	.handler(({ data }) => api.booking.seatMap({ tripId: data }));

export const trackJourney = createServerFn()
	.validator((vehicleNo: string) => vehicleNo)
	.handler(({ data }) => api.tracking.progress({ vehicleNo: data }));
