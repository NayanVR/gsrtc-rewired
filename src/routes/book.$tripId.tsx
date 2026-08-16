import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Fragment, useMemo, useState } from "react";
import { getSeatMap, getTrip } from "#/api/fns";
import type { Seat, Trip } from "#/api/schemas";
import {
	ArrowRightIcon,
	CheckIcon,
	ClockIcon,
	ShieldCheckIcon,
} from "#/components/icons";
import { SiteFooter } from "#/components/site-footer";
import { SiteHeader } from "#/components/site-header";
import { formatDuration, formatFare, formatTime } from "#/data/trips";

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
	loader: async ({ params }) => {
		try {
			const [trip, seatMap] = await Promise.all([
				getTrip({ data: params.tripId }),
				getSeatMap({ data: params.tripId }),
			]);
			return { seats: seatMap.seats, trip };
		} catch {
			// biome-ignore lint/style/useErrorCause: notFound() renders the 404 boundary; the underlying NOT_FOUND carries no user-facing detail
			throw notFound();
		}
	},
	component: BookPage,
});

const SERVICE_FEE = 15;
const SEATS_PER_ROW = 4;
const AISLE_AFTER = 2;

const TRIP_INFO_LINKS = [
	"Discounts",
	"Amenities",
	"Refreshment Stops",
	"Fare Summary",
] as const;

const SEAT_LEGEND = [
	{ className: "border-ink-300 bg-surface", label: "Available" },
	{ className: "border-transparent gradient-surface", label: "Selected" },
	{ className: "border-ink-200 bg-ink-200", label: "Booked" },
	{ className: "border-pink-400 bg-pink-100", label: "Ladies" },
] as const;

interface Passenger {
	age: string;
	gender: string;
	name: string;
}

function isSelectable(seat: Seat): boolean {
	return seat.status === "available" || seat.status === "ladies";
}

