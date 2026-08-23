import { describe, expect, it } from "vitest";
import {
	formatTrackingAge,
	isTrackingStale,
	TRACKING_STALE_AFTER_MS,
} from "#/lib/tracking-status";

const NOW = new Date("2026-08-22T12:00:00.000Z").getTime();

function updatedBefore(milliseconds: number): string {
	return new Date(NOW - milliseconds).toISOString();
}

describe("tracking freshness", () => {
	it("formats just-updated tracking data", () => {
		expect(formatTrackingAge(updatedBefore(30_000), NOW)).toBe(
			"as of just now"
		);
	});

	it("formats minute-old tracking data", () => {
		expect(formatTrackingAge(updatedBefore(4 * 60_000), NOW)).toBe(
			"as of 4 minutes ago"
		);
	});

	it("formats tracking data older than an hour", () => {
		expect(formatTrackingAge(updatedBefore(75 * 60_000), NOW)).toBe(
			"as of 1 hour ago"
		);
	});

	it("marks data stale only after the named threshold", () => {
		expect(isTrackingStale(updatedBefore(TRACKING_STALE_AFTER_MS), NOW)).toBe(
			false
		);
		expect(
			isTrackingStale(updatedBefore(TRACKING_STALE_AFTER_MS + 1), NOW)
		).toBe(true);
	});
});
