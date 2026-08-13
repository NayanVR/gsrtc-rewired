import { useNavigate } from "@tanstack/react-router";
import { type FormEvent, useId, useState } from "react";
import { CalendarIcon, PinIcon, SwapIcon, UsersIcon } from "#/components/icons";
import { CITIES } from "#/data/trips";

const MAX_PASSENGERS = 6;

const BOOKING_TABS = [
	"Advance Booking",
	"AWT (Award Winning Teachers)",
	"MP / MLA Booking",
	"Divyang Booking",
	"Statue of Unity",
	"Electric Bus",
] as const;

function todayIso(): string {
	return new Date().toISOString().slice(0, 10);
}

interface SearchFormProps {
	initial?: { from?: string; to?: string; date?: string; passengers?: number };
	showTabs?: boolean;
	variant?: "hero" | "bar";
}

export function SearchForm({
	variant = "hero",
	showTabs = false,
	initial,
}: SearchFormProps) {
	const navigate = useNavigate();
	const fromId = useId();
	const toId = useId();
	const dateId = useId();
	const paxId = useId();
	const listId = useId();

	const [tab, setTab] = useState<string>(BOOKING_TABS[0]);
	const [from, setFrom] = useState(initial?.from ?? "Vadodara");
	const [to, setTo] = useState(initial?.to ?? "Surat");
	const [date, setDate] = useState(initial?.date ?? todayIso());
	const [passengers, setPassengers] = useState(initial?.passengers ?? 1);
	const [singleLady, setSingleLady] = useState(false);

	const swap = () => {
		setFrom(to);
		setTo(from);
	};

	const submit = (event: FormEvent) => {
		event.preventDefault();
		navigate({ search: { date, from, passengers, to }, to: "/search" });
	};

	const isBar = variant === "bar";

	return (
		<div
			className={
				isBar
					? "rounded-2xl border border-ink-100 bg-surface p-2 shadow-card"
					: "overflow-hidden rounded-3xl border border-ink-100 bg-surface shadow-pop"
			}
		>
			{showTabs ? (
				<div className="flex gap-1 overflow-x-auto border-ink-100 border-b px-2 pt-2">
					{BOOKING_TABS.map((label) => {
						const active = tab === label;
						return (
							<button
								className={`relative whitespace-nowrap rounded-t-xl px-4 py-2.5 font-medium text-sm transition-colors ${
									active
										? "bg-canvas text-ink-900"
										: "text-ink-500 hover:text-ink-800"
								}`}
								key={label}
								onClick={() => setTab(label)}
								type="button"
							>
								{label}
								{active ? (
									<span className="gradient-surface absolute inset-x-3 bottom-0 h-0.5 rounded-full" />
								) : null}
							</button>
						);
					})}
				</div>
			) : null}

			<form className={isBar ? "" : "bg-canvas p-4 sm:p-5"} onSubmit={submit}>
				<div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end">
					<div className="relative grid gap-3 sm:grid-cols-2 md:col-span-2">
						<Field icon={<PinIcon />} id={fromId} label="Source">
							<input
								autoComplete="off"
								className="w-full bg-transparent font-semibold text-ink-900 outline-none placeholder:text-ink-400"
								id={fromId}
								list={listId}
								onChange={(event) => setFrom(event.target.value)}
								placeholder="Origin city"
								value={from}
							/>
						</Field>

						<Field icon={<PinIcon />} id={toId} label="Destination">
							<input
								autoComplete="off"
								className="w-full bg-transparent font-semibold text-ink-900 outline-none placeholder:text-ink-400"
								id={toId}
								list={listId}
								onChange={(event) => setTo(event.target.value)}
								placeholder="Destination city"
								value={to}
							/>
						</Field>

						<button
							aria-label="Swap source and destination"
							className="absolute top-1/2 left-1/2 hidden h-9 w-9 translate-x-[-50%] -translate-y-1/2 place-items-center rounded-full border border-ink-200 bg-surface text-saffron-600 shadow-sm transition hover:rotate-180 hover:border-saffron-300 sm:grid"
							onClick={swap}
							type="button"
						>
							<SwapIcon height={16} width={16} />
						</button>
					</div>

					<Field icon={<CalendarIcon />} id={dateId} label="Date of journey">
						<input
							className="w-full bg-transparent font-semibold text-ink-900 outline-none"
							id={dateId}
							min={todayIso()}
							onChange={(event) => setDate(event.target.value)}
							type="date"
							value={date}
						/>
					</Field>

					<div className="flex gap-3">
						<Field icon={<UsersIcon />} id={paxId} label="Seats">
							<select
								className="w-full bg-transparent font-semibold text-ink-900 outline-none"
								id={paxId}
								onChange={(event) => setPassengers(Number(event.target.value))}
								value={passengers}
							>
								{Array.from(
									{ length: MAX_PASSENGERS },
									(_, index) => index + 1
								).map((count) => (
									<option key={count} value={count}>
										{count}
									</option>
								))}
							</select>
						</Field>

						<button
							className="gradient-surface grid shrink-0 place-items-center rounded-xl px-6 font-semibold text-white shadow-sm transition hover:brightness-105"
							type="submit"
						>
							Search
						</button>
					</div>
				</div>

				<label className="mt-3 flex w-fit cursor-pointer items-center gap-2 text-ink-600 text-sm">
					<input
						checked={singleLady}
						className="h-4 w-4 rounded border-ink-300 accent-saffron-500"
						onChange={(event) => setSingleLady(event.target.checked)}
						type="checkbox"
					/>
					Single Lady
				</label>

				<datalist id={listId}>
					{CITIES.map((city) => (
						<option key={city} value={city} />
					))}
				</datalist>
			</form>
		</div>
	);
}

interface FieldProps {
	children: React.ReactNode;
	icon: React.ReactNode;
	id: string;
	label: string;
}

function Field({ id, label, icon, children }: FieldProps) {
	return (
		<div className="flex items-center gap-3 rounded-xl border border-ink-200 bg-surface px-3.5 py-2.5 transition focus-within:border-saffron-400 focus-within:ring-2 focus-within:ring-saffron-100">
			<span className="text-saffron-500">{icon}</span>
			<label className="flex-1" htmlFor={id}>
				<span className="block font-medium text-ink-500 text-xs">{label}</span>
				{children}
			</label>
		</div>
	);
}
