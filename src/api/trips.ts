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

export interface TripLeg {
	date: string;
	from: string;
	index: number;
	to: string;
}

export function parseTripId(tripId: string): TripLeg | null {
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

export function buildTrip({ from, to, date, index }: TripLeg) {
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

export function buildSeats(tripId: string) {
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

export { BUS_TYPES };
