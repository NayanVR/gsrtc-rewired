import { createFileRoute } from "@tanstack/react-router";
import { type FormEvent, useId, useState } from "react";
import { trackJourney } from "#/api/fns";
import type { JourneyProgress, JourneyStop } from "#/api/schemas";
import {
	ArrowRightIcon,
	BusIcon,
	ClockIcon,
	TrackIcon,
} from "#/components/icons";
import { SiteFooter } from "#/components/site-footer";
import { SiteHeader } from "#/components/site-header";
import { Button } from "#/components/ui/button";
import { formatTime } from "#/data/trips";

export const Route = createFileRoute("/track")({ component: TrackPage });

function delayLabel(delayMin: number): string {
	if (delayMin > 0) {
		return `Running ${delayMin} min late`;
	}
	if (delayMin < 0) {
		return `Running ${Math.abs(delayMin)} min early`;
	}
	return "On time";
}

function TrackPage() {
	const inputId = useId();
	const [vehicleNo, setVehicleNo] = useState("");
	const [journey, setJourney] = useState<JourneyProgress | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");

	const load = async (value: string) => {
		const query = value.trim();
		if (!query) {
			return;
		}
		setLoading(true);
		setError("");
		try {
			setJourney(await trackJourney({ data: query }));
		} catch {
			setError("Couldn't fetch this bus right now. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	const submit = (event: FormEvent) => {
		event.preventDefault();
		load(vehicleNo);
	};

	return (
		<>
			<SiteHeader />
			<main className="bg-canvas" id="main">
				<div className="mesh-band relative overflow-hidden">
					<div aria-hidden className="grain" />
					<div className="relative mx-auto max-w-3xl px-4 py-10 text-white sm:px-6">
						<div className="flex items-center gap-3">
							<TrackIcon height={26} width={26} />
							<h1 className="font-bold font-display text-2xl tracking-tight sm:text-3xl">
								Track your bus
							</h1>
						</div>
						<p className="mt-2 text-sm text-white/85">
							Enter the bus / service number to see its stop-by-stop progress
							along the route.
						</p>

						<form
							className="mt-5 flex flex-col gap-3 sm:flex-row"
							onSubmit={submit}
						>
							<label className="sr-only" htmlFor={inputId}>
								Bus or service number
							</label>
							<input
								autoComplete="off"
								className="flex-1 rounded-xl border border-white/20 bg-white/95 px-4 py-3 text-ink-900 outline-none placeholder:text-ink-400 focus-visible:ring-2 focus-visible:ring-white/60"
								id={inputId}
								onChange={(event) => setVehicleNo(event.target.value)}
								placeholder="e.g. GJ-18-Z-1234"
								value={vehicleNo}
							/>
							<Button
								className="shrink-0 bg-white text-brand-700 hover:bg-white/90"
								disabled={loading}
								size="lg"
								type="submit"
							>
								{loading ? "Tracking…" : "Track"}
							</Button>
						</form>
					</div>
				</div>

				<div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
					{error ? (
						<p
							className="rounded-xl border border-danger-500/30 bg-danger-500/10 px-4 py-3 text-danger-500 text-sm"
							role="alert"
						>
							{error}
						</p>
					) : null}

					{journey ? (
						<JourneyBoard journey={journey} onRefresh={() => load(vehicleNo)} />
					) : (
						!error && <EmptyState />
					)}
				</div>
			</main>
			<SiteFooter />
		</>
	);
}

function EmptyState() {
	return (
		<div className="rounded-2xl border border-ink-200 border-dashed bg-surface p-12 text-center">
			<BusIcon className="mx-auto text-ink-300" height={32} width={32} />
			<p className="mt-3 font-semibold text-ink-900">No bus tracked yet</p>
			<p className="mt-1 text-ink-500 text-sm">
				Enter a bus number above to see where it is on its route.
			</p>
		</div>
	);
}

function JourneyBoard({
	journey,
	onRefresh,
}: {
	journey: JourneyProgress;
	onRefresh: () => void;
}) {
	const onTime = journey.delayMin <= 0;
	return (
		<div className="rounded-2xl border border-ink-100 bg-surface p-5 shadow-card sm:p-6">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div>
					<div className="flex items-center gap-2">
						<span className="rounded-full bg-brand-50 px-2.5 py-0.5 font-mono font-semibold text-brand-700 text-xs">
							{journey.vehicleNo}
						</span>
						<span
							className={`rounded-full px-2.5 py-0.5 font-semibold text-xs ${
								onTime
									? "bg-success-50 text-success-700"
									: "bg-saffron-50 text-saffron-700"
							}`}
						>
							{delayLabel(journey.delayMin)}
						</span>
					</div>
					<p className="mt-2 font-bold font-display text-ink-900 text-lg">
						{journey.from}{" "}
						<ArrowRightIcon
							className="inline text-saffron-500"
							height={15}
							width={15}
						/>{" "}
						{journey.to}
					</p>
					{journey.nextStop ? (
						<p className="mt-0.5 text-ink-500 text-sm">
							Next stop:{" "}
							<span className="font-semibold text-ink-700">
								{journey.nextStop}
							</span>
						</p>
					) : null}
				</div>
				<Button onClick={onRefresh} size="sm" variant="secondary">
					Refresh
				</Button>
			</div>

			<ol className="mt-6">
				{journey.stops.map((stop, index) => (
					<StopRow
						isLast={index === journey.stops.length - 1}
						key={stop.name}
						stop={stop}
					/>
				))}
			</ol>

			<p className="mt-4 text-ink-400 text-xs">
				Last updated {formatTime(journey.lastUpdated)} · times are scheduled
			</p>
		</div>
	);
}

function StopRow({ stop, isLast }: { stop: JourneyStop; isLast: boolean }) {
	const departed = stop.status === "departed";
	const current = stop.status === "current";

	let node = "border-ink-300 bg-surface";
	if (departed) {
		node = "border-transparent bg-brand-600";
	} else if (current) {
		node = "border-saffron-500 bg-saffron-500";
	}

	let detail = `Scheduled ${formatTime(stop.scheduled)}`;
	if (current && stop.etaMin !== undefined) {
		detail =
			stop.etaMin === 0 ? "Arriving now" : `Arriving in ${stop.etaMin} min`;
	} else if (departed) {
		detail = `Departed · ${formatTime(stop.scheduled)}`;
	}

	return (
		<li className="flex gap-4">
			<div className="flex flex-col items-center">
				<span
					aria-hidden
					className={`mt-1 h-3.5 w-3.5 rounded-full border-2 ${node} ${
						current ? "ring-4 ring-saffron-200 motion-safe:animate-pulse" : ""
					}`}
				/>
				{isLast ? null : (
					<span
						aria-hidden
						className={`w-0.5 flex-1 ${departed ? "bg-brand-500" : "bg-ink-200"}`}
					/>
				)}
			</div>
			<div className={`pb-6 ${isLast ? "pb-0" : ""}`}>
				<p
					className={`font-semibold ${
						current ? "text-saffron-700" : "text-ink-900"
					}`}
				>
					{stop.name}
				</p>
				<p className="mt-0.5 inline-flex items-center gap-1 text-ink-500 text-sm">
					<ClockIcon height={12} width={12} />
					{detail}
				</p>
			</div>
		</li>
	);
}
