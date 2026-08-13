/**
 * Mock data for the GSRTC redesign prototype.
 * Shapes here mirror what a real OPRS booking API would return, so the UI can
 * be wired to a backend later with minimal change.
 */

export type BusType =
	| "Volvo AC"
	| "AC Luxury"
	| "Sleeper"
	| "Luxury"
	| "Express"
	| "Gurjarnagri";

export type Amenity =
	| "wifi"
	| "charging"
	| "water"
	| "blanket"
	| "reading-light"
	| "cctv";

export type SeatStatus = "available" | "booked" | "ladies" | "selected";

export interface Seat {
	/** Column position on the deck grid (1-based). */
	col: number;
	id: string;
	isWindow: boolean;
	/** Row position on the deck grid (1-based). */
	row: number;
	status: Exclude<SeatStatus, "selected">;
}

export interface Trip {
	amenities: Amenity[];
	arrival: string;
	boardingPoints: string[];
	busType: BusType;
	departure: string;
	destination: string;
	droppingPoints: string[];
	durationMinutes: number;
	fare: number;
	id: string;
	operatorCode: string;
	origin: string;
	rating: number;
	seatsAvailable: number;
	totalSeats: number;
	via: string[];
}

export const CITIES = [
	"Ahmedabad",
	"Vadodara",
	"Surat",
	"Rajkot",
	"Bhavnagar",
	"Jamnagar",
	"Gandhinagar",
	"Junagadh",
	"Bhuj",
	"Navsari",
	"Anand",
	"Mehsana",
	"Porbandar",
	"Valsad",
	"Palanpur",
] as const;

export const BUS_TYPE_META: Record<
	BusType,
	{ label: string; blurb: string; fareFrom: number }
> = {
	"AC Luxury": {
		blurb: "Air-conditioned reclining seats",
		fareFrom: 268,
		label: "AC Luxury",
	},
	Express: { blurb: "Fast non-stop service", fareFrom: 147, label: "Express" },
	Gurjarnagri: {
		blurb: "Economical everyday travel",
		fareFrom: 160,
		label: "Gurjarnagri",
	},
	Luxury: { blurb: "Reclining comfort seater", fareFrom: 191, label: "Luxury" },
	Sleeper: { blurb: "Overnight berths", fareFrom: 187, label: "Sleeper" },
	"Volvo AC": {
		blurb: "Premium air-conditioned seater",
		fareFrom: 370,
		label: "Volvo AC",
	},
};

export const AMENITY_META: Record<Amenity, { label: string; icon: string }> = {
	blanket: { icon: "blanket", label: "Blanket" },
	cctv: { icon: "shield", label: "CCTV" },
	charging: { icon: "plug", label: "Charging point" },
	"reading-light": { icon: "bulb", label: "Reading light" },
	water: { icon: "drop", label: "Water bottle" },
	wifi: { icon: "wifi", label: "Wi-Fi" },
};

const HOUR_IN_MINUTES = 60;

export function formatDuration(minutes: number): string {
	const hours = Math.floor(minutes / HOUR_IN_MINUTES);
	const mins = minutes % HOUR_IN_MINUTES;
	return `${hours}h ${mins.toString().padStart(2, "0")}m`;
}

export function formatFare(amount: number): string {
	return `₹${amount.toLocaleString("en-IN")}`;
}

