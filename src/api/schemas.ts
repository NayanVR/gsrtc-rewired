import * as v from "valibot";

// ── Primitives ────────────────────────────────────────────────────────────
export const Mobile = v.pipe(
	v.string(),
	v.regex(/^\d{10}$/, "Enter a 10-digit mobile number")
);
export const DateStr = v.pipe(v.string(), v.isoDate()); // YYYY-MM-DD
export const Timestamp = v.pipe(v.string(), v.isoTimestamp()); // ISO datetime
export const City = v.pipe(v.string(), v.minLength(2));
export const TicketNo = v.pipe(v.string(), v.minLength(4));
export const Rupees = v.pipe(v.number(), v.minValue(0)); // amount in ₹
export const Passengers = v.pipe(
	v.number(),
	v.integer(),
	v.minValue(1),
	v.maxValue(6)
);

export const BusType = v.picklist([
	"Volvo AC Sleeper",
	"AC Seater",
	"Sleeper",
	"Express",
	"Gurjar Nagari",
	"Electric",
]);

export const SeatStatus = v.picklist(["available", "booked", "ladies", "held"]);
export const Gender = v.picklist(["male", "female", "other"]);

// ── Pagination ────────────────────────────────────────────────────────────
export const PageInput = v.object({
	page: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1)), 1),
	pageSize: v.optional(v.pipe(v.number(), v.integer(), v.maxValue(100)), 20),
});

// ── Domain objects ────────────────────────────────────────────────────────
export const Trip = v.object({
	amenities: v.array(v.string()),
	arrival: Timestamp,
	busType: BusType,
	departure: Timestamp,
	durationMin: v.number(),
	fareFrom: Rupees,
	from: City,
	id: v.string(),
	seatsAvailable: v.number(),
	to: City,
});

export const Seat = v.object({
	deck: v.picklist(["lower", "upper"]),
	fare: Rupees,
	kind: v.picklist(["seater", "sleeper"]),
	no: v.string(),
	status: SeatStatus,
});

export const SeatMap = v.object({
	seats: v.array(Seat),
	tripId: v.string(),
});

export const Passenger = v.object({
	age: v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(120)),
	gender: Gender,
	name: v.pipe(v.string(), v.minLength(2)),
	seatNo: v.string(),
});

export const BookingStatus = v.picklist([
	"confirmed",
	"waiting",
	"cancelled",
	"completed",
]);

export const Booking = v.object({
	amountPaid: Rupees,
	from: City,
	journeyDate: DateStr,
	passengers: v.array(Passenger),
	pnr: v.string(),
	status: BookingStatus,
	to: City,
	tripId: v.string(),
});

export const WalletAccount = v.object({
	balance: Rupees,
	kycStatus: v.picklist(["verified", "pending", "none"]),
	linkedMobile: Mobile,
});

export const Transaction = v.object({
	amount: v.number(), // signed: credit +, debit −
	date: Timestamp,
	description: v.string(),
	id: v.string(),
	type: v.picklist(["credit", "debit"]),
});

export const Pass = v.object({
	applicationNo: v.string(),
	from: City,
	issueLocation: v.string(),
	status: v.picklist(["applied", "issued", "expired"]),
	to: City,
	type: v.picklist(["Daily", "Monthly", "Quarterly", "Student"]),
	validFrom: DateStr,
	validTo: DateStr,
});

export const RefundStatus = v.object({
	amount: Rupees,
	expectedBy: v.optional(DateStr),
	ref: v.string(),
	status: v.picklist(["initiated", "processing", "credited", "failed"]),
});

export const VehiclePosition = v.object({
	etaMin: v.optional(v.number()),
	lastUpdated: Timestamp,
	lat: v.number(),
	lng: v.number(),
	nextStop: v.optional(v.string()),
	speedKmph: v.number(),
	vehicleNo: v.string(),
});

// Stop-by-stop journey progress (a "where's my bus" timeline the adapter
// derives from the raw GPS feed + the service timetable — not a live map).
export const JourneyStop = v.object({
	etaMin: v.optional(v.number()), // minutes until arrival, for current/upcoming
	name: City,
	scheduled: Timestamp,
	status: v.picklist(["departed", "current", "upcoming"]),
	subStops: v.optional(v.array(v.string())), // minor stops on the leg leaving here
});

export const JourneyProgress = v.object({
	delayMin: v.number(), // running delay: + late, − early
	from: City,
	lastUpdated: Timestamp,
	nextStop: v.optional(City),
	stops: v.array(JourneyStop),
	to: City,
	vehicleNo: v.string(),
});

export const User = v.object({
	id: v.string(),
	mobile: Mobile,
	name: v.string(),
});

export const Session = v.object({ token: v.string(), user: User });

// ── Content (CMS for the informational pages) ─────────────────────────────
export const PageSection = v.object({
	bullets: v.optional(v.array(v.string())),
	heading: v.optional(v.string()),
	paragraphs: v.optional(v.array(v.string())),
});

export const ContentPage = v.object({
	intro: v.optional(v.string()),
	sections: v.array(PageSection),
	slug: v.string(),
	title: v.string(),
});

export const Faq = v.object({ answer: v.string(), question: v.string() });

// ── Inferred TS types (handy for the front-end) ───────────────────────────
export type Trip = v.InferOutput<typeof Trip>;
export type Booking = v.InferOutput<typeof Booking>;
export type Seat = v.InferOutput<typeof Seat>;
export type SeatMap = v.InferOutput<typeof SeatMap>;
export type WalletAccount = v.InferOutput<typeof WalletAccount>;
export type Transaction = v.InferOutput<typeof Transaction>;
export type Pass = v.InferOutput<typeof Pass>;
export type VehiclePosition = v.InferOutput<typeof VehiclePosition>;
export type JourneyProgress = v.InferOutput<typeof JourneyProgress>;
export type JourneyStop = v.InferOutput<typeof JourneyStop>;
export type ContentPage = v.InferOutput<typeof ContentPage>;
