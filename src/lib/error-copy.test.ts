import { describe, expect, it } from "vitest";
import { ERROR_REASONS } from "#/api/contract/base";
import {
	ERROR_COPY,
	ERROR_REASON_FIELDS,
	errorFieldForReason,
	toAppError,
} from "#/lib/error-copy";

describe("error copy", () => {
	it("covers every reason with an actionable response", () => {
		for (const reason of ERROR_REASONS) {
			expect(ERROR_COPY[reason].action).not.toBe("");
		}
	});

	it("uses internal copy without exposing a server message", () => {
		const error = toAppError({
			code: "UNRECOGNISED",
			data: { traceId: "trace-123" },
			message: "secret rejected input",
		});
		expect(error).toMatchObject({
			code: "UNRECOGNISED",
			title: ERROR_COPY.INTERNAL.title,
			traceId: "trace-123",
		});
		expect(JSON.stringify(error)).not.toContain("secret rejected input");
	});

	it("maps a specific hold failure instead of generic not found", () => {
		expect(
			toAppError({ code: "NOT_FOUND", data: { reason: "hold_expired" } }).title
		).toBe(ERROR_COPY.hold_expired.title);
	});

	it("maps only field-specific reasons to fields", () => {
		const mappedReasons = new Set(Object.keys(ERROR_REASON_FIELDS));
		for (const [reason, field] of Object.entries(ERROR_REASON_FIELDS)) {
			expect(field).not.toBe("");
			expect(
				errorFieldForReason(reason as keyof typeof ERROR_REASON_FIELDS)
			).toBe(field);
		}
		for (const reason of ERROR_REASONS) {
			if (!mappedReasons.has(reason)) {
				expect(errorFieldForReason(reason)).toBeUndefined();
			}
		}
	});
});
