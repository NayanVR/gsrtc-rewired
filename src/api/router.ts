import { implement } from "@orpc/server";
import { eq } from "drizzle-orm";
import { appContract } from "#/api/contract";
import { agentHandlers } from "#/api/handlers/agents";
import { authHandlers } from "#/api/handlers/auth";
import { bookingHandlers } from "#/api/handlers/booking";
import { passHandlers } from "#/api/handlers/passes";
import { refundHandlers } from "#/api/handlers/refunds";
import { ticketHandlers } from "#/api/handlers/tickets";
import { walletHandlers } from "#/api/handlers/wallet";
import { BUS_TYPES, buildTrip } from "#/api/trips";
import { PAGE_CONTENT } from "#/data/page-content";
import { PAGE_TITLES } from "#/data/site-nav";
import { CITIES } from "#/data/trips";
import { getDb } from "#/db/client";
import { pageForms } from "#/db/schema";
import { addEventFields } from "#/lib/events";

// Server-side implementation of the typed contract. Backed by mock data for the
// concept build — each resolver is where a real OPRS adapter call will slot in.
// Only the Phase-1 read domains are implemented so far; unimplemented procedures
// are simply absent from the router and 404 until their phase lands.
const os = implement(appContract);

// ── search ────────────────────────────────────────────────────────────────
const cities = os.search.cities.handler(({ input }) => {
	addEventFields({ result_count: CITIES.length });
	const q = input.q?.trim().toLowerCase();
	if (!q) {
		return [...CITIES];
	}
	return CITIES.filter((city) => city.toLowerCase().includes(q));
});

const trips = os.search.trips.handler(({ input }) => {
	addEventFields({ from: input.from, journey_date: input.date, to: input.to });
	const all = BUS_TYPES.map((_, index) =>
		buildTrip({ date: input.date, from: input.from, index, to: input.to })
	);
	const filtered = input.busType
		? all.filter((trip) => trip.busType === input.busType)
		: all;
	addEventFields({ result_count: filtered.length });
	return { trips: filtered };
});

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
// Minor halts on each leg (keyed by the stop the bus is leaving).
const SUBSTOPS: Record<string, string[]> = {
	Ahmedabad: ["Mahemdabad", "Kheda"],
	Anand: ["Karamsad", "Bhaili"],
	Bharuch: ["Ankleshwar", "Kosamba", "Kim"],
	Nadiad: ["Uttarsanda", "Vasad"],
	Vadodara: ["Karjan", "Palej"],
};
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
	addEventFields({ vehicle_no: input.vehicleNo });
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
			subStops: SUBSTOPS[name],
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
const page = os.content.page.handler(async ({ input }) => {
	const title = PAGE_TITLES[input.slug];
	if (!title) {
		return null;
	}
	const content = PAGE_CONTENT[input.slug];
	const [form] = await getDb()
		.select()
		.from(pageForms)
		.where(eq(pageForms.slug, input.slug))
		.limit(1);
	return {
		form: form
			? {
					external: form.external ?? undefined,
					fields: form.fields,
					intro: form.intro,
					note: form.note ?? undefined,
					submit: form.submit,
				}
			: undefined,
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
	agents: agentHandlers,
	auth: authHandlers,
	booking: bookingHandlers,
	content: { faqs, page },
	passes: passHandlers,
	refunds: refundHandlers,
	search: { cities, trips },
	tickets: ticketHandlers,
	tracking: { progress },
	wallet: walletHandlers,
};
