import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { api } from "#/api/server";
import { getDb } from "#/db/client";
import { passes } from "#/db/schema";

const TEST_MOBILE = "6000000009";

async function clearTestPasses(): Promise<void> {
	await getDb().delete(passes).where(eq(passes.mobile, TEST_MOBILE));
}

function applyTestPass(type: "Daily" | "Monthly" | "Quarterly" | "Student") {
	return api.passes.apply({
		from: "Ahmedabad",
		mobile: TEST_MOBILE,
		name: "Pass Test User",
		to: "Vadodara",
		type,
	});
}

function dateString(date: Date): string {
	return date.toISOString().slice(0, 10);
}

function addCalendarMonths(date: Date, months: number): Date {
	const year = date.getUTCFullYear();
	const month = date.getUTCMonth() + months;
	const day = date.getUTCDate();
	const lastDayOfTargetMonth = new Date(
		Date.UTC(year, month + 1, 0)
	).getUTCDate();
	return new Date(Date.UTC(year, month, Math.min(day, lastDayOfTargetMonth)));
}

function validToFor(type: "Daily" | "Monthly" | "Quarterly" | "Student") {
	const validFrom = new Date(`${dateString(new Date())}T00:00:00.000Z`);
	if (type === "Daily") {
		return dateString(new Date(validFrom.getTime() + 86_400_000));
	}
	return dateString(addCalendarMonths(validFrom, type === "Quarterly" ? 3 : 1));
}

describe("passes", () => {
	beforeEach(async () => {
		await clearTestPasses();
	});

	afterEach(async () => {
		await clearTestPasses();
	});

	it.each(["Daily", "Monthly", "Quarterly", "Student"] as const)(
		"sets %s validity from the named duration",
		async (type) => {
			const { applicationNo } = await applyTestPass(type);

			const pass = await api.passes.status({ applicationNo });

			expect(pass).toMatchObject({
				applicationNo,
				issueLocation: "Ahmedabad Bus Station",
				validFrom: dateString(new Date()),
				validTo: validToFor(type),
			});
			expect(pass.issueLocation).not.toBe("");
		}
	);

	it("renews from an active pass's validTo and hides the renewal chain", async () => {
		const original = await applyTestPass("Monthly");
		const renewal = await api.passes.renew({ passNo: original.applicationNo });

		const renewedPass = await api.passes.status({
			applicationNo: renewal.applicationNo,
		});
		const [storedRenewal] = await getDb()
			.select()
			.from(passes)
			.where(eq(passes.applicationNo, renewal.applicationNo));

		expect(renewedPass).toMatchObject({
			validFrom: validToFor("Monthly"),
			validTo: dateString(
				addCalendarMonths(new Date(`${validToFor("Monthly")}T00:00:00.000Z`), 1)
			),
		});
		expect(renewedPass).not.toHaveProperty("renewedFrom");
		expect(storedRenewal?.renewedFrom).toBe(original.applicationNo);
	});

	it("returns NOT_FOUND for unknown status and renewal requests", async () => {
		await expect(
			api.passes.status({ applicationNo: "PASSUNKNOWN" })
		).rejects.toMatchObject({ code: "NOT_FOUND" });
		await expect(
			api.passes.renew({ passNo: "PASSUNKNOWN" })
		).rejects.toMatchObject({ code: "NOT_FOUND" });
	});
});
