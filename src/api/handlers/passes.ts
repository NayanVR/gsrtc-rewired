import { implement } from "@orpc/server";
import { eq } from "drizzle-orm";
import { appContract } from "#/api/contract";
import { getDb } from "#/db/client";
import { passes } from "#/db/schema";
import { generateApplicationNo } from "#/lib/ids";

const os = implement(appContract);

type PassType = "Daily" | "Monthly" | "Quarterly" | "Student";

// The frozen contract has no academic-term input, so Student uses the same
// one-calendar-month window as a monthly concession pass until that input exists.
const PASS_VALIDITY: Record<PassType, { days?: number; months?: number }> = {
	Daily: { days: 1 },
	Monthly: { months: 1 },
	Quarterly: { months: 3 },
	Student: { months: 1 },
};

function dateString(date: Date): string {
	return date.toISOString().slice(0, 10);
}

function dateFromString(value: string): Date {
	return new Date(`${value}T00:00:00.000Z`);
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

function validToFor(validFrom: Date, type: PassType): Date {
	const duration = PASS_VALIDITY[type];
	if (duration.months) {
		return addCalendarMonths(validFrom, duration.months);
	}
	return new Date(validFrom.getTime() + (duration.days ?? 0) * 86_400_000);
}

function today(): Date {
	return dateFromString(dateString(new Date()));
}

function toPass(pass: typeof passes.$inferSelect) {
	return {
		applicationNo: pass.applicationNo,
		from: pass.from,
		issueLocation: pass.issueLocation,
		status: pass.status,
		to: pass.to,
		type: pass.type,
		validFrom: pass.validFrom,
		validTo: pass.validTo,
	};
}

// photoRef is accepted as an opaque contract field but deliberately not stored
// until this project has an asset store.
const apply = os.passes.apply.handler(async ({ input }) => {
	const validFrom = today();
	const applicationNo = generateApplicationNo();
	// The frozen input does not select a counter. The route origin is the
	// collection point, which keeps the required location meaningful and non-empty.
	const issueLocation = `${input.from} Bus Station`;

	await getDb()
		.insert(passes)
		.values({
			applicationNo,
			from: input.from,
			issueLocation,
			mobile: input.mobile,
			name: input.name,
			to: input.to,
			type: input.type,
			validFrom: dateString(validFrom),
			validTo: dateString(validToFor(validFrom, input.type)),
		});
	return { applicationNo };
});

const renew = os.passes.renew.handler(async ({ input, errors }) => {
	const db = getDb();
	const [existingPass] = await db
		.select()
		.from(passes)
		.where(eq(passes.applicationNo, input.passNo))
		.limit(1);
	if (!existingPass) {
		throw errors.NOT_FOUND();
	}

	const todayDate = today();
	const oldValidTo = dateFromString(existingPass.validTo);
	const validFrom = oldValidTo > todayDate ? oldValidTo : todayDate;
	const applicationNo = generateApplicationNo();

	await db.insert(passes).values({
		applicationNo,
		from: existingPass.from,
		issueLocation: existingPass.issueLocation,
		mobile: existingPass.mobile,
		name: existingPass.name,
		renewedFrom: existingPass.applicationNo,
		to: existingPass.to,
		type: existingPass.type,
		validFrom: dateString(validFrom),
		validTo: dateString(validToFor(validFrom, existingPass.type)),
	});

	return { applicationNo };
});

const status = os.passes.status.handler(async ({ input, errors }) => {
	const [pass] = await getDb()
		.select()
		.from(passes)
		.where(eq(passes.applicationNo, input.applicationNo))
		.limit(1);
	if (!pass) {
		throw errors.NOT_FOUND();
	}
	return toPass(pass);
});

export const passHandlers = { apply, renew, status };
