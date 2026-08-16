import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { searchTrips } from "#/api/fns";
import type { Trip } from "#/api/schemas";
import {
	AMENITY_ICONS,
	ArrowRightIcon,
	ChevronDownIcon,
	ClockIcon,
	DiscountIcon,
} from "#/components/icons";
import { SearchForm } from "#/components/search-form";
import { SiteFooter } from "#/components/site-footer";
import { SiteHeader } from "#/components/site-header";
import {
	AMENITY_META,
	BUS_TYPE_META,
	type BusType,
	formatDuration,
	formatFare,
	formatTime,
} from "#/data/trips";

interface SearchParams {
	date: string;
	from: string;
	passengers: number;
	to: string;
}

export const Route = createFileRoute("/search")({
	validateSearch: (search: Record<string, unknown>): SearchParams => ({
		from: typeof search.from === "string" ? search.from : "Vadodara",
		to: typeof search.to === "string" ? search.to : "Surat",
		date:
			typeof search.date === "string"
				? search.date
				: new Date().toISOString().slice(0, 10),
		passengers: typeof search.passengers === "number" ? search.passengers : 1,
	}),
	loaderDeps: ({ search }) => search,
	loader: ({ deps }) =>
		searchTrips({
			data: {
				date: deps.date,
				from: deps.from,
				passengers: deps.passengers,
				to: deps.to,
			},
		}),
	component: SearchResults,
});

const SORTS = [
	{ id: "departure", label: "Departure time" },
	{ id: "fare-low", label: "Price: low to high" },
	{ id: "duration", label: "Fastest" },
] as const;

type SortId = (typeof SORTS)[number]["id"];

const TIME_BANDS = [
	{ id: "early", label: "Before 6 AM", from: 0, to: 6 },
	{ id: "morning", label: "6 AM – 12 PM", from: 6, to: 12 },
	{ id: "afternoon", label: "12 – 6 PM", from: 12, to: 18 },
	{ id: "night", label: "After 6 PM", from: 18, to: 24 },
] as const;

const TRIP_INFO_LINKS = [
	"Discounts",
	"Boarding & Dropping Points",
	"Amenities",
	"Refreshment Stops",
	"Fare Summary",
] as const;

function departureHour(trip: Trip): number {
	return Number(formatTime(trip.departure).slice(0, 2));
}

