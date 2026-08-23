import { count, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { api } from "#/api/server";
import { getDb } from "#/db/client";
import { pageForms } from "#/db/schema";

describe("content page forms", () => {
	it("serves the seeded commuter-pass form from the database", async () => {
		const page = await api.content.page({ slug: "new-commuter-bus-pass" });

		expect(page?.form).toEqual({
			fields: expect.arrayContaining([
				expect.objectContaining({ name: "mobile", type: "tel" }),
				expect.objectContaining({
					name: "type",
					options: ["Daily", "Monthly", "Quarterly", "Student"],
					type: "select",
				}),
			]),
			intro: expect.stringContaining("commuter bus pass"),
			submit: "Apply for pass",
		});
	});

	it("keeps external hand-offs in the seeded form configuration", async () => {
		const page = await api.content.page({ slug: "unity-booking" });

		expect(page?.form?.external).toBe(
			"https://www.soutickets.in/#/gsrtc-booking"
		);
	});

	it("contains every migrated form definition", async () => {
		const [result] = await getDb().select({ count: count() }).from(pageForms);
		expect(result?.count).toBe(14);

		const [passForm] = await getDb()
			.select({ slug: pageForms.slug })
			.from(pageForms)
			.where(eq(pageForms.slug, "new-commuter-bus-pass"));
		expect(passForm?.slug).toBe("new-commuter-bus-pass");
	});
});
