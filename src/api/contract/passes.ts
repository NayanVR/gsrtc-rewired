import * as v from "valibot";
import { base } from "#/api/contract/base";
import { City, Mobile, Pass } from "#/api/schemas";

const PassType = v.picklist(["Daily", "Monthly", "Quarterly", "Student"]);

export const passes = {
	apply: base
		.route({
			method: "POST",
			path: "/passes/apply",
			summary: "New commuter pass",
		})
		.input(
			v.object({
				from: City,
				mobile: Mobile,
				name: v.pipe(v.string(), v.minLength(2)),
				photoRef: v.optional(v.string()),
				to: City,
				type: PassType,
			})
		)
		.output(v.object({ applicationNo: v.string() })),

	renew: base
		.route({ method: "POST", path: "/passes/renew", summary: "Renew pass" })
		.input(v.object({ passNo: v.string() }))
		.output(v.object({ applicationNo: v.string() })),

	status: base
		.route({
			method: "GET",
			path: "/passes/{applicationNo}",
			summary: "Pass status",
		})
		.input(v.object({ applicationNo: v.string() }))
		.output(Pass),
};
