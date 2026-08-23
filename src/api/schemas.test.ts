import * as v from "valibot";
import { describe, expect, it } from "vitest";

import { City } from "#/api/schemas";

describe("api schemas", () => {
	it("resolves the application import alias", () => {
		expect(v.safeParse(City, "Surat").success).toBe(true);
	});
});
