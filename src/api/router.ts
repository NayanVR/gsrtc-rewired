import { implement } from "@orpc/server";
import { appContract } from "#/api/contract";
import { PAGE_CONTENT } from "#/data/page-content";
import { PAGE_TITLES } from "#/data/site-nav";
import { CITIES } from "#/data/trips";

// Server-side implementation of the typed contract. Backed by mock data for the
// concept build — each resolver is where a real OPRS adapter call will slot in.
// Only the Phase-1 read domains are implemented so far; unimplemented procedures
// are simply absent from the router and 404 until their phase lands.
const os = implement(appContract);

// ── Mock trip catalogue ─────────────────────────────────────────────────
// Trips are generated deterministically from the search leg, and their id
// encodes the leg so a single trip / its seat map can be rebuilt on the booking
// screen without any store. `~` is safe: no city name or ISO date contains it.
const BUS_TYPES = [
	"Volvo AC Sleeper",
	"AC Seater",
	"Sleeper",
	"Express",
	"Gurjar Nagari",
	"Electric",
] as const;

const HOURS_PER_DAY = 24;
const MIN_PER_HOUR = 60;
const FIRST_DEPART_HOUR = 6;
const HOURS_BETWEEN = 3;
const BASE_DURATION = 150;
const BASE_FARE = 147;
const FARE_STEP = 45;
const BASE_SEATS = 40;
const SEATS_STEP = 5;
const SEAT_COUNT = 40;

interface Leg {
	date: string;
	from: string;
	index: number;
	to: string;
}

function parseTripId(tripId: string): Leg | null {
	const [from, to, date, indexStr] = tripId.split("~");
	const index = Number(indexStr);
	if (
		!(from && to && date) ||
		Number.isNaN(index) ||
		index >= BUS_TYPES.length
	) {
		return null;
	}
	return { date, from, index, to };
}

function isoAt(date: string, totalMinutes: number): string {
	const hour = Math.floor(totalMinutes / MIN_PER_HOUR) % HOURS_PER_DAY;
	const min = totalMinutes % MIN_PER_HOUR;
	return `${date}T${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}:00+05:30`;
}

function buildTrip({ from, to, date, index }: Leg) {
	const departMinutes =
		(FIRST_DEPART_HOUR + index * HOURS_BETWEEN) * MIN_PER_HOUR + 15;
	const durationMin = BASE_DURATION + index * 20;
	return {
		amenities: ["charging", "water", "cctv"],
		arrival: isoAt(date, departMinutes + durationMin),
		busType: BUS_TYPES[index],
		departure: isoAt(date, departMinutes),
		durationMin,
		fareFrom: BASE_FARE + index * FARE_STEP,
		from,
		id: `${from}~${to}~${date}~${index}`,
		seatsAvailable: BASE_SEATS - index * SEATS_STEP,
		to,
	};
}

function buildSeats(tripId: string) {
	const leg = parseTripId(tripId);
	const index = leg ? leg.index : 0;
	const busType = BUS_TYPES[index];
	const isSleeper = busType.includes("Sleeper");
	const fare = BASE_FARE + index * FARE_STEP;
	const seats: {
		deck: "lower" | "upper";
		fare: number;
		kind: "seater" | "sleeper";
		no: string;
		status: "available" | "booked" | "ladies" | "held";
	}[] = [];
	for (let n = 1; n <= SEAT_COUNT; n += 1) {
		const hash = (n * 7 + index * 3) % 10;
		let status: (typeof seats)[number]["status"] = "available";
		if (hash < 3) {
			status = "booked";
		} else if (hash === 3 && n <= 8) {
			status = "ladies";
		}
		seats.push({
			deck: isSleeper && n > SEAT_COUNT / 2 ? "upper" : "lower",
			fare,
			kind: isSleeper ? "sleeper" : "seater",
			no: String(n),
			status,
		});
	}
	return seats;
}

// ── search ────────────────────────────────────────────────────────────────
const cities = os.search.cities.handler(({ input }) => {
	const q = input.q?.trim().toLowerCase();
	if (!q) {
		return [...CITIES];
	}
	return CITIES.filter((city) => city.toLowerCase().includes(q));
});

