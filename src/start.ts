import {
	init,
	sentryGlobalFunctionMiddleware,
	sentryGlobalRequestMiddleware,
} from "@sentry/tanstackstart-react";
import { createStart } from "@tanstack/react-start";

// Error + performance monitoring. This start entry is evaluated in both the
// browser and the SSR/server bundle, so a single guarded init() wires Sentry on
// both sides. Without VITE_SENTRY_DSN set, init() is a no-op — safe to ship
// unconfigured; drop a DSN in .env to switch it on.
const dsn = import.meta.env.VITE_SENTRY_DSN;

if (dsn) {
	init({
		dsn,
		environment: import.meta.env.MODE,
		sendDefaultPii: false, // migration plan: keep PII out of the new layer
		tracesSampleRate: 1,
	});
}

// Global middleware instruments every server function + SSR request for tracing
// and error capture — no per-handler wiring needed.
export const startInstance = createStart(() => ({
	functionMiddleware: [sentryGlobalFunctionMiddleware],
	requestMiddleware: [sentryGlobalRequestMiddleware],
}));
