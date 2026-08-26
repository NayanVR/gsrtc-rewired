import { reconcileExpiredPayments } from "#/api/services/payments";
import { addEventFields, withEvent } from "#/lib/events";

const incidents = await withEvent("payment_reconcile_sweep", async () => {
	const found = await reconcileExpiredPayments();
	addEventFields({
		examined: found.length,
		incidents: found.length,
		resolved: 0,
	});
	return found;
});

await Promise.all(
	incidents.map((incident) =>
		withEvent("payment_reconcile", () => {
			addEventFields({
				amount_paise: incident.amountPaise,
				dodo_payment_id: incident.dodoPaymentId,
				incident_reason: incident.incidentReason,
				payment_intent_id: incident.id,
				payment_purpose: incident.purpose,
				payment_status: incident.status,
			});
			return Promise.resolve();
		})
	)
);

if (incidents.length > 0) {
	process.exitCode = 1;
}
