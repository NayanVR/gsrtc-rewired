import { reconcileExpiredPayments } from "#/api/services/payments";

const incidents = await reconcileExpiredPayments();
for (const incident of incidents) {
	console.error(
		JSON.stringify({
			amountPaise: incident.amountPaise,
			dodoPaymentId: incident.dodoPaymentId,
			id: incident.id,
			incidentReason: incident.incidentReason,
			purpose: incident.purpose,
			status: incident.status,
		})
	);
}

if (incidents.length > 0) {
	process.exitCode = 1;
}
