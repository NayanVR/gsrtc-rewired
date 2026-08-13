import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
	AMENITY_ICONS,
	ArrowRightIcon,
	ClockIcon,
	PinIcon,
	StarIcon,
} from "#/components/icons";
import { SearchForm } from "#/components/search-form";
import { SiteFooter } from "#/components/site-footer";
import { SiteHeader } from "#/components/site-header";
import {
	AMENITY_META,
	type BusType,
	formatDuration,
	formatFare,
	searchTrips,
	type Trip,
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
	loader: ({ deps }) => ({ trips: searchTrips(deps.from, deps.to) }),
	component: SearchResults,
});

const SORTS = [
	{ id: "departure", label: "Departure" },
	{ id: "fare-low", label: "Price: low to high" },
	{ id: "duration", label: "Fastest" },
	{ id: "rating", label: "Top rated" },
] as const;

type SortId = (typeof SORTS)[number]["id"];

const TIME_BANDS = [
	{ id: "early", label: "Before 6 AM", from: 0, to: 6 },
	{ id: "morning", label: "6 AM – 12 PM", from: 6, to: 12 },
	{ id: "afternoon", label: "12 – 6 PM", from: 12, to: 18 },
	{ id: "night", label: "After 6 PM", from: 18, to: 24 },
] as const;

function departureHour(trip: Trip): number {
	return Number(trip.departure.slice(0, 2));
}