function SearchResults() {
	const { from, to, date, passengers } = Route.useSearch();
	const { trips } = Route.useLoaderData();

	const [sort, setSort] = useState<SortId>("departure");
	const [activeType, setActiveType] = useState<BusType | "ALL">("ALL");
	const [bands, setBands] = useState<Set<string>>(new Set());
	const [modifyOpen, setModifyOpen] = useState(false);

	const filtered = useMemo(() => {
		const result = trips.filter((trip) => {
			if (activeType !== "ALL" && trip.busType !== activeType) {
				return false;
			}
			if (bands.size > 0) {
				const hour = departureHour(trip);
				const inBand = TIME_BANDS.some(
					(band) => bands.has(band.id) && hour >= band.from && hour < band.to
				);
				if (!inBand) {
					return false;
				}
			}
			return true;
		});

		const sorted = [...result];
		sorted.sort((a, b) => {
			switch (sort) {
				case "fare-low":
					return a.fareFrom - b.fareFrom;
				case "duration":
					return a.durationMin - b.durationMin;
				default:
					return a.departure.localeCompare(b.departure);
			}
		});
		return sorted;
	}, [trips, activeType, bands, sort]);

	const typeChips = useMemo(() => {
		const chips: { type: BusType | "ALL"; count: number; fareFrom?: number }[] =
			[{ type: "ALL", count: trips.length }];
		for (const [type, meta] of Object.entries(BUS_TYPE_META)) {
			const count = trips.filter((t) => t.busType === type).length;
			chips.push({
				type: type as BusType,
				count,
				fareFrom: meta.fareFrom,
			});
		}
		return chips;
	}, [trips]);

	const toggleBand = (id: string) => {
		setBands((set) => {
			const next = new Set(set);
			if (next.has(id)) {
				next.delete(id);
			} else {
				next.add(id);
			}
			return next;
		});
	};

	return (
		<>
			<SiteHeader />
			{/* Heritage banner */}
			<div className="mesh-band relative overflow-hidden">
				<div aria-hidden className="grain" />
				<div aria-hidden className="jali absolute inset-0 opacity-[0.08]" />
				<div className="relative mx-auto max-w-6xl px-4 py-3 text-center text-white sm:px-6">
					<p className="font-display font-semibold">
						Enjoy the rich heritage & warm hospitality of Gujarat with GSRTC
					</p>
					<p className="text-sm text-white/85">
						Avail discounts on premium and non-premium services
					</p>
				</div>
			</div>

			<main className="bg-canvas" id="main">
				{/* Toolbar */}
				<div className="border-ink-100 border-b bg-surface">
					<div className="mx-auto max-w-6xl px-4 py-4 sm:px-6">
						<div className="flex flex-wrap items-center justify-between gap-3">
							<div>
								<p className="font-bold font-display text-ink-900 text-lg">
									Total trips available:{" "}
									<span className="gradient-text">{filtered.length}</span>
								</p>
								<h1 className="mt-0.5 flex items-center gap-2 text-ink-600 text-sm">
									{from.toUpperCase()} Central Bus Stand
									<ArrowRightIcon
										className="text-saffron-500"
										height={14}
										width={14}
									/>
									{to.toUpperCase()} Central Bus Stand ·{" "}
									{new Date(date).toLocaleDateString("en-GB")}
								</h1>
							</div>
							<button
								className="inline-flex items-center gap-1.5 rounded-full border border-ink-200 px-4 py-2 font-semibold text-ink-700 text-sm transition hover:border-saffron-300 hover:text-saffron-700"
								onClick={() => setModifyOpen((v) => !v)}
								type="button"
							>
								Modify search
								<ChevronDownIcon
									className={
										modifyOpen ? "rotate-180 transition" : "transition"
									}
									height={15}
									width={15}
								/>
							</button>
						</div>

						{modifyOpen ? (
							<div className="mt-4">
								<SearchForm
									initial={{ from, to, date, passengers }}
									variant="bar"
								/>
							</div>
						) : null}

						{/* Bus type category chips */}
						<div className="-mx-1 mt-4 flex gap-2 overflow-x-auto px-1 pb-1">
							{typeChips.map((chip) => {
								const active = activeType === chip.type;
								const label =
									chip.type === "ALL" ? "All" : BUS_TYPE_META[chip.type].label;
								return (
									<button
										className={`flex shrink-0 flex-col items-start rounded-xl border px-3.5 py-2 text-left transition ${
											active
												? "border-transparent bg-ink-900 text-white"
												: "border-ink-200 bg-surface text-ink-700 hover:border-saffron-300"
										}`}
										key={chip.type}
										onClick={() => setActiveType(chip.type)}
										type="button"
									>
										<span className="font-semibold text-sm">
											{label}
											<span
												className={active ? "text-white/70" : "text-ink-400"}
											>
												{" "}
												· {chip.count}
											</span>
										</span>
										{chip.fareFrom ? (
											<span
												className={`text-xs ${
													active ? "text-white/70" : "text-ink-400"
												}`}
											>
												from {formatFare(chip.fareFrom)}
											</span>
										) : (
											<span
												className={`text-xs ${
													active ? "text-white/70" : "text-ink-400"
												}`}
											>
												all services
											</span>
										)}
									</button>
								);
							})}
						</div>
					</div>
				</div>

				<div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:flex-row">
					{/* Filters */}
					<aside className="lg:w-60 lg:shrink-0">
						<div className="rounded-2xl border border-ink-100 bg-surface p-5 lg:sticky lg:top-24">
							<h2 className="font-bold font-display text-ink-900">Filters</h2>

							<div className="mt-4 border-ink-100 border-t pt-4">
								<p className="mb-2.5 font-semibold text-ink-700 text-sm">
									Filter by time
								</p>
								<div className="space-y-1">
									{TIME_BANDS.map((band) => (
										<label
											className="flex cursor-pointer items-center gap-2.5 rounded-lg px-1 py-1.5 text-ink-600 text-sm hover:text-ink-900"
											key={band.id}
										>
											<input
												checked={bands.has(band.id)}
												className="h-4 w-4 rounded border-ink-300 accent-saffron-500"
												onChange={() => toggleBand(band.id)}
												type="checkbox"
											/>
											{band.label}
										</label>
									))}
								</div>
							</div>

							{(activeType !== "ALL" || bands.size > 0) && (
								<button
									className="mt-4 font-semibold text-saffron-600 text-sm hover:text-saffron-700"
									onClick={() => {
										setActiveType("ALL");
										setBands(new Set());
									}}
									type="button"
								>
									Clear all filters
								</button>
							)}
						</div>
					</aside>

					{/* Results */}
					<section className="flex-1">
						<div className="mb-4 flex items-center justify-between gap-3">
							<p className="text-ink-600 text-sm">
								Showing{" "}
								<span className="font-bold text-ink-900">
									{filtered.length}
								</span>{" "}
								buses
							</p>
							<label className="flex items-center gap-2 text-sm">
								<span className="text-ink-500">Sort by</span>
								<select
									className="rounded-lg border border-ink-200 bg-surface px-3 py-1.5 font-semibold text-ink-800 outline-none focus-visible:border-saffron-400"
									onChange={(event) => setSort(event.target.value as SortId)}
									value={sort}
								>
									{SORTS.map((option) => (
										<option key={option.id} value={option.id}>
											{option.label}
										</option>
									))}
								</select>
							</label>
						</div>
						{filtered.length === 0 ? (
							<div className="rounded-2xl border border-ink-200 border-dashed bg-surface p-12 text-center">
								<p className="font-semibold text-ink-900">
									No buses match these filters
								</p>
								<p className="mt-1 text-ink-500 text-sm">
									Try clearing a filter or widening your departure window.
								</p>
							</div>
						) : (
							<ul className="space-y-4">
								{filtered.map((trip) => (
									<li key={trip.id}>
										<TripCard date={date} passengers={passengers} trip={trip} />
									</li>
								))}
							</ul>
						)}
					</section>
				</div>
			</main>
			<SiteFooter />
		</>
	);
}

