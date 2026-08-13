import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Fragment, useMemo, useState } from "react";
import {
	ArrowRightIcon,
	CheckIcon,
	ClockIcon,
	PinIcon,
	ShieldCheckIcon,
	StarIcon,
} from "#/components/icons";
import { SiteFooter } from "#/components/site-footer";
import { SiteHeader } from "#/components/site-header";
import {
	buildSeatMap,
	formatDuration,
	formatFare,
	getTrip,
	type Seat,
	type Trip,
} from "#/data/trips";

interface BookSearch {
	date: string;
	passengers: number;
}

export const Route = createFileRoute("/book/$tripId")({
	validateSearch: (search: Record<string, unknown>): BookSearch => ({
		date:
			typeof search.date === "string"
				? search.date
				: new Date().toISOString().slice(0, 10),
		passengers: typeof search.passengers === "number" ? search.passengers : 1,
	}),
	loader: ({ params }) => {
		const trip = getTrip(params.tripId);
		if (!trip) {
			throw notFound();
		}
		return { trip, seats: buildSeatMap(trip) };
	},
	component: BookPage,
});

const SERVICE_FEE = 15;

function BookPage() {
	const { trip, seats } = Route.useLoaderData();
	const { date, passengers } = Route.useSearch();

	const [selected, setSelected] = useState<Set<string>>(new Set());
	const [boarding, setBoarding] = useState(trip.boardingPoints[0]);
	const [dropping, setDropping] = useState(trip.droppingPoints[0]);

	const toggleSeat = (seat: Seat) => {
		if (seat.status === "booked") {
			return;
		}
		setSelected((current) => {
			const next = new Set(current);
			if (next.has(seat.id)) {
				next.delete(seat.id);
			} else {
				if (next.size >= passengers) {
					// replace the earliest selection so the count never exceeds pax
					const [first] = next;
					next.delete(first);
				}
				next.add(seat.id);
			}
			return next;
		});
	};

	const seatFares = selected.size * trip.fare;
	const fees = selected.size * SERVICE_FEE;
	const total = seatFares + fees;
	const canProceed = selected.size === passengers;

	return (
		<>
			<SiteHeader />
			<main className="bg-canvas" id="main">
				<BookingBreadcrumb trip={trip} />
				<div className="mx-auto grid max-w-6xl gap-6 px-6 py-8 lg:grid-cols-[1fr_360px]">
					<div className="space-y-6">
						<TripSummary date={date} trip={trip} />

						<section className="rounded-2xl border border-ink-200 bg-surface p-5 sm:p-6">
							<div className="flex items-center justify-between">
								<h2 className="font-bold text-ink-900 text-lg">
									Select your seats
								</h2>
								<p className="text-ink-500 text-sm">
									{selected.size}/{passengers} chosen
								</p>
							</div>

							<SeatLegend />

							<div className="mt-5 overflow-x-auto">
								<SeatDeck
									onToggle={toggleSeat}
									seats={seats}
									selected={selected}
								/>
							</div>
						</section>

						<section className="grid gap-4 rounded-2xl border border-ink-200 bg-surface p-5 sm:grid-cols-2 sm:p-6">
							<PointSelect
								icon={<PinIcon />}
								label="Boarding point"
								onChange={setBoarding}
								options={trip.boardingPoints}
								value={boarding}
							/>
							<PointSelect
								icon={<PinIcon />}
								label="Dropping point"
								onChange={setDropping}
								options={trip.droppingPoints}
								value={dropping}
							/>
						</section>
					</div>

					{/* Fare summary */}
					<aside className="lg:sticky lg:top-24 lg:h-fit">
						<div className="rounded-2xl border border-ink-200 bg-surface p-5 shadow-card">
							<h2 className="font-bold text-ink-900 text-lg">Fare summary</h2>

							<div className="mt-4 space-y-3 text-sm">
								<SummaryRow
									label={`Seats (${selected.size || 0} × ${formatFare(trip.fare)})`}
									value={formatFare(seatFares)}
								/>
								<SummaryRow label="Service fee" value={formatFare(fees)} />
								<div className="border-ink-100 border-t pt-3">
									<SummaryRow
										bold
										label="Total payable"
										value={formatFare(total)}
									/>
								</div>
							</div>

							{selected.size > 0 && (
								<div className="mt-4 rounded-xl bg-brand-50 px-3 py-2.5 text-brand-800 text-xs">
									Seats{" "}
									<span className="font-semibold">
										{Array.from(selected)
											.sort((a, b) => Number(a) - Number(b))
											.join(", ")}
									</span>{" "}
									· {boarding?.split(" · ")[0]}
								</div>
							)}

							<button
								className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-accent-600 px-5 py-3 font-semibold text-white shadow-sm transition enabled:hover:bg-accent-700 disabled:cursor-not-allowed disabled:opacity-50"
								disabled={!canProceed}
								type="button"
							>
								{canProceed
									? "Proceed to pay"
									: `Select ${passengers - selected.size} more seat${
											passengers - selected.size > 1 ? "s" : ""
										}`}
								{canProceed ? <ArrowRightIcon height={18} width={18} /> : null}
							</button>

							<p className="mt-3 flex items-center justify-center gap-1.5 text-ink-500 text-xs">
								<ShieldCheckIcon height={14} width={14} />
								Seat held for 7 minutes during payment
							</p>
						</div>
					</aside>
				</div>
			</main>
			<SiteFooter />
		</>
	);
}

