import { captureMessage } from "@sentry/tanstackstart-react";
import { createFileRoute } from "@tanstack/react-router";
import {
	processVerifiedDodoWebhook,
	type VerifiedDodoWebhook,
} from "#/api/services/payments";
import { dodo } from "#/lib/dodo";

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toStringRecord(value: unknown): Record<string, string> {
	if (!isRecord(value)) {
		return {};
	}
	return Object.fromEntries(
		Object.entries(value).filter(
			(entry): entry is [string, string] => typeof entry[1] === "string"
		)
	);
}

function toRecord(value: unknown): Record<string, unknown> {
	return isRecord(value) ? value : {};
}

function parsePayload(raw: string): Record<string, unknown> {
	try {
		const payload: unknown = JSON.parse(raw);
		return isRecord(payload) ? payload : { raw };
	} catch {
		return { raw };
	}
}

function getRequiredHeader(request: Request, name: string): string | null {
	return request.headers.get(name);
}

export const Route = createFileRoute("/api/payments/dodo/webhook")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				const raw = await request.text();
				const webhookId = getRequiredHeader(request, "webhook-id");
				const webhookSignature = getRequiredHeader(
					request,
					"webhook-signature"
				);
				const webhookTimestamp = getRequiredHeader(
					request,
					"webhook-timestamp"
				);
				if (!(webhookId && webhookSignature && webhookTimestamp)) {
					captureMessage(
						"Dodo webhook is missing a signature header.",
						"warning"
					);
					return new Response("Unauthorized", { status: 401 });
				}
				let event: ReturnType<typeof dodo.webhooks.unwrap>;
				try {
					event = dodo.webhooks.unwrap(raw, {
						headers: {
							"webhook-id": webhookId,
							"webhook-signature": webhookSignature,
							"webhook-timestamp": webhookTimestamp,
						},
					});
				} catch (error) {
					captureMessage(
						`Dodo webhook signature verification failed: ${error instanceof Error ? error.message : "unknown error"}`,
						"warning"
					);
					return new Response("Unauthorized", { status: 401 });
				}
				const data = toRecord(event.data);
				const webhook: VerifiedDodoWebhook = {
					eventType: event.type,
					payload: parsePayload(raw),
					payment: {
						failureCode:
							typeof data.failure_code === "string"
								? data.failure_code
								: undefined,
						failureMessage:
							typeof data.failure_message === "string"
								? data.failure_message
								: undefined,
						metadata: toStringRecord(data.metadata),
						paymentId:
							typeof data.payment_id === "string" ? data.payment_id : "",
						paymentMethod:
							typeof data.payment_method === "string"
								? data.payment_method
								: undefined,
						totalAmount:
							typeof data.total_amount === "number"
								? data.total_amount
								: undefined,
					},
					webhookId,
				};
				await processVerifiedDodoWebhook(webhook);
				return new Response(null, { status: 200 });
			},
		},
	},
});