function TripCard({
	trip,
	date,
	passengers,
}: {
	trip: Trip;
	date: string;
	passengers: number;
}) {
	const fillingFast = trip.seatsAvailable <= 10;

	return (
		<article className="overflow-hidden rounded-2xl border border-ink-100 bg-surface shadow-card transition hover:border-saffron-300 hover:shadow-pop">
			<div className="grid gap-4 p-5 sm:grid-cols-[1fr_auto] sm:items-center">
				<div>
					<div className="flex flex-wrap items-center gap-2">
						<span className="rounded-full bg-brand-50 px-2.5 py-0.5 font-semibold text-brand-700 text-xs">
							{trip.busType}
						</span>
						<span className="font-mono text-ink-400 text-xs">{trip.id}</span>
					</div>

					<div className="mt-3 flex items-center gap-4">
						<div>
							<p className="font-bold font-display text-ink-900 text-xl">
								{formatTime(trip.departure)}
							</p>
							<p className="text-ink-500 text-xs">{trip.from}</p>
						</div>
						<div className="flex flex-1 items-center gap-2 text-ink-400">
							<span className="h-px flex-1 bg-ink-200" />
							<span className="inline-flex items-center gap-1 whitespace-nowrap text-xs">
								<ClockIcon height={13} width={13} />
								{formatDuration(trip.durationMin)}
							</span>
							<span className="h-px flex-1 bg-ink-200" />
						</div>
						<div className="text-right">
							<p className="font-bold font-display text-ink-900 text-xl">
								{formatTime(trip.arrival)}
							</p>
							<p className="text-ink-500 text-xs">{trip.to}</p>
						</div>
					</div>

					<div className="mt-3 flex flex-wrap items-center gap-3">
						{trip.amenities.slice(0, 5).map((amenity) => {
							const meta = AMENITY_META[amenity];
							if (!meta) {
								return null;
							}
							const Icon = AMENITY_ICONS[meta.icon];
							return (
								<span
									className="inline-flex items-center gap-1 text-ink-500"
									key={amenity}
									title={meta.label}
								>
									{Icon ? <Icon height={14} width={14} /> : null}
									<span className="sr-only">{meta.label}</span>
								</span>
							);
						})}
					</div>
				</div>

				<div className="flex items-end justify-between gap-4 border-ink-100 border-t pt-4 sm:flex-col sm:items-end sm:border-t-0 sm:border-l sm:pt-0 sm:pl-5">
					<div className="text-right">
						<p className="font-display font-extrabold text-2xl text-ink-900">
							{formatFare(trip.fareFrom)}
						</p>
						<p
							className={
								fillingFast
									? "font-semibold text-saffron-600 text-xs"
									: "text-ink-500 text-xs"
							}
						>
							{trip.seatsAvailable} seats left
						</p>
					</div>
					<Link
						className="gradient-surface inline-flex items-center gap-1.5 rounded-xl px-5 py-2.5 font-semibold text-white shadow-sm transition hover:brightness-105"
						params={{ tripId: trip.id }}
						search={{ date, passengers }}
						to="/book/$tripId"
					>
						Select seat/s
						<ArrowRightIcon height={16} width={16} />
					</Link>
				</div>
			</div>

			{/* Info links */}
			<div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-ink-100 border-t bg-canvas/60 px-5 py-2.5">
				<DiscountIcon className="text-saffron-500" height={14} width={14} />
				{TRIP_INFO_LINKS.map((label) => (
					<button
						className="font-medium text-brand-600 text-xs hover:text-brand-700 hover:underline"
						key={label}
						type="button"
					>
						{label}
					</button>
				))}
			</div>
		</article>
	);
}
