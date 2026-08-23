import { implement } from "@orpc/server";
import { and, eq, gte } from "drizzle-orm";
import { appContract } from "#/api/contract";
import { getDb } from "#/db/client";
import { bookings, refundComplaints, refunds } from "#/db/schema";
import { generateComplaintId } from "#/lib/ids";

const os = implement(appContract);
const COMPLAINT_RATE_LIMIT = 3;
const COMPLAINT_RATE_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000;

const status = os.refunds.status.handler(async ({ input, errors }) => {
	const [refund] = await getDb()
		.select()
		.from(refunds)
		.where(and(eq(refunds.mobile, input.mobile), eq(refunds.ref, input.ref)))
		.limit(1);
	if (!refund) {
		throw errors.NOT_FOUND();
	}
	return {
		amount: Number(refund.amount),
		expectedBy: refund.expectedBy ?? undefined,
		ref: refund.ref,
		status: refund.status,
	};
});

const complaint = os.refunds.complaint.handler(async ({ input, errors }) => {
	const [booking] = await getDb()
		.select({ pnr: bookings.pnr })
		.from(bookings)
		.where(
			and(
				eq(bookings.contactMobile, input.mobile),
				eq(bookings.pnr, input.ticketNo)
			)
		)
		.limit(1);
	if (!booking) {
		throw errors.NOT_FOUND();
	}

	const earliestAllowedComplaint = new Date(
		Date.now() - COMPLAINT_RATE_LIMIT_WINDOW_MS
	);
	const recentComplaints = await getDb()
		.select({ id: refundComplaints.id })
		.from(refundComplaints)
		.where(
			and(
				eq(refundComplaints.mobile, input.mobile),
				gte(refundComplaints.createdAt, earliestAllowedComplaint)
			)
		);
	if (recentComplaints.length >= COMPLAINT_RATE_LIMIT) {
		throw errors.RATE_LIMITED();
	}

	const complaintId = generateComplaintId();
	await getDb().insert(refundComplaints).values({
		email: input.email,
		id: complaintId,
		message: input.message,
		mobile: input.mobile,
		ticketNo: booking.pnr,
	});
	return { complaintId };
});

export const refundHandlers = { complaint, status };
