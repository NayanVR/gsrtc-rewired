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
import { toAppError } from "#/lib/error-copy";
import { formatTrackingAge, isTrackingStale } from "#/lib/tracking-status";

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
		} catch (caughtError) {
			const appError = toAppError(caughtError);
			setError(`${appError.detail} ${appError.action}`);
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
	const stale = isTrackingStale(journey.lastUpdated);
	const freshness = formatTrackingAge(journey.lastUpdated);
	const delay = delayLabel(journey.delayMin);
	const total = journey.stops.length;
	const departed = journey.stops.filter((s) => s.status === "departed").length;
	const currentStop = journey.stops.find((s) => s.status === "current");
	const progressPct = Math.round((departed / total) * 100);

	return (
		<div className="overflow-hidden rounded-2xl border border-ink-100 bg-surface shadow-card">
			<div className="flex flex-wrap items-start justify-between gap-3 p-5 sm:p-6">
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
							{delay}
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
				</div>
				<Button onClick={onRefresh} size="sm" variant="secondary">
					Refresh
				</Button>
			</div>
			<p
				aria-live="polite"
				className={`border-y px-5 py-3 text-sm sm:px-6 ${
					stale
						? "border-saffron-200 bg-saffron-50 text-saffron-800"
						: "border-ink-100 bg-canvas text-ink-600"
				}`}
				role="status"
			>
				{stale
					? `Tracking data may be out of date — ${freshness}.`
					: `Tracking data is current — ${freshness}.`}{" "}
				{delay}.
			</p>

			{/* Live next-stop banner + overall progress */}
			{currentStop ? (
				<div className="border-saffron-100 border-y bg-saffron-50/60 px-5 py-4 sm:px-6">
					<div className="flex items-center justify-between gap-3">
						<div className="inline-flex items-center gap-2">
							<span
								aria-hidden
								className="h-2 w-2 rounded-full bg-saffron-500 motion-safe:animate-pulse"
							/>
							<span className="text-ink-600 text-sm">
								Next stop{" "}
								<span className="font-semibold text-ink-900">
									{currentStop.name}
								</span>
							</span>
						</div>
						<span className="rounded-full bg-saffron-500 px-3 py-1 font-semibold text-white text-xs">
							{etaLabel(currentStop.etaMin)}
						</span>
					</div>
					<div className="mt-3 flex items-center gap-3">
						<div
							aria-hidden
							className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-100"
						>
							<div
								className="h-full rounded-full bg-gradient-to-r from-brand-500 to-saffron-400"
								style={{ width: `${progressPct}%` }}
							/>
						</div>
						<span className="shrink-0 text-ink-500 text-xs tabular-nums">
							{departed} of {total} stops
						</span>
					</div>
				</div>
			) : null}

			<ol className="p-5 sm:p-6">
				{journey.stops.map((stop, index) => (
					<StopRow
						isLast={index === total - 1}
						key={stop.name}
						nextIsCurrent={journey.stops[index + 1]?.status === "current"}
						stop={stop}
					/>
				))}
			</ol>

			<p className="border-ink-100 border-t px-5 py-3 text-ink-400 text-xs sm:px-6">
				Times are scheduled
			</p>
		</div>
	);
}

function etaLabel(etaMin: number | undefined): string {
	if (etaMin === undefined) {
		return "En route";
	}
	return etaMin === 0 ? "Arriving now" : `${etaMin} min away`;
}

// The line between two stops. On the in-transit leg it carries a riding bus
// that toggles the leg's minor stops when it has any.
function Connector({
	departed,
	transit,
	expanded,
	onToggle,
}: {
	departed: boolean;
	transit: boolean;
	expanded: boolean;
	onToggle: (() => void) | null;
}) {
	if (transit) {
		const marker =
			"-translate-x-1/2 -translate-y-1/2 absolute top-1/2 left-1/2 flex h-6 w-6 items-center justify-center rounded-full bg-surface shadow-card ring-1 ring-saffron-200";
		return (
			<span className="relative w-0.5 flex-1 bg-gradient-to-b from-brand-500 to-saffron-400">
				{onToggle ? (
					<button
						aria-expanded={expanded}
						aria-label={
							expanded ? "Hide stops on this leg" : "Show stops on this leg"
						}
						className={`${marker} transition hover:ring-saffron-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron-500`}
						onClick={onToggle}
						type="button"
					>
						<BusIcon className="text-saffron-600" height={13} width={13} />
					</button>
				) : (
					<span aria-hidden className={marker}>
						<BusIcon className="text-saffron-600" height={13} width={13} />
					</span>
				)}
			</span>
		);
	}
	return (
		<span
			aria-hidden
			className={`w-0.5 flex-1 ${departed ? "bg-brand-500" : "bg-ink-200"}`}
		/>
	);
}

function StopRow({
	stop,
	isLast,
	nextIsCurrent,
}: {
	stop: JourneyStop;
	isLast: boolean;
	nextIsCurrent: boolean;
}) {
	const [expanded, setExpanded] = useState(false);
	const departed = stop.status === "departed";
	const current = stop.status === "current";
	const legStops = nextIsCurrent ? (stop.subStops ?? []) : [];

	let node = "border-ink-300 bg-surface";
	if (departed) {
		node = "border-transparent bg-brand-600";
	} else if (current) {
		node = "border-saffron-500 bg-saffron-500";
	}

	let detail = `Scheduled ${formatTime(stop.scheduled)}`;
	if (current) {
		detail = etaLabel(stop.etaMin);
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
					<Connector
						departed={departed}
						expanded={expanded}
						onToggle={
							legStops.length ? () => setExpanded((prev) => !prev) : null
						}
						transit={nextIsCurrent}
					/>
				)}
			</div>
			<div className={`pb-6 ${isLast ? "pb-0" : ""}`}>
				<p
					className={`font-semibold ${
						current ? "text-saffron-700" : "text-ink-900"
					} ${departed ? "text-ink-500" : ""}`}
				>
					{stop.name}
				</p>
				<p className="mt-0.5 inline-flex items-center gap-1 text-ink-500 text-sm">
					<ClockIcon height={12} width={12} />
					{detail}
				</p>
				{legStops.length && !expanded ? (
					<button
						className="mt-2.5 block text-saffron-700 text-xs underline-offset-2 hover:underline"
						onClick={() => setExpanded(true)}
						type="button"
					>
						{legStops.length} stops on the way ↓
					</button>
				) : null}
				{expanded && legStops.length ? (
					<ul className="mt-2 space-y-1.5 border-ink-100 border-l pl-3">
						{legStops.map((name) => (
							<li
								className="flex items-center gap-2 text-ink-500 text-xs"
								key={name}
							>
								<span
									aria-hidden
									className="h-1.5 w-1.5 rounded-full bg-ink-300"
								/>
								{name}
							</li>
						))}
					</ul>
				) : null}
			</div>
		</li>
	);
}
