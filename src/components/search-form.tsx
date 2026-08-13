import { useNavigate } from "@tanstack/react-router";
import { type FormEvent, useId, useState } from "react";
import { CalendarIcon, PinIcon, SwapIcon, UsersIcon } from "#/components/icons";
import { CITIES } from "#/data/trips";

const MAX_PASSENGERS = 6;

function todayIso(): string {
	return new Date().toISOString().slice(0, 10);
}

interface SearchFormProps {
	initial?: { from?: string; to?: string; date?: string; passengers?: number };
	variant?: "hero" | "bar";
}

export function SearchForm({ variant = "hero", initial }: SearchFormProps) {
	const navigate = useNavigate();
	const fromId = useId();
	const toId = useId();
	const dateId = useId();
	const paxId = useId();
	const listId = useId();

	const [from, setFrom] = useState(initial?.from ?? "Vadodara");
	const [to, setTo] = useState(initial?.to ?? "Surat");
	const [date, setDate] = useState(initial?.date ?? todayIso());
	const [passengers, setPassengers] = useState(initial?.passengers ?? 1);

	const swap = () => {
		setFrom(to);
		setTo(from);
	};

	const submit = (event: FormEvent) => {
		event.preventDefault();
		navigate({
			search: { date, from, passengers, to },
			to: "/search",
		});
	};

	const isBar = variant === "bar";

	return (
		<form
			className={
				isBar
					? "rounded-2xl border border-ink-200 bg-surface p-3 shadow-card"
					: "rounded-2xl bg-surface p-4 shadow-pop sm:p-5"
			}
			onSubmit={submit}
		>
			<div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end">
				<div className="relative grid gap-3 sm:grid-cols-2 md:col-span-2">
					<Field icon={<PinIcon />} id={fromId} label="From">
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

					<Field icon={<PinIcon />} id={toId} label="To">
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
						aria-label="Swap origin and destination"
						className="absolute top-1/2 left-1/2 hidden h-9 w-9 translate-x-[-50%] -translate-y-1/2 place-items-center rounded-full border border-ink-200 bg-surface text-brand-600 shadow-sm transition hover:rotate-180 hover:border-brand-300 sm:grid"
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
						className="grid shrink-0 place-items-center rounded-xl bg-accent-600 px-6 font-semibold text-white shadow-sm transition hover:bg-accent-700 focus-visible:outline-accent-400"
						type="submit"
					>
						Search
					</button>
				</div>
			</div>

			<datalist id={listId}>
				{CITIES.map((city) => (
					<option key={city} value={city} />
				))}
			</datalist>
		</form>
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
		<div className="flex items-center gap-3 rounded-xl border border-ink-200 bg-ink-50/60 px-3.5 py-2.5 transition focus-within:border-brand-400 focus-within:bg-surface focus-within:ring-2 focus-within:ring-brand-100">
			<span className="text-brand-500">{icon}</span>
			<label className="flex-1" htmlFor={id}>
				<span className="block font-medium text-ink-500 text-xs">{label}</span>
				{children}
			</label>
		</div>
	);
}
