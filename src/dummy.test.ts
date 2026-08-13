import { describe, expect, it } from "vitest";

describe("dummy test", () => {
	it("should pass", () => {
		expect(1 + 1).toBe(2);
	});

	it("should compare strings", () => {
		expect("hello").toBe("hello");
	});

	it("should compare objects", () => {
		expect({ name: "TanStack" }).toEqual({ name: "TanStack" });
	});
});
