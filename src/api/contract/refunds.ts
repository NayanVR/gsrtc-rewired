import * as v from "valibot";
import { base } from "#/api/contract/base";
import { Mobile, RefundStatus, TicketNo } from "#/api/schemas";

export const refunds = {
	complaint: base
		.route({
			method: "POST",
			path: "/refunds/complaint",
			summary: "Raise complaint",
		})
		.input(
			v.object({
				email: v.pipe(v.string(), v.email()),
				message: v.pipe(v.string(), v.minLength(10)),
				mobile: Mobile,
				ticketNo: TicketNo,
			})
		)
		.output(v.object({ complaintId: v.string() })),
	status: base
		.route({
			method: "GET",
			path: "/refunds/status",
			summary: "Refund enquiry",
		})
		.input(v.object({ mobile: Mobile, ref: v.string() }))
		.output(RefundStatus),
};