function BookPage() {
	const { trip, seats } = Route.useLoaderData();
	const { date, passengers } = Route.useSearch();

	const [selected, setSelected] = useState<string[]>([]);
	const [email, setEmail] = useState("");
	const [mobile, setMobile] = useState("");
	const [journalist, setJournalist] = useState(false);
	const [people, setPeople] = useState<Record<string, Passenger>>({});

	const toggleSeat = (seat: Seat) => {
		if (!isSelectable(seat)) {
			return;
		}
		setSelected((current) => {
			if (current.includes(seat.no)) {
				return current.filter((no) => no !== seat.no);
			}
			if (current.length >= passengers) {
				return [...current.slice(1), seat.no];
			}
			return [...current, seat.no];
		});
	};

	const setPerson = (seatNo: string, patch: Partial<Passenger>) => {
		setPeople((current) => {
			const existing = current[seatNo] ?? {
				age: "",
				gender: "Male",
				name: "",
			};
			return { ...current, [seatNo]: { ...existing, ...patch } };
		});
	};

	const seatFares = seats
		.filter((seat) => selected.includes(seat.no))
		.reduce((sum, seat) => sum + seat.fare, 0);
	const fees = selected.length * SERVICE_FEE;
	const total = seatFares + fees;
	const canProceed =
		selected.length === passengers && email !== "" && mobile !== "";

	return (
		<>
			<SiteHeader />
			<main className="bg-canvas" id="main">
				<BookingBreadcrumb trip={trip} />
				<div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_360px]">
					<div className="space-y-6">
						<TripSummary date={date} trip={trip} />

						<section className="rounded-2xl border border-ink-100 bg-surface p-5 sm:p-6">
							<div className="flex items-center justify-between">
								<h2 className="font-bold font-display text-ink-900 text-lg">
									Select your seats
								</h2>
								<p className="text-ink-500 text-sm">
									{selected.length}/{passengers} chosen
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

						{/* Passenger details */}
						<section className="rounded-2xl border border-ink-100 bg-surface p-5 sm:p-6">
							<h2 className="font-bold font-display text-ink-900 text-lg">
								Passenger details
							</h2>
							<div className="mt-4 grid gap-3 sm:grid-cols-2">
								<TextField
									label="Email ID"
									onChange={setEmail}
									placeholder="you@example.com"
									required
									type="email"
									value={email}
								/>
								<TextField
									label="Mobile number"
									onChange={setMobile}
									placeholder="10-digit mobile"
									required
									type="tel"
									value={mobile}
								/>
							</div>

							<p className="mt-5 mb-2 font-semibold text-ink-700 text-sm">
								Traveller information
							</p>
							{selected.length === 0 ? (
								<p className="rounded-xl bg-canvas px-4 py-3 text-ink-500 text-sm">
									Select a seat above to add traveller details.
								</p>
							) : (
								<div className="space-y-3">
									{selected.map((seatNo) => {
										const person = people[seatNo];
										return (
											<div
												className="grid gap-2 rounded-xl border border-ink-100 bg-canvas p-3 sm:grid-cols-[auto_1fr_5rem_7rem]"
												key={seatNo}
											>
												<span className="grid place-items-center rounded-lg bg-ink-900 px-3 font-semibold text-sm text-white">
													Seat {seatNo}
												</span>
												<input
													aria-label={`Name for seat ${seatNo}`}
													className="rounded-lg border border-ink-200 bg-surface px-3 py-2 text-ink-900 text-sm outline-none focus-visible:border-saffron-400"
													onChange={(e) =>
														setPerson(seatNo, { name: e.target.value })
													}
													placeholder="Full name"
													value={person?.name ?? ""}
												/>
												<input
													aria-label={`Age for seat ${seatNo}`}
													className="rounded-lg border border-ink-200 bg-surface px-3 py-2 text-ink-900 text-sm outline-none focus-visible:border-saffron-400"
													onChange={(e) =>
														setPerson(seatNo, { age: e.target.value })
													}
													placeholder="Age"
													type="number"
													value={person?.age ?? ""}
												/>
												<select
													aria-label={`Gender for seat ${seatNo}`}
													className="rounded-lg border border-ink-200 bg-surface px-3 py-2 text-ink-900 text-sm outline-none focus-visible:border-saffron-400"
													onChange={(e) =>
														setPerson(seatNo, { gender: e.target.value })
													}
													value={person?.gender ?? "Male"}
												>
													<option>Male</option>
													<option>Female</option>
													<option>Other</option>
												</select>
											</div>
										);
									})}
								</div>
							)}

							<label className="mt-4 flex w-fit cursor-pointer items-center gap-2 text-ink-600 text-sm">
								<input
									checked={journalist}
									className="h-4 w-4 rounded border-ink-300 accent-saffron-500"
									onChange={(e) => setJournalist(e.target.checked)}
									type="checkbox"
								/>
								Are you a Journalist?
							</label>
						</section>

						{/* Info links */}
						<div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl border border-ink-100 bg-surface px-5 py-3">
							{TRIP_INFO_LINKS.map((label) => (
								<button
									className="font-medium text-brand-600 text-sm hover:text-brand-700 hover:underline"
									key={label}
									type="button"
								>
									{label}
								</button>
							))}
						</div>
					</div>

					{/* Fare summary */}
					<aside className="lg:sticky lg:top-24 lg:h-fit">
						<div className="rounded-2xl border border-ink-100 bg-surface p-5 shadow-card">
							<h2 className="font-bold font-display text-ink-900 text-lg">
								Fare summary
							</h2>

							<div className="mt-4 space-y-3 text-sm">
								<SummaryRow
									label={`Seats (${selected.length})`}
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

							{selected.length > 0 ? (
								<div className="mt-4 rounded-xl bg-saffron-50 px-3 py-2.5 text-saffron-800 text-xs">
									Seats{" "}
									<span className="font-semibold">
										{[...selected]
											.sort((a, b) => Number(a) - Number(b))
											.join(", ")}
									</span>
								</div>
							) : null}

							<button
								className="gradient-surface mt-5 flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 font-semibold text-white shadow-sm transition enabled:hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
								disabled={!canProceed}
								type="button"
							>
								Book & pay
								{canProceed ? <ArrowRightIcon height={18} width={18} /> : null}
							</button>

							<div className="mt-4 space-y-2 text-ink-500 text-xs">
								<p className="flex items-start gap-1.5">
									<ShieldCheckIcon
										className="mt-0.5 shrink-0 text-success-500"
										height={14}
										width={14}
									/>
									Note 1: Complete payment within 7 minutes, or the seat is
									released for other passengers.
								</p>
								<p className="pl-5">
									Note 2: E-Wallet — provide a valid email &amp; mobile to
									create or retrieve your wallet.
								</p>
							</div>
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
		<div className="border-ink-100 border-b bg-surface">
			<div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3 text-sm sm:px-6">
				<Link className="text-ink-500 hover:text-saffron-600" to="/">
					Home
				</Link>
				<span className="text-ink-300">/</span>
				<Link
					className="text-ink-500 hover:text-saffron-600"
					search={{
						date: new Date().toISOString().slice(0, 10),
						from: trip.from,
						passengers: 1,
						to: trip.to,
					}}
					to="/search"
				>
					{trip.from} → {trip.to}
				</Link>
				<span className="text-ink-300">/</span>
				<span className="font-semibold text-ink-800">Select seats</span>
			</div>
		</div>
	);
}