function SearchResults() {
	const { from, to, date, passengers } = Route.useSearch();
	const { trips } = Route.useLoaderData();

	const [sort, setSort] = useState<SortId>("departure");
	const [busTypes, setBusTypes] = useState<Set<BusType>>(new Set());
	const [bands, setBands] = useState<Set<string>>(new Set());

	const availableBusTypes = useMemo(
		() => Array.from(new Set(trips.map((trip) => trip.busType))),
		[trips]
	);

	const filtered = useMemo(() => {
		const result = trips.filter((trip) => {
			if (busTypes.size > 0 && !busTypes.has(trip.busType)) {
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
					return a.fare - b.fare;
				case "duration":
					return a.durationMinutes - b.durationMinutes;
				case "rating":
					return b.rating - a.rating;
				default:
					return a.departure.localeCompare(b.departure);
			}
		});
		return sorted;
	}, [trips, busTypes, bands, sort]);

	const toggle = <T,>(set: Set<T>, value: T): Set<T> => {
		const next = new Set(set);
		if (next.has(value)) {
			next.delete(value);
		} else {
			next.add(value);
		}
		return next;
	};

	return (
		<>
			<SiteHeader />
			<main className="bg-canvas" id="main">
				{/* Search summary + modify */}
				<div className="border-ink-200 border-b bg-surface">
					<div className="mx-auto max-w-6xl px-6 py-5">
						<div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1">
							<h1 className="flex items-center gap-2 font-bold text-ink-900 text-xl">
								{from}
								<ArrowRightIcon
									className="text-brand-500"
									height={18}
									width={18}
								/>
								{to}
							</h1>
							<span className="text-ink-500 text-sm">
								{new Date(date).toLocaleDateString("en-IN", {
									weekday: "short",
									day: "numeric",
									month: "short",
								})}{" "}
								· {passengers} {passengers > 1 ? "seats" : "seat"}
							</span>
						</div>
						<SearchForm
							initial={{ from, to, date, passengers }}
							variant="bar"
						/>
					</div>
				</div>

				<div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-8 lg:flex-row">
					{/* Filters */}
					<aside className="lg:w-64 lg:shrink-0">
						<div className="rounded-2xl border border-ink-200 bg-surface p-5 lg:sticky lg:top-24">
							<h2 className="font-bold text-ink-900">Filters</h2>

							<FilterGroup label="Bus type">
								{availableBusTypes.map((type) => (
									<CheckRow
										checked={busTypes.has(type)}
										key={type}
										label={type}
										onChange={() => setBusTypes((set) => toggle(set, type))}
									/>
								))}
							</FilterGroup>

							<FilterGroup label="Departure time">
								{TIME_BANDS.map((band) => (
									<CheckRow
										checked={bands.has(band.id)}
										key={band.id}
										label={band.label}
										onChange={() => setBands((set) => toggle(set, band.id))}
									/>
								))}
							</FilterGroup>

							{(busTypes.size > 0 || bands.size > 0) && (
								<button
									className="mt-4 font-semibold text-brand-600 text-sm hover:text-brand-700"
									onClick={() => {
										setBusTypes(new Set());
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
						<div className="mb-4 flex flex-wrap items-center justify-between gap-3">
							<p className="text-ink-600 text-sm">
								<span className="font-bold text-ink-900">
									{filtered.length}
								</span>{" "}
								buses available
							</p>
							<label className="flex items-center gap-2 text-sm">
								<span className="text-ink-500">Sort by</span>
								<select
									className="rounded-lg border border-ink-200 bg-surface px-3 py-1.5 font-semibold text-ink-800 outline-none focus-visible:border-brand-400"
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

function FilterGroup({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) {
	return (
		<div className="mt-5 border-ink-100 border-t pt-4">
			<p className="mb-2.5 font-semibold text-ink-700 text-sm">{label}</p>
			<div className="space-y-1">{children}</div>
		</div>
	);
}

function CheckRow({
	label,
	checked,
	onChange,
}: {
	label: string;
	checked: boolean;
	onChange: () => void;
}) {
	return (
		<label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-1 py-1.5 text-ink-600 text-sm hover:text-ink-900">
			<input
				checked={checked}
				className="h-4 w-4 rounded border-ink-300 text-brand-600 accent-brand-600"
				onChange={onChange}
				type="checkbox"
			/>
			{label}
		</label>
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
		<article className="overflow-hidden rounded-2xl border border-ink-200 bg-surface shadow-card transition hover:border-brand-300 hover:shadow-pop">
			<div className="grid gap-4 p-5 sm:grid-cols-[1fr_auto] sm:items-center">
				<div>
					<div className="flex flex-wrap items-center gap-2">
						<span className="rounded-full bg-brand-50 px-2.5 py-0.5 font-semibold text-brand-700 text-xs">
							{trip.busType}
						</span>
						<span className="inline-flex items-center gap-1 rounded-full bg-success-50 px-2 py-0.5 font-semibold text-success-700 text-xs">
							<StarIcon height={11} width={11} />
							{trip.rating.toFixed(1)}
						</span>
						<span className="text-ink-400 text-xs">{trip.operatorCode}</span>
					</div>

					<div className="mt-3 flex items-center gap-4">
						<div>
							<p className="font-bold text-ink-900 text-xl">{trip.departure}</p>
							<p className="text-ink-500 text-xs">{trip.origin}</p>
						</div>
						<div className="flex flex-1 items-center gap-2 text-ink-400">
							<span className="h-px flex-1 bg-ink-200" />
							<span className="inline-flex items-center gap-1 whitespace-nowrap text-xs">
								<ClockIcon height={13} width={13} />
								{formatDuration(trip.durationMinutes)}
							</span>
							<span className="h-px flex-1 bg-ink-200" />
						</div>
						<div className="text-right">
							<p className="font-bold text-ink-900 text-xl">{trip.arrival}</p>
							<p className="text-ink-500 text-xs">{trip.destination}</p>
						</div>
					</div>

					{trip.via.length > 0 && (
						<p className="mt-2 inline-flex items-center gap-1 text-ink-400 text-xs">
							<PinIcon height={12} width={12} />
							via {trip.via.join(", ")}
						</p>
					)}

					<div className="mt-3 flex flex-wrap items-center gap-3">
						{trip.amenities.slice(0, 5).map((amenity) => {
							const meta = AMENITY_META[amenity];
							const Icon = AMENITY_ICONS[meta.icon];
							return (
								<span
									className="inline-flex items-center gap-1 text-ink-500 text-xs"
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
						<p className="font-extrabold text-2xl text-ink-900">
							{formatFare(trip.fare)}
						</p>
						<p
							className={
								fillingFast
									? "font-semibold text-accent-600 text-xs"
									: "text-ink-500 text-xs"
							}
						>
							{trip.seatsAvailable} seats left
						</p>
					</div>
					<Link
						className="inline-flex items-center gap-1.5 rounded-xl bg-accent-600 px-5 py-2.5 font-semibold text-white shadow-sm transition hover:bg-accent-700"
						params={{ tripId: trip.id }}
						search={{ date, passengers }}
						to="/book/$tripId"
					>
						Select seats
						<ArrowRightIcon height={16} width={16} />
					</Link>
				</div>
			</div>
		</article>
	);
}
