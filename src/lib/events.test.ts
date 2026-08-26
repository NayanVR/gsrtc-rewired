import { ORPCError } from "@orpc/server";
import { afterEach, describe, expect, it } from "vitest";
import {
	addEventFields,
	setEventWriterForTests,
	withEvent,
} from "#/lib/events";

const captured: Record<string, unknown>[] = [];

afterEach(() => {
	captured.length = 0;
	setEventWriterForTests();
});

function capture(): void {
	setEventWriterForTests((line) => captured.push(JSON.parse(line)));
}

describe("wide events", () => {
	it("emits one success line", async () => {
		capture();
		await withEvent("test.success", async () => "ok");
		expect(captured).toHaveLength(1);
		expect(captured[0]).toMatchObject({
			event: "test.success",
			outcome: "success",
		});
		expect(captured[0]?.duration_ms).toEqual(expect.any(Number));
	});

	it("emits a typed error and rethrows it", async () => {
		capture();
		const error = new ORPCError("NOT_FOUND", {
			data: { reason: "hold_expired" },
		});
		await expect(
			withEvent("test.failure", () => Promise.reject(error))
		).rejects.toBe(error);
		expect(captured).toHaveLength(1);
		expect(captured[0]).toMatchObject({
			error_code: "NOT_FOUND",
			error_reason: "hold_expired",
			outcome: "error",
		});
	});

	it("keeps fields added in nested asynchronous work", async () => {
		capture();
		await withEvent("test.fields", async () => {
			await Promise.resolve();
			addEventFields({ hold_id: "hold-1", seat_count: 2 });
		});
		expect(captured[0]).toMatchObject({ hold_id: "hold-1", seat_count: 2 });
	});

	it("joins nested events", async () => {
		capture();
		await withEvent("test.outer", async () =>
			withEvent("test.inner", async () => undefined)
		);
		expect(captured).toHaveLength(1);
		expect(captured[0]).toMatchObject({ event: "test.outer" });
	});

	it("drops denied fields without dropping the event", async () => {
		capture();
		await withEvent("test.redaction", () => {
			addEventFields({
				contact_mobile: "9999999999",
				email: "person@example.com",
				passengers: [],
				pnr: "PNR1",
			});
			return Promise.resolve();
		});
		expect(captured[0]).toMatchObject({ pnr: "PNR1" });
		expect(captured[0]).not.toHaveProperty("email");
		expect(captured[0]).not.toHaveProperty("contact_mobile");
		expect(captured[0]).not.toHaveProperty("passengers");
	});

	it("swallows a write failure and ignores fields outside an event", async () => {
		setEventWriterForTests(() => {
			throw new Error("sink unavailable");
		});
		addEventFields({ pnr: "outside" });
		await expect(
			withEvent("test.sink", async () => undefined)
		).resolves.toBeUndefined();
	});
});
