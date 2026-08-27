/**
 * Presentation helpers for trip data. The trip/seat shapes and the data itself
 * now come from the typed API contract (`#/api/schemas`, served via `#/api/fns`);
 * this module only holds display formatting and the static per-bus-type copy the
 * contract doesn't carry.
 */
import type * as v from "valibot";
import type { BusType as BusTypeSchema } from "#/api/schemas";

export type BusType = v.InferOutput<typeof BusTypeSchema>;

export const BUS_TYPE_META: Record<
	BusType,
	{ label: string; blurb: string; fareFrom: number }
> = {
	"AC Seater": {
		blurb: "Air-conditioned reclining seater",
		fareFrom: 268,
		label: "AC Seater",
	},
	Electric: {
		blurb: "Zero-emission city & intercity service",
		fareFrom: 210,
		label: "Electric",
	},
	Express: {
		blurb: "Fast limited-stop service",
		fareFrom: 147,
		label: "Express",
	},
	"Gurjar Nagari": {
		blurb: "Economical everyday travel",
		fareFrom: 160,
		label: "Gurjar Nagari",
	},
	Sleeper: { blurb: "Overnight berths", fareFrom: 187, label: "Sleeper" },
	"Volvo AC Sleeper": {
		blurb: "Premium air-conditioned sleeper",
		fareFrom: 370,
		label: "Volvo AC Sleeper",
	},
};

export const AMENITY_META: Record<string, { label: string; icon: string }> = {
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

/**
 * Contract timestamps are ISO strings carrying an IST (+05:30) offset, so the
 * wall-clock time is the HH:MM slice. No timezone maths is needed for display.
 */
export function formatTime(iso: string): string {
	return iso.slice(11, 16);
}