function TripSummary({ trip, date }: { trip: Trip; date: string }) {
	return (
		<section className="rounded-2xl border border-ink-100 bg-surface p-5 sm:p-6">
			<div className="flex flex-wrap items-center gap-2">
				<span className="rounded-full bg-brand-50 px-2.5 py-0.5 font-semibold text-brand-700 text-xs">
					{trip.busType}
				</span>
				<span className="font-mono text-ink-400 text-xs">{trip.id}</span>
			</div>

			<div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
				<div>
					<p className="font-bold font-display text-2xl text-ink-900">
						{formatTime(trip.departure)}
					</p>
					<p className="text-ink-500 text-xs">{trip.from}</p>
				</div>
				<div className="flex items-center gap-2 text-ink-400">
					<span className="inline-flex items-center gap-1 text-xs">
						<ClockIcon height={13} width={13} />
						{formatDuration(trip.durationMin)}
					</span>
					<ArrowRightIcon height={16} width={16} />
				</div>
				<div>
					<p className="font-bold font-display text-2xl text-ink-900">
						{formatTime(trip.arrival)}
					</p>
					<p className="text-ink-500 text-xs">{trip.to}</p>
				</div>
				<div className="ml-auto text-right">
					<p className="text-ink-500 text-xs">Journey date</p>
					<p className="font-semibold text-ink-800">
						{new Date(date).toLocaleDateString("en-IN", {
							day: "numeric",
							month: "short",
							weekday: "short",
							year: "numeric",
						})}
					</p>
				</div>
			</div>
		</section>
	);
}

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

function chunkRows(seats: Seat[]): Seat[][] {
	const rows: Seat[][] = [];
	for (let i = 0; i < seats.length; i += SEATS_PER_ROW) {
		rows.push(seats.slice(i, i + SEATS_PER_ROW));
	}
	return rows;
}

function SeatDeck({
	seats,
	selected,
	onToggle,
}: {
	seats: Seat[];
	selected: string[];
	onToggle: (seat: Seat) => void;
}) {
	const decks = useMemo(() => {
		const byDeck = new Map<Seat["deck"], Seat[]>();
		for (const seat of seats) {
			const list = byDeck.get(seat.deck) ?? [];
			list.push(seat);
			byDeck.set(seat.deck, list);
		}
		return [...byDeck.entries()];
	}, [seats]);

	return (
		<div className="inline-block rounded-2xl border border-ink-100 bg-canvas p-4">
			<div className="mb-3 flex items-center justify-end gap-1.5 text-ink-400 text-xs">
				<SteeringIcon />
				Driver
			</div>
			<div className="flex gap-8">
				{decks.map(([deck, deckSeats]) => (
					<div key={deck}>
						{decks.length > 1 ? (
							<p className="mb-2 font-semibold text-ink-500 text-xs capitalize">
								{deck} deck
							</p>
						) : null}
						<div className="space-y-2">
							{chunkRows(deckSeats).map((row, rowIndex) => (
								// biome-ignore lint/suspicious/noArrayIndexKey: rows are positional and stable
								<div className="flex items-center gap-2" key={rowIndex}>
									{row.map((seat, seatIndex) => (
										<Fragment key={seat.no}>
											<SeatButton
												onToggle={onToggle}
												seat={seat}
												selected={selected.includes(seat.no)}
											/>
											{seatIndex === AISLE_AFTER - 1 ? (
												<span aria-hidden className="w-5" />
											) : null}
										</Fragment>
									))}
								</div>
							))}
						</div>
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
	const unavailable = seat.status === "booked" || seat.status === "held";
	const isLadies = seat.status === "ladies";

	let styles =
		"border-ink-300 bg-surface text-ink-700 hover:border-saffron-400";
	if (selected) {
		styles = "gradient-surface border-transparent text-white";
	} else if (unavailable) {
		styles = "cursor-not-allowed border-ink-200 bg-ink-200 text-ink-400";
	} else if (isLadies) {
		styles = "border-pink-400 bg-pink-100 text-pink-700 hover:border-pink-500";
	}

	const label = unavailable
		? `Seat ${seat.no}, unavailable`
		: `Seat ${seat.no}, ${isLadies ? "ladies, " : ""}${
				selected ? "selected" : "available"
			}`;

	return (
		<button
			aria-label={label}
			aria-pressed={selected}
			className={`grid h-9 w-9 place-items-center rounded-lg border font-semibold text-xs transition ${styles}`}
			disabled={unavailable}
			onClick={() => onToggle(seat)}
			type="button"
		>
			{selected ? <CheckIcon height={16} width={16} /> : seat.no}
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

function TextField({
	label,
	value,
	onChange,
	placeholder,
	type,
	required,
}: {
	label: string;
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	type?: string;
	required?: boolean;
}) {
	return (
		<label className="block">
			<span className="mb-1.5 block font-semibold text-ink-700 text-sm">
				{label}
				{required ? <span className="text-saffron-600"> *</span> : null}
			</span>
			<input
				className="w-full rounded-xl border border-ink-200 bg-canvas px-3.5 py-2.5 text-ink-900 outline-none transition focus-visible:border-saffron-400 focus-visible:bg-surface"
				onChange={(event) => onChange(event.target.value)}
				placeholder={placeholder}
				type={type ?? "text"}
				value={value}
			/>
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
						? "font-display font-extrabold text-ink-900 text-lg"
						: "font-semibold text-ink-800"
				}
			>
				{value}
			</span>
		</div>
	);
}
