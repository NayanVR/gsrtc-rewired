import { TrophyArt } from "#/components/artwork";
import { StarIcon } from "#/components/icons";

const ACHIEVEMENT = [
	{ revenue: "₹1.53 Cr", seats: 74_368, year: "2018" },
	{ revenue: "₹1.80 Cr", seats: 94_539, year: "2021" },
	{ revenue: "₹2.10 Cr", seats: 114_880, year: "2022" },
	{ revenue: "₹2.98 Cr", seats: 132_177, year: "2023" },
	{ revenue: "₹3.16 Cr", seats: 141_468, year: "2024" },
	{ revenue: "₹3.19 Cr", seats: 133_043, year: "2025" },
] as const;

const PEAK_SEATS = 141_468;
const MAX_BAR_PX = 120;
const MIN_BAR_PX = 20;

export function Milestone() {
	return (
		<section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
			<div className="grid gap-6 rounded-3xl border border-ink-100 bg-surface p-6 shadow-card sm:p-8 lg:grid-cols-[1fr_1.3fr] lg:items-center">
				<div>
					<TrophyArt className="mb-3 h-10 w-10" />
					<span className="inline-flex items-center gap-2 rounded-full bg-saffron-50 px-3 py-1 font-semibold text-saffron-700 text-xs">
						<StarIcon height={13} width={13} />
						New milestone · 24 October 2025
					</span>
					<h2 className="mt-3 font-bold font-display text-2xl text-ink-900 tracking-tight">
						A record number of seats booked, and revenue generated.
					</h2>
					<p className="mt-2 text-ink-500 leading-relaxed">
						GSRTC OPRS broke its own single-day record. Yearly seats booked
						through the online portal:
					</p>
				</div>

				<div className="flex items-end gap-3">
					{ACHIEVEMENT.map((row) => {
						const height = Math.round((row.seats / PEAK_SEATS) * MAX_BAR_PX);
						const isPeak = row.year === "2025";
						return (
							<div
								className="flex flex-1 flex-col items-center gap-2"
								key={row.year}
							>
								<span className="font-semibold text-[11px] text-ink-500">
									{(row.seats / 1000).toFixed(0)}k
								</span>
								<div
									className={`w-full rounded-t-lg ${
										isPeak ? "gradient-surface" : "bg-ink-100"
									}`}
									style={{ height: `${Math.max(height, MIN_BAR_PX)}px` }}
								/>
								<span className="text-[11px] text-ink-500">{row.year}</span>
								<span className="text-[10px] text-ink-400">{row.revenue}</span>
							</div>
						);
					})}
				</div>
			</div>
		</section>
	);
}