function BookingBreadcrumb({ trip }: { trip: Trip }) {
	return (
		<div className="border-ink-200 border-b bg-surface">
			<div className="mx-auto flex max-w-6xl items-center gap-2 px-6 py-3 text-sm">
				<Link className="text-ink-500 hover:text-brand-600" to="/">
					Home
				</Link>
				<span className="text-ink-300">/</span>
				<Link
					className="text-ink-500 hover:text-brand-600"
					search={{
						from: trip.origin,
						to: trip.destination,
						date: new Date().toISOString().slice(0, 10),
						passengers: 1,
					}}
					to="/search"
				>
					{trip.origin} → {trip.destination}
				</Link>
				<span className="text-ink-300">/</span>
				<span className="font-semibold text-ink-800">Select seats</span>
			</div>
		</div>
	);
}

function TripSummary({ trip, date }: { trip: Trip; date: string }) {
	return (
		<section className="rounded-2xl border border-ink-200 bg-surface p-5 sm:p-6">
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

			<div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
				<div>
					<p className="font-bold text-2xl text-ink-900">{trip.departure}</p>
					<p className="text-ink-500 text-xs">{trip.origin}</p>
				</div>
				<div className="flex items-center gap-2 text-ink-400">
					<span className="inline-flex items-center gap-1 text-xs">
						<ClockIcon height={13} width={13} />
						{formatDuration(trip.durationMinutes)}
					</span>
					<ArrowRightIcon height={16} width={16} />
				</div>
				<div>
					<p className="font-bold text-2xl text-ink-900">{trip.arrival}</p>
					<p className="text-ink-500 text-xs">{trip.destination}</p>
				</div>
				<div className="ml-auto text-right">
					<p className="text-ink-500 text-xs">Journey date</p>
					<p className="font-semibold text-ink-800">
						{new Date(date).toLocaleDateString("en-IN", {
							weekday: "short",
							day: "numeric",
							month: "short",
							year: "numeric",
						})}
					</p>
				</div>
			</div>
		</section>
	);
}

const SEAT_LEGEND = [
	{ label: "Available", className: "border-ink-300 bg-surface" },
	{ label: "Selected", className: "border-brand-600 bg-brand-600" },
	{ label: "Booked", className: "border-ink-200 bg-ink-200" },
	{ label: "Ladies", className: "border-pink-400 bg-pink-100" },
] as const;

function SeatLegend() {
	return (
		<div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
			{SEAT_LEGEND.map((item) => (
				<span
					className="inline-flex items-center gap-2 text-ink-600 text-xs"
					key={item.label}
				>
					<span
						aria-hidden
						className={`h-4 w-4 rounded border ${item.className}`}
					/>
					{item.label}
				</span>
			))}
		</div>
	);
}