const TRIP_SEED: Trip[] = [
	{
		amenities: ["wifi", "charging", "water", "cctv", "reading-light"],
		arrival: "03:00",
		boardingPoints: [
			"Baroda Central Bus Station · 00:15",
			"GNFC Circle · 00:30",
			"Bharuch Bypass · 01:20",
		],
		busType: "Volvo AC",
		departure: "00:15",
		destination: "Surat",
		droppingPoints: ["Surat Central Bus Stand · 03:00", "Kamrej · 02:40"],
		durationMinutes: 165,
		fare: 384,
		id: "2200NHRNRNVSV46",
		operatorCode: "NHR-NVS",
		origin: "Vadodara",
		rating: 4.5,
		seatsAvailable: 21,
		totalSeats: 45,
		via: ["Bharuch", "Ankleshwar"],
	},
	{
		amenities: ["charging", "water", "cctv"],
		arrival: "09:30",
		boardingPoints: ["Baroda Central Bus Station · 06:30", "Makarpura · 06:50"],
		busType: "AC Luxury",
		departure: "06:30",
		destination: "Surat",
		droppingPoints: ["Surat Central Bus Stand · 09:30"],
		durationMinutes: 180,
		fare: 268,
		id: "0630VDSRTLUX12",
		operatorCode: "VD-SRT",
		origin: "Vadodara",
		rating: 4.2,
		seatsAvailable: 8,
		totalSeats: 40,
		via: ["Karjan", "Bharuch"],
	},
	{
		amenities: ["water", "cctv"],
		arrival: "12:15",
		boardingPoints: ["Baroda Central Bus Station · 09:00"],
		busType: "Express",
		departure: "09:00",
		destination: "Surat",
		droppingPoints: ["Surat Central Bus Stand · 12:15"],
		durationMinutes: 195,
		fare: 147,
		id: "0900VDSRTEXP34",
		operatorCode: "VD-SRT",
		origin: "Vadodara",
		rating: 3.9,
		seatsAvailable: 33,
		totalSeats: 54,
		via: ["Bharuch"],
	},
	{
		amenities: ["water"],
		arrival: "17:30",
		boardingPoints: ["Baroda Central Bus Station · 14:00"],
		busType: "Gurjarnagri",
		departure: "14:00",
		destination: "Surat",
		droppingPoints: ["Surat Central Bus Stand · 17:30"],
		durationMinutes: 210,
		fare: 160,
		id: "1400VDSRTGN88",
		operatorCode: "VD-SRT",
		origin: "Vadodara",
		rating: 3.7,
		seatsAvailable: 41,
		totalSeats: 56,
		via: ["Ankleshwar", "Bharuch"],
	},
	{
		amenities: ["charging", "water", "blanket", "cctv", "reading-light"],
		arrival: "01:45",
		boardingPoints: ["Baroda Central Bus Station · 22:30", "Maneja · 22:45"],
		busType: "Sleeper",
		departure: "22:30",
		destination: "Surat",
		droppingPoints: ["Surat Central Bus Stand · 01:45"],
		durationMinutes: 195,
		fare: 187,
		id: "2230VDSRTSLP07",
		operatorCode: "VD-SRT",
		origin: "Vadodara",
		rating: 4.1,
		seatsAvailable: 12,
		totalSeats: 30,
		via: ["Bharuch", "Ankleshwar", "Kim"],
	},
	{
		amenities: ["charging", "water", "reading-light"],
		arrival: "19:45",
		boardingPoints: ["Baroda Central Bus Station · 16:30"],
		busType: "Luxury",
		departure: "16:30",
		destination: "Surat",
		droppingPoints: ["Surat Central Bus Stand · 19:45"],
		durationMinutes: 195,
		fare: 191,
		id: "1630VDSRTLUX55",
		operatorCode: "VD-SRT",
		origin: "Vadodara",
		rating: 4.0,
		seatsAvailable: 19,
		totalSeats: 45,
		via: ["Bharuch"],
	},
];

export function searchTrips(_from: string, _to: string): Trip[] {
	// The prototype returns the same curated set regardless of the query so the
	// results screen always has rich data to render.
	return TRIP_SEED;
}

export function getTrip(id: string): Trip | undefined {
	return TRIP_SEED.find((trip) => trip.id === id);
}

/**
 * Deterministically generate a 2x2 seater deck for a trip so the seat map is
 * stable across renders. Roughly a third of seats are pre-booked and a couple
 * are reserved for ladies.
 */
export function buildSeatMap(trip: Trip): Seat[] {
	const seats: Seat[] = [];
	const columns = 4; // 2 + aisle + 2
	const rows = Math.ceil(trip.totalSeats / columns);
	let seatNumber = 0;

	for (let row = 1; row <= rows; row += 1) {
		for (let col = 1; col <= columns; col += 1) {
			if (seatNumber >= trip.totalSeats) {
				break;
			}
			seatNumber += 1;
			const hash = (seatNumber * 7 + row * 3) % 10;
			let status: Seat["status"] = "available";
			if (hash < 3) {
				status = "booked";
			} else if (hash === 3 && row <= 2) {
				status = "ladies";
			}
			seats.push({
				col,
				id: `${seatNumber}`,
				isWindow: col === 1 || col === columns,
				row,
				status,
			});
		}
	}
	return seats;
}
