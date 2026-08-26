import { AsyncLocalStorage } from "node:async_hooks";
import { getActiveSpan } from "@sentry/tanstackstart-react";

type EventFields = Record<string, unknown>;
type EventWriter = (line: string) => void;

interface EventScope {
	fields: EventFields;
}

const eventStorage = new AsyncLocalStorage<EventScope>();
const DENIED_KEYS = new Set([
	"contact_email",
	"contact_mobile",
	"email",
	"mobile",
	"name",
	"otp",
	"pan",
	"passengers",
	"session",
	"session_token",
	"token",
]);

let writeEvent: EventWriter = (line) => process.stdout.write(`${line}\n`);

// ponytail: 100% sampling; sample successes if line volume becomes a cost
// ponytail: synchronous stdout write; batch behind a queue if it shows in p99

function safeFields(fields: EventFields): EventFields {
	return Object.fromEntries(
		Object.entries(fields).filter(([key]) => !DENIED_KEYS.has(key))
	);
}

function currentTraceId(): string {
	try {
		return getActiveSpan()?.spanContext().traceId ?? crypto.randomUUID();
	} catch {
		return crypto.randomUUID();
	}
}

function errorFields(error: unknown, traceId: string): EventFields {
	if (typeof error !== "object" || error === null) {
		return {
			error_code: "INTERNAL",
			error_message: "Unknown thrown value",
			trace_id: traceId,
		};
	}
	const value = error as Record<string, unknown>;
	const data =
		typeof value.data === "object" && value.data !== null
			? (value.data as Record<string, unknown>)
			: undefined;
	const code = typeof value.code === "string" ? value.code : "INTERNAL";
	const reason = typeof data?.reason === "string" ? data.reason : undefined;

	return {
		error_code: code,
		...(reason ? { error_reason: reason } : {}),
		...(code === "INTERNAL" && typeof value.message === "string"
			? { error_message: value.message }
			: {}),
		trace_id: traceId,
	};
}

function emit(fields: EventFields): void {
	try {
		writeEvent(JSON.stringify(safeFields(fields)));
	} catch {
		// An unavailable log sink must never change application behaviour.
	}
}

export function addEventFields(fields: EventFields): void {
	const scope = eventStorage.getStore();
	if (!scope) {
		return;
	}
	Object.assign(scope.fields, safeFields(fields));
}

export function getEventTraceId(): string | undefined {
	const traceId = eventStorage.getStore()?.fields.trace_id;
	return typeof traceId === "string" ? traceId : undefined;
}

export function withEvent<T>(name: string, fn: () => Promise<T>): Promise<T> {
	const parent = eventStorage.getStore();
	if (parent) {
		return fn();
	}

	const startedAt = performance.now();
	const traceId = currentTraceId();
	const scope: EventScope = { fields: { event: name, trace_id: traceId } };
	return eventStorage.run(scope, async () => {
		try {
			const result = await fn();
			emit({
				...scope.fields,
				duration_ms: Math.round(performance.now() - startedAt),
				env: process.env.NODE_ENV,
				outcome: "success",
				ts: new Date().toISOString(),
			});
			return result;
		} catch (error) {
			emit({
				...scope.fields,
				duration_ms: Math.round(performance.now() - startedAt),
				env: process.env.NODE_ENV,
				...errorFields(error, traceId),
				outcome: "error",
				ts: new Date().toISOString(),
			});
			throw error;
		}
	});
}

/** Test-only seam: captures JSON lines without writing to stdout. */
export function setEventWriterForTests(writer?: EventWriter): void {
	writeEvent = writer ?? ((line) => process.stdout.write(`${line}\n`));
}
