import * as v from "valibot";
import { base } from "#/api/contract/base";
import { Mobile, Rupees, Session } from "#/api/schemas";

export const agents = {
	allotment: base
		.route({
			method: "GET",
			path: "/agents/allotment",
			summary: "Seat allotment",
		})
		.input(v.object({ agentCode: v.string() }))
		.output(v.object({ routes: v.array(v.string()), seats: v.number() })),

	eTopStatus: base
		.route({ method: "GET", path: "/agents/etop", summary: "E-Top status" })
		.input(v.object({ transactionId: v.string() }))
		.output(
			v.object({
				amount: Rupees,
				status: v.picklist(["success", "pending", "failed"]),
			})
		),
	login: base
		.route({ method: "POST", path: "/agents/login", summary: "Agent login" })
		.input(v.object({ agentId: v.string(), password: v.string() }))
		.output(Session),

	register: base
		.route({
			method: "POST",
			path: "/agents/register",
			summary: "Agent signup",
		})
		.input(
			v.object({
				division: v.string(),
				email: v.pipe(v.string(), v.email()),
				mobile: Mobile,
				name: v.pipe(v.string(), v.minLength(2)),
				pan: v.pipe(v.string(), v.regex(/^[A-Z]{5}\d{4}[A-Z]$/, "Invalid PAN")),
			})
		)
		.output(v.object({ applicationNo: v.string() })),
};
