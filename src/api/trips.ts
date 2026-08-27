import { and, asc, eq, gt, or } from "drizzle-orm";
import type { Seat, Trip } from "#/api/schemas";
import { getDb } from "#/db/client";
import {
	bookedSeats,
	buses,
	busSeats,
	cities as cityRecords,
	transportRoutes,
	tripSchedules,
} from "#/db/schema";

const HOURS_PER_DAY = 24;
const MINUTES_PER_HOUR = 60;
const MINUTES_PER_DAY = HOURS_PER_DAY * MINUTES_PER_HOUR;

export interface TripLeg {
	date: string;
	from: string;
	serviceIndex: number;
	to: string;
}

interface TripRecord {
	amenities: string[];
	busId: string;
	busType: Trip["busType"];
	departureMinutes: number;
	durationMin: number;
	fareFrom: string;
	from: string;
	serviceIndex: number;
	to: string;
}

export function parseTripId(tripId: string): TripLeg | null {
	const [from, to, date, serviceIndexValue, ...extra] = tripId.split("~");
	const serviceIndex = Number(serviceIndexValue);
	if (
		!(from && to && date) ||
		extra.length > 0 ||
		!Number.isInteger(serviceIndex) ||
		serviceIndex < 0
	) {
		return null;
	}
	return { date, from, serviceIndex, to };
}

export function tripIdForLeg(leg: TripLeg): string {
	return `${leg.from}~${leg.to}~${leg.date}~${leg.serviceIndex}`;
}

function isoAt(date: string, totalMinutes: number): string {
	const dateAtMidnight = new Date(`${date}T00:00:00.000Z`);
	dateAtMidnight.setUTCDate(
		dateAtMidnight.getUTCDate() + Math.floor(totalMinutes / MINUTES_PER_DAY)
	);
	const minutesWithinDay = totalMinutes % MINUTES_PER_DAY;
	const hour = Math.floor(minutesWithinDay / MINUTES_PER_HOUR);
	const minute = minutesWithinDay % MINUTES_PER_HOUR;
	return `${dateAtMidnight.toISOString().slice(0, 10)}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+05:30`;
}

async function findTripRecord(leg: TripLeg): Promise<TripRecord | null> {
	const [record] = await getDb()
		.select({
			amenities: buses.amenities,
			busId: buses.id,
			busType: buses.busType,
			departureMinutes: tripSchedules.departureMinutes,
			durationMin: tripSchedules.durationMin,
			fareFrom: tripSchedules.fareFrom,
			from: transportRoutes.fromCity,
			serviceIndex: tripSchedules.serviceIndex,
			to: transportRoutes.toCity,
		})
		.from(tripSchedules)
		.innerJoin(buses, eq(tripSchedules.busId, buses.id))
		.innerJoin(transportRoutes, eq(tripSchedules.routeId, transportRoutes.id))
		.where(
			and(
				eq(transportRoutes.fromCity, leg.from),
				eq(transportRoutes.toCity, leg.to),
				eq(tripSchedules.serviceIndex, leg.serviceIndex),
				eq(transportRoutes.active, true),
				eq(tripSchedules.active, true),
				eq(buses.active, true)
			)
		)
		.limit(1);
	return record ?? null;
}

async function availableSeatCount(
	record: TripRecord,
	publicTripId: string
): Promise<number> {
	const [baselineSeats, activeSeats] = await Promise.all([
		getDb()
			.select({ seatNo: busSeats.seatNo, status: busSeats.defaultStatus })
			.from(busSeats)
			.where(eq(busSeats.busId, record.busId)),
		getDb()
			.select({ seatNo: bookedSeats.seatNo })
			.from(bookedSeats)
			.where(
				and(
					eq(bookedSeats.tripId, publicTripId),
					or(
						eq(bookedSeats.state, "booked"),
						and(
							eq(bookedSeats.state, "held"),
							gt(bookedSeats.expiresAt, new Date())
						)
					)
				)
			),
	]);
	const activeSeatNos = new Set(activeSeats.map((seat) => seat.seatNo));
	return baselineSeats.filter(
		(seat) => seat.status !== "booked" && !activeSeatNos.has(seat.seatNo)
	).length;
}

async function toTrip(record: TripRecord, date: string): Promise<Trip> {
	const id = tripIdForLeg({
		date,
		from: record.from,
		serviceIndex: record.serviceIndex,
		to: record.to,
	});
	return {
		amenities: record.amenities,
		arrival: isoAt(date, record.departureMinutes + record.durationMin),
		busType: record.busType,
		departure: isoAt(date, record.departureMinutes),
		durationMin: record.durationMin,
		fareFrom: Number(record.fareFrom),
		from: record.from,
		id,
		seatsAvailable: await availableSeatCount(record, id),
		to: record.to,
	};
}

export async function listCities(query?: string): Promise<string[]> {
	const rows = await getDb()
		.select()
		.from(cityRecords)
		.orderBy(asc(cityRecords.name));
	const normalizedQuery = query?.trim().toLowerCase();
	if (!normalizedQuery) {
		return rows.map((city) => city.name);
	}
	return rows
		.map((city) => city.name)
		.filter((city) => city.toLowerCase().includes(normalizedQuery));
}

export async function searchTripSchedules(input: {
	date: string;
	from: string;
	passengers: number;
	to: string;
}): Promise<Trip[]> {
	const records = await getDb()
		.select({
			amenities: buses.amenities,
			busId: buses.id,
			busType: buses.busType,
			departureMinutes: tripSchedules.departureMinutes,
			durationMin: tripSchedules.durationMin,
			fareFrom: tripSchedules.fareFrom,
			from: transportRoutes.fromCity,
			serviceIndex: tripSchedules.serviceIndex,
			to: transportRoutes.toCity,
		})
		.from(tripSchedules)
		.innerJoin(buses, eq(tripSchedules.busId, buses.id))
		.innerJoin(transportRoutes, eq(tripSchedules.routeId, transportRoutes.id))
		.where(
			and(
				eq(transportRoutes.fromCity, input.from),
				eq(transportRoutes.toCity, input.to),
				eq(transportRoutes.active, true),
				eq(tripSchedules.active, true),
				eq(buses.active, true)
			)
		)
		.orderBy(asc(tripSchedules.departureMinutes));
	const results = await Promise.all(
		records.map((record) => toTrip(record, input.date))
	);
	return results.filter((trip) => trip.seatsAvailable >= input.passengers);
}

export async function findTrip(tripId: string): Promise<Trip | null> {
	const leg = parseTripId(tripId);
	if (!leg) {
		return null;
	}
	const record = await findTripRecord(leg);
	return record ? toTrip(record, leg.date) : null;
}

export async function findTripSeats(tripId: string): Promise<Seat[] | null> {
	const leg = parseTripId(tripId);
	if (!leg) {
		return null;
	}
	const record = await findTripRecord(leg);
	if (!record) {
		return null;
	}
	const rows = await getDb()
		.select({
			deck: busSeats.deck,
			kind: busSeats.kind,
			no: busSeats.seatNo,
			status: busSeats.defaultStatus,
		})
		.from(busSeats)
		.where(eq(busSeats.busId, record.busId));
	return rows
		.map((seat) => ({ ...seat, fare: Number(record.fareFrom) }))
		.sort((left, right) => Number(left.no) - Number(right.no));
}
