import * as v from "valibot";
import { base } from "#/api/contract/base";
import { Booking, DateStr, Mobile, Rupees, TicketNo } from "#/api/schemas";

export const tickets = {
	cancel: base
		.route({
			method: "POST",
			path: "/tickets/cancel",
			summary: "Cancel ticket",
		})
		.input(v.object({ mobile: Mobile, ticketNo: TicketNo }))
		.output(
			v.object({
				refundAmount: Rupees,
				status: v.picklist(["cancelled", "cancellation_pending"]),
			})
		),

	history: base
		.route({
			method: "GET",
			path: "/tickets/history",
			summary: "Booking history",
		})
		.input(v.object({ mobile: Mobile }))
		.output(v.object({ bookings: v.array(Booking) })),

	print: base
		.route({
			method: "POST",
			path: "/tickets/print",
			summary: "Reprint / resend",
		})
		.input(
			v.object({
				channel: v.picklist(["sms", "email"]),
				mobile: Mobile,
				ticketNo: TicketNo,
			})
		)
		.output(v.object({ sent: v.boolean() })),

	reschedule: base
		.route({
			method: "POST",
			path: "/tickets/reschedule",
			summary: "Reschedule",
		})
		.input(
			v.object({
				mobile: Mobile,
				newDate: DateStr,
				newTripId: v.optional(v.string()),
				ticketNo: TicketNo,
			})
		)
		.output(Booking),

	waitingListStatus: base
		.route({
			method: "GET",
			path: "/tickets/waiting-list",
			summary: "WL status",
		})
		.input(v.object({ ticketNo: TicketNo }))
		.output(
			v.object({
				confirmedSeat: v.optional(v.string()),
				status: v.picklist(["waiting", "confirmed", "cancelled"]),
			})
		),
};
