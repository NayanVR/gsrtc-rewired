const MS_PER_MINUTE = 60_000;
const MINUTES_PER_HOUR = 60;

export const TRACKING_STALE_AFTER_MS = 5 * MS_PER_MINUTE;

export function formatTrackingAge(
	lastUpdated: string,
	now = Date.now()
): string {
	const ageMs = Math.max(0, now - new Date(lastUpdated).getTime());
	const ageMinutes = Math.floor(ageMs / MS_PER_MINUTE);
	if (ageMinutes === 0) {
		return "as of just now";
	}
	if (ageMinutes < MINUTES_PER_HOUR) {
		return `as of ${ageMinutes} ${ageMinutes === 1 ? "minute" : "minutes"} ago`;
	}
	const ageHours = Math.floor(ageMinutes / MINUTES_PER_HOUR);
	return `as of ${ageHours} ${ageHours === 1 ? "hour" : "hours"} ago`;
}

export function isTrackingStale(
	lastUpdated: string,
	now = Date.now()
): boolean {
	return now - new Date(lastUpdated).getTime() > TRACKING_STALE_AFTER_MS;
}