const trips = os.search.trips.handler(({ input }) => {
	const all = BUS_TYPES.map((_, index) =>
		buildTrip({ date: input.date, from: input.from, index, to: input.to })
	);
	const filtered = input.busType
		? all.filter((t) => t.busType === input.busType)
		: all;
	return { trips: filtered };
});

// ── booking (read side) ─────────────────────────────────────────────────
const trip = os.booking.trip.handler(({ input, errors }) => {
	const leg = parseTripId(input.tripId);
	if (!leg) {
		throw errors.NOT_FOUND();
	}
	return buildTrip(leg);
});

const seatMap = os.booking.seatMap.handler(({ input }) => ({
	seats: buildSeats(input.tripId),
	tripId: input.tripId,
}));

// ── tracking ────────────────────────────────────────────────────────────
// A fixed demo corridor. The real adapter would resolve the vehicle's actual
// route + timetable; here we synthesise a schedule around "now" so the timeline
// genuinely advances as time passes, and refreshes move the bus along.
const TRACK_CORRIDOR = [
	"Ahmedabad",
	"Nadiad",
	"Anand",
	"Vadodara",
	"Bharuch",
	"Surat",
] as const;
const STOP_GAP_MIN = 40;
const JOURNEY_STARTED_MIN_AGO = 95;
const MS_PER_MIN = 60_000;

function hashString(value: string): number {
	let hash = 0;
	for (let i = 0; i < value.length; i += 1) {
		hash = (hash * 31 + value.charCodeAt(i)) % 100_000;
	}
	return hash;
}

const progress = os.tracking.progress.handler(({ input }) => {
	const now = Date.now();
	const delayMin = (hashString(input.vehicleNo) % 11) - 3; // −3..+7
	const start = now - JOURNEY_STARTED_MIN_AGO * MS_PER_MIN;
	const scheduledMsAt = (i: number) =>
		start + (i * STOP_GAP_MIN + delayMin) * MS_PER_MIN;

	let currentIndex = TRACK_CORRIDOR.findIndex((_, i) => scheduledMsAt(i) > now);
	if (currentIndex === -1) {
		currentIndex = TRACK_CORRIDOR.length - 1; // journey complete
	}

	const stops = TRACK_CORRIDOR.map((name, i) => {
		let status: "departed" | "current" | "upcoming" = "upcoming";
		if (i < currentIndex) {
			status = "departed";
		} else if (i === currentIndex) {
			status = "current";
		}
		const scheduledMs = scheduledMsAt(i);
		return {
			etaMin:
				i >= currentIndex
					? Math.max(0, Math.round((scheduledMs - now) / MS_PER_MIN))
					: undefined,
			name,
			scheduled: new Date(scheduledMs).toISOString(),
			status,
		};
	});

	const [origin] = TRACK_CORRIDOR;
	return {
		delayMin,
		from: origin,
		lastUpdated: new Date(now).toISOString(),
		nextStop: TRACK_CORRIDOR[currentIndex],
		stops,
		to: TRACK_CORRIDOR.at(-1) ?? origin,
		vehicleNo: input.vehicleNo,
	};
});

// ── content ─────────────────────────────────────────────────────────────
const page = os.content.page.handler(({ input }) => {
	const title = PAGE_TITLES[input.slug];
	if (!title) {
		return null;
	}
	const content = PAGE_CONTENT[input.slug];
	return {
		intro: content?.intro,
		sections: content?.sections ?? [],
		slug: input.slug,
		title,
	};
});

const faqs = os.content.faqs.handler(() => ({
	faqs: [
		{
			answer:
				"Yes. Tickets can be cancelled up to the cut-off time; the refund is credited to the original payment method, minus applicable charges.",
			question: "Can I cancel my ticket online?",
		},
		{
			answer:
				"Open the ticket from Booking History and choose Reschedule. Rescheduling is subject to seat availability on the new service.",
			question: "How do I reschedule a booked journey?",
		},
		{
			answer:
				"Concessional passes (student, senior citizen, Divyang) can be applied for online under the Passes section with the required documents.",
			question: "How do I apply for a concession pass?",
		},
	],
}));

export const router = {
	booking: { seatMap, trip },
	content: { faqs, page },
	search: { cities, trips },
	tracking: { progress },
};