function SeatDeck({
	seats,
	selected,
	onToggle,
}: {
	seats: Seat[];
	selected: Set<string>;
	onToggle: (seat: Seat) => void;
}) {
	const rows = useMemo(() => {
		const byRow = new Map<number, Seat[]>();
		for (const seat of seats) {
			const list = byRow.get(seat.row) ?? [];
			list.push(seat);
			byRow.set(seat.row, list);
		}
		return Array.from(byRow.entries())
			.sort(([a], [b]) => a - b)
			.map(([, list]) => list.sort((a, b) => a.col - b.col));
	}, [seats]);

	return (
		<div className="inline-block rounded-2xl border border-ink-200 bg-ink-50/50 p-4">
			<div className="mb-3 flex items-center justify-end gap-1.5 text-ink-400 text-xs">
				<SteeringIcon />
				Driver
			</div>
			<div className="space-y-2">
				{rows.map((row, rowIndex) => (
					// biome-ignore lint/suspicious/noArrayIndexKey: rows are positional and stable
					<div className="flex items-center gap-2" key={rowIndex}>
						{row.map((seat, seatIndex) => (
							<Fragment key={seat.id}>
								<SeatButton
									onToggle={onToggle}
									seat={seat}
									selected={selected.has(seat.id)}
								/>
								{/* aisle gap after the second seat */}
								{seatIndex === 1 ? <span aria-hidden className="w-5" /> : null}
							</Fragment>
						))}
					</div>
				))}
			</div>
		</div>
	);
}

function SeatButton({
	seat,
	selected,
	onToggle,
}: {
	seat: Seat;
	selected: boolean;
	onToggle: (seat: Seat) => void;
}) {
	const isBooked = seat.status === "booked";
	const isLadies = seat.status === "ladies";

	let styles = "border-ink-300 bg-surface text-ink-700 hover:border-brand-400";
	if (selected) {
		styles = "border-brand-600 bg-brand-600 text-white";
	} else if (isBooked) {
		styles = "cursor-not-allowed border-ink-200 bg-ink-200 text-ink-400";
	} else if (isLadies) {
		styles = "border-pink-400 bg-pink-100 text-pink-700 hover:border-pink-500";
	}

	const label = isBooked
		? `Seat ${seat.id}, booked`
		: `Seat ${seat.id}, ${isLadies ? "ladies, " : ""}${
				selected ? "selected" : "available"
			}`;

	return (
		<button
			aria-label={label}
			aria-pressed={selected}
			className={`grid h-9 w-9 place-items-center rounded-lg border font-semibold text-xs transition ${styles}`}
			disabled={isBooked}
			onClick={() => onToggle(seat)}
			type="button"
		>
			{selected ? <CheckIcon height={16} width={16} /> : seat.id}
		</button>
	);
}

function SteeringIcon() {
	return (
		<svg
			aria-hidden
			fill="none"
			height={16}
			stroke="currentColor"
			strokeWidth={1.8}
			viewBox="0 0 24 24"
			width={16}
		>
			<circle cx="12" cy="12" r="9" />
			<circle cx="12" cy="12" r="2.5" />
			<path d="M12 14.5V21M9.8 11 4 8.5M14.2 11 20 8.5" />
		</svg>
	);
}

function PointSelect({
	label,
	icon,
	value,
	options,
	onChange,
}: {
	label: string;
	icon: React.ReactNode;
	value: string | undefined;
	options: string[];
	onChange: (value: string) => void;
}) {
	return (
		<label className="block">
			<span className="mb-1.5 flex items-center gap-1.5 font-semibold text-ink-700 text-sm">
				<span className="text-brand-500">{icon}</span>
				{label}
			</span>
			<select
				className="w-full rounded-xl border border-ink-200 bg-ink-50/60 px-3.5 py-2.5 font-medium text-ink-800 outline-none transition focus-visible:border-brand-400 focus-visible:bg-surface"
				onChange={(event) => onChange(event.target.value)}
				value={value}
			>
				{options.map((option) => (
					<option key={option} value={option}>
						{option}
					</option>
				))}
			</select>
		</label>
	);
}

function SummaryRow({
	label,
	value,
	bold,
}: {
	label: string;
	value: string;
	bold?: boolean;
}) {
	return (
		<div className="flex items-center justify-between">
			<span className={bold ? "font-bold text-ink-900" : "text-ink-600"}>
				{label}
			</span>
			<span
				className={
					bold
						? "font-extrabold text-ink-900 text-lg"
						: "font-semibold text-ink-800"
				}
			>
				{value}
			</span>
		</div>
	);
}
