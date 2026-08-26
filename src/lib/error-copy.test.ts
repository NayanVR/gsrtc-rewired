import { describe, expect, it } from "vitest";
import { ERROR_REASONS } from "#/api/contract/base";
import { ERROR_COPY, toAppError } from "#/lib/error-copy";

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
});
