const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const CANCELLATION_CHARGE_BANDS = [
	{ chargeRate: 0.25, label: "0–1 day before: 25% of fare", maxDaysBefore: 1 },
	{ chargeRate: 0.2, label: "2–5 days before: 20% of fare", maxDaysBefore: 5 },
	{
		chargeRate: 0.15,
		label: "6–60 days before: 15% of fare",
		maxDaysBefore: 60,
	},
] as const;

export const CANCELLATION_POLICY_BULLETS = [
	...CANCELLATION_CHARGE_BANDS.map((band) => band.label),
	"Current bookings: no refund",
	"Cancellations prohibited after bus departure",
] as const;

export function cancellationCharge(
	fare: number,
	departureAt: Date,
	now: Date
): number | null {
	const millisecondsBeforeDeparture = departureAt.getTime() - now.getTime();
	if (millisecondsBeforeDeparture < 0) {
		return null;
	}
	const daysBeforeDeparture = Math.ceil(
		millisecondsBeforeDeparture / MS_PER_DAY
	);
	if (daysBeforeDeparture === 0) {
		return fare;
	}
	const band = CANCELLATION_CHARGE_BANDS.find(
		(candidate) => daysBeforeDeparture <= candidate.maxDaysBefore
	);
	return band ? fare * band.chargeRate : 0;
}
