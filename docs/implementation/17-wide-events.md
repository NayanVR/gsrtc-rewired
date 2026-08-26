# 17 — Wide events & error handling

**Status:** done
**Depends on:** 16
**Phase:** 0
**Pain point:** 05, 06

## Goal

One failure, two audiences, **one taxonomy**:

- An **operator** must be able to answer "what happened?" from a single
  queryable line — without adding logging and waiting for it to recur.
- A **user** must be told what went wrong and *what to do next* — never
  "We could not process this request. Try again."

These are the same problem seen from two ends, and the plan treats them as
one because they share a single field. Splitting them produces two
vocabularies that drift.

Two governing rules:

> **One unit of work produces exactly one line.** To record something else
> about it, add a *field*. Never a second line.

> **Every thrown error names a specific reason.** That reason is what the
> operator greps and what selects the user's copy.

## Current state (verified)

### Observability is exception-only

- `src/api/services/payments.ts` — 4 `captureException` calls (`:416`,
  `:439`, `:659`); `src/routes/api/payments/dodo/webhook.ts` — 2
  `captureMessage` (`:56`, `:72`).
- `src/start.ts:14` — Sentry `init()` guarded by `VITE_SENTRY_DSN` at **build
  time**. No DSN baked in ⇒ every capture above is a silent no-op.
- **There is no logging.** `grep -rn "console\." src/` returns nothing.
- `src/api/server.ts:24` already passes `interceptors: [...]` to
  `createRouterClient` — the seam exists and is in use.
- `biome.json` `files.includes` covers `**/src/**/*` but not `scripts/`.

### Errors are specific on paper and generic in practice

`src/api/contract/base.ts:10` **already declares** an error payload:

```ts
data: v.optional(v.object({ reason: v.optional(v.string()) }))
```

Of **61 throw sites, exactly 2 populate it** (`payments.ts:286`, `:352`):

| thrown | count | carrying a reason |
|---|---|---|
| `errors.NOT_FOUND()` | 21 | 0 |
| `errors.CONFLICT()` | 14 | 0 |
| `errors.PAYMENT_FAILED()` | 10 | 2 |
| `errors.RATE_LIMITED()` | 3 | 0 |
| `errors.UNAUTHORIZED()` | 1 | 0 |

So twenty-one distinct situations — hold expired, PNR unknown, wrong mobile,
trip unparseable, pass not found — reach the browser as the *same*
indistinguishable `NOT_FOUND`. The UI cannot tell the user what to do because
the server never told it. `00-conventions.md` says pain point 05 exists
"because the legacy system has exactly one error message; do not recreate
that." It has been recreated, one level down.

### The UI then discards what little it gets

- **No error boundary anywhere.** `src/routes/__root.tsx` defines no
  `errorComponent` and no `notFoundComponent`. `book.$tripId.tsx:50` throws
  `notFound()` into nothing.
- **Twelve bare `catch {}` blocks** — `catch {` with no binding, discarding
  the error object entirely: `track.tsx:45`, `login.tsx:67,97,126,146`,
  `payment.return.tsx:43`, `book.$tripId.tsx:50,219,233,244,357`,
  `action-form.tsx:77`.
- Only two places inspect anything: `isConflictError`
  (`book.$tripId.tsx:149`) and `formatError` (`wallet-panel.tsx:29`).
- ~20 hardcoded English strings across 6 files, nearly all "We could not X.
  Try again."

### Two defects worth fixing on the way

1. **Provider internals leak to the browser.** `payments.ts:286` sets
   `data: { reason: checkoutFailureMessage(error) }` from a raw Dodo SDK
   error, and `book.$tripId.tsx:172` renders `error.data.reason` **directly
   to the user**. A gateway exception string is on someone's screen. The same
   class of bug `redactAgentRegistrationErrors` (`src/api/server.ts:10`)
   exists to prevent.
2. **Raw server messages rendered.** `wallet-panel.tsx:29` returns
   `error.message` when present. oRPC validation errors retain rejected
   input by default — that is exactly why the agent-PAN redaction exists.

### Error copy is not translated

`src/lib/i18n.tsx` carries 216 keys for `en`/`gu`/`hi`. **Not one is an error
message.** `login.tsx` calls `t()` for button labels while its `setError`
strings sit as raw literals beside them. Gujarati and Hindi users get English
at the exact moment they are stuck.

## The join

One field connects both halves:

```
server throws  →  reason: "hold_expired"
                        ├─→ wide event field   error_reason  (operator greps)
                        └─→ copy key           (user is told what to do)
```

And one identifier closes the loop the other way: the **`trace_id` is shown
to the user** as a reference and is the primary key of the event line. A
support message saying "I got reference a1b2c3d4" becomes one `jq` filter and
the whole story is on screen. That is the payoff for doing these together.

## Decisions

| Decision | Choice | Why |
|---|---|---|
| Sink | stdout, one JSON line per event | Zero dependencies; the format every aggregator ingests, so moving to Axiom/Honeycomb later is config, not a rewrite. |
| Transport | `process.stdout.write` | Not `console`, so no biome rule fires and **no lint override is needed**. |
| Coverage | Every oRPC operation + webhook route + reconcile script | One interceptor covers all contract operations; the other two are the only units of work that bypass it. |
| Scope | Server-side only | No ingest endpoint to expose, rate-limit, or trust. |
| Field carrier | `AsyncLocalStorage` (`node:async_hooks`) | Stdlib. The alternative is threading a context parameter through an 871-line service. |
| Sampling | 100% | Free at this traffic. Sample later, successes only. |
| Sentry | Kept, unchanged | Complementary: Sentry groups and alerts; wide events describe. Do not delete the six captures. |
| Reason vocabulary | Closed set, `snake_case` | An open set cannot be translated, counted, or trusted not to leak. |

---

# Part A — Wide events

## The emitter — `src/lib/events.ts`

Roughly 60 lines. Server-only: it imports `node:async_hooks`, so **never
import it from a component** — the rule `src/api/server.ts` already carries.

```ts
withEvent(name: string, fn: () => Promise<T>): Promise<T>
addEventFields(fields: Record<string, unknown>): void
```

- `withEvent` opens an `AsyncLocalStorage` scope holding a field map, runs
  `fn`, and on settle stamps the spine and writes **one line**.
- `addEventFields` merges into the current scope. Outside a scope it is a
  **no-op**, so handlers stay callable from tests and scripts.
- Emission is wrapped in try/catch and swallows. **Observability must never
  fail a booking.**
- Nested `withEvent` joins the outer scope instead of opening a second one —
  the one-line rule enforced structurally, not by convention.

Two `ponytail:` ceilings to mark in the file:

```
// ponytail: 100% sampling; sample successes if line volume becomes a cost
// ponytail: synchronous stdout write; batch behind a queue if it shows in p99
```

## Field catalogue

Flat, `snake_case`, no nesting — nesting costs `jq '."payment.intent_id"'`
quoting for no benefit, and flat keys port to every aggregator unchanged.

### Spine — every event

| field | note |
|---|---|
| `event` | `orpc.booking.create`, `dodo_webhook`, `payment_reconcile` |
| `ts` | ISO string |
| `duration_ms` | number |
| `outcome` | `success` \| `error` |
| `error_code` | the contract's typed code, or `INTERNAL` |
| `error_reason` | **the closed-vocabulary discriminator — the join** |
| `error_message` | unexpected errors only; typed errors carry no free text |
| `trace_id` | Sentry's active trace id when present, else a generated uuid |
| `env` | `NODE_ENV` |

`error_code` + `error_reason` together are the direct answer to pain point
05: every failure becomes countable *by kind* without anyone writing a new
log line.

### Domain fields

**Booking** — `trip_id`, `hold_id`, `seat_count`, `pnr`, `journey_date`,
`bus_type`, `amount_paise`, `payment_provider`

**Payment** — `payment_intent_id`, `payment_purpose`, `payment_status`,
`payment_method`, `dodo_payment_id`, `dodo_session_id`, `webhook_id`,
`webhook_event_type`, `incident_reason`, `refund_id`

**Auth** — `user_id`, `session_present`

**Search / tracking** — `from`, `to`, `journey_date`, `result_count`,
`vehicle_no` (city and vehicle names are not personal data)

### Derived fields — the ones that earn their keep

Cannot be reconstructed afterwards. Compute at emit time, deliberately:

| field | meaning |
|---|---|
| `hold_age_ms` | how long the hold had been alive when consumed |
| `hold_remaining_ms` | time left on the hold at payment — **small values are near-misses** |
| `payment_latency_ms` | `startPayment` → confirming webhook |
| `webhook_lag_ms` | Dodo envelope `timestamp` → our receipt |
| `is_duplicate_webhook` | this `webhook_id` was already processed |
| `returned_before_webhook` | the browser reached the return page first |
| `provider_ms` | time inside the Dodo SDK call, separate from our own work |

`hold_remaining_ms` is the one to watch — it turns "seats got taken while I
was paying" from an incident you hear about afterwards into a distribution
you can see trending toward zero.

## Redaction — a hard allowlist

**Never emitted, in any field, hashed or otherwise: passenger names,
`contact_mobile`, `contact_email`, the `passengers` array, PAN, OTP codes,
session tokens.**

Correlation uses identifiers that are already opaque: `user_id`, `pnr`,
`payment_intent_id`, `hold_id`, `trace_id`. Between them, signed-in and guest
journeys are both traceable end to end with no personal field.

No hashing scheme. A salted hash of a 10-digit mobile is a 10^10 keyspace —
brute-forceable, and it means managing a salt. "Do not log it" has nothing to
get wrong.

Enforced, not documented: the emitter holds a `DENIED_KEYS` set and drops
matching keys before writing, so a careless future `addEventFields({ email })`
is a silent drop rather than a leak. `src/start.ts` already sets
`sendDefaultPii: false`; this keeps that promise on the new surface.

## Wiring — three call sites

**1 · oRPC interceptor (`src/api/server.ts`)** — beside the existing
`redactAgentRegistrationErrors`:

```ts
const emitWideEvent: Interceptor<
  { next: () => Promise<unknown>; path: readonly string[] },
  Promise<unknown>
> = (options) =>
  withEvent(`orpc.${options.path.join(".")}`, () => options.next());
```

Place it **outermost**, before the redaction interceptor, so the event
records the real error rather than the redacted stand-in. It reads `path`
only — never `input`, which carries passenger data.

**2 · Webhook route** — wrap the `POST` body in `withEvent("dodo_webhook", …)`.
It must emit on **every** path including both 401s; an unsigned webhook is
precisely the event you want recorded, and today it produces nothing without
a DSN. Add `http_status` — this is the one unit of work whose outcome is a
status code.

**3 · Reconcile script** — one `withEvent("payment_reconcile", …)` per intent
plus a `payment_reconcile_sweep` summary carrying `examined`, `resolved`,
`incidents`. Replaces the hand-rolled `console.error(JSON.stringify(…))` loop,
which is already a wide event in spirit, just off-schema. Keep the non-zero
exit: Dokploy's job-failure surface stays the alarm, the events are the
explanation.

---

# Part B — Error handling

## B1 · Every throw names a reason

The contract already supports this; 59 of 61 sites ignore it. Extend
`src/api/contract/base.ts` — **this task authorises that edit**, and it is
additive: an optional field on an existing error payload, no operation's
input, output, or error set changes.

```ts
data: v.optional(v.object({
  reason: v.optional(v.string()),   // closed vocabulary, below
  traceId: v.optional(v.string()),  // the reference shown to the user
}))
```

### The reason vocabulary

Closed, `snake_case`, machine-readable, **never rendered raw**. It is a key
into copy, not copy.

| code | reasons |
|---|---|
| `NOT_FOUND` | `hold_expired`, `hold_unknown`, `booking_unknown`, `mobile_mismatch`, `trip_unknown`, `pnr_unknown`, `pass_unknown`, `agent_unknown`, `vehicle_unknown`, `payment_intent_unknown` |
| `CONFLICT` | `seats_taken`, `seat_passenger_mismatch`, `hold_already_consumed`, `trip_mismatch`, `wallet_account_missing` |
| `PAYMENT_FAILED` | `checkout_session_failed`, `provider_unavailable`, `charge_declined`, `booking_write_failed`, `mock_provider_disabled` |
| `RATE_LIMITED` | `too_many_hold_attempts`, `too_many_topup_attempts`, `otp_throttled` |
| `UNAUTHORIZED` | `session_missing`, `session_expired` |

Define it as a `const` union in `src/api/contract/base.ts` so a typo is a
type error rather than a silently unmatched copy key.

**Fix the leak while doing this.** `payments.ts:286` and `:352` currently put
`checkoutFailureMessage(error)` — a raw Dodo SDK string — into `reason`, and
`book.$tripId.tsx:172` renders it. Replace with
`reason: "checkout_session_failed"`; the SDK detail belongs in the wide event
(`error_message`) and in Sentry, where operators can see it and users cannot.

Each handler adds the same reason to its event via `addEventFields` — or, more
simply, the interceptor reads it off the caught `ORPCError` and stamps
`error_reason` automatically. Prefer the latter: one place, no discipline
required.

## B2 · One place that turns an error into copy

`src/lib/error-copy.ts` — client-safe, no server imports.

```ts
type AppError = {
  code: string;         // NOT_FOUND | … | INTERNAL | NETWORK
  reason?: string;      // closed vocabulary
  traceId?: string;
  title: string;        // what went wrong
  detail: string;       // why, in the user's terms
  action: string;       // what to do next — never empty
  recoverable: boolean; // does a retry make sense?
};

toAppError(error: unknown, context?: string): AppError
```

Copy is keyed by `reason`, falling back to `code`, falling back to a generic
entry that always carries the `traceId`. Illustrative rows — the implementer
fills the rest from the vocabulary above:

| reason | title | detail | action |
|---|---|---|---|
| `hold_expired` | Your seat hold ran out | Seats are held for 10 minutes so they don't sit locked for others. | Pick your seats again — they may still be free. |
| `seats_taken` | Someone booked that seat first | Another passenger confirmed while you were filling in details. | Choose from the refreshed seat map. |
| `charge_declined` | Your bank declined the payment | No money left your account. Your seats are still held until {time}. | Try a different card or UPI ID. |
| `session_expired` | You've been signed out | Sessions end after a period of inactivity. | Sign in again — your booking details are saved. |
| `too_many_hold_attempts` | Too many attempts | You've tried to lock seats several times in a row. | Wait a minute, then try once more. |
| `INTERNAL` | Something broke on our side | This isn't your fault and nothing was charged. | Try again shortly. Quote reference **{traceId}** if you contact us. |

Rules the table encodes:

- **`action` is never empty.** An error the user cannot act on is a dead end;
  if there is genuinely nothing to do, the action is "quote this reference".
- **State what did *not* happen.** "No money left your account" is the
  sentence that stops a support call.
- **Never render `error.message` from the server.** Delete the
  `error.message` branch in `wallet-panel.tsx:29` and the `data.reason`
  passthrough in `book.$tripId.tsx:172`; both surface internals.

## B3 · Never `catch {}` again

All twelve bare blocks become `catch (error)` routed through `toAppError`.
The rule for the codebase: **a bare `catch {}` is only acceptable where the
failure is genuinely irrelevant** — the two sessionStorage guards in
`book.$tripId.tsx` qualify and are already commented; nothing that a user is
waiting on does.

## B4 · Error boundaries

- `src/routes/__root.tsx` — add `errorComponent` and `notFoundComponent`.
  Today an uncaught loader or render error produces a blank page, and the
  `notFound()` at `book.$tripId.tsx:50` lands nowhere.
- `book.$tripId.tsx` gets its own route-level `errorComponent` so a failure
  mid-booking keeps the header, the trip summary, and a route back to search
  rather than replacing the page.

Both render the same `AppError` shape as inline errors — one component,
`<ErrorPanel error={…} />`, used by boundaries and forms alike.

## B5 · Translate the copy

Every `title`, `detail`, and `action` goes through `t()`, and the strings are
added to `MESSAGES` for `gu` and `hi` in `src/lib/i18n.tsx`. Roughly 25
reasons × 3 fields × 2 languages.

This is the part it would be easy to skip, and it is the part that matters
most on a GSRTC site: today the app switches to Gujarati for every button and
then hands the user English the moment something breaks.

`{time}` and `{traceId}` interpolate **after** translation, so the
placeholders survive.

## B6 · Show the reference

Whenever `code` is `INTERNAL` — or any error where `recoverable` is false —
render the `traceId`, short and copyable. Populate it server-side from the
same value the wide event carries:

```ts
throw errors.NOT_FOUND({ data: { reason: "hold_expired", traceId } });
```

That is the loop closed: the string on the user's screen is the primary key
of the line in the operator's log.

---

## Operations

### Log rotation is mandatory

Docker's `json-file` driver is unbounded by default; a per-request event
stream will fill the VPS disk. Add to the `app` service in `compose.yaml`:

```yaml
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"
```

Not optional and not a tuning detail — without it this task eventually takes
the site down.

### Reading them

```bash
# failure counts by operation
docker compose logs app --no-log-prefix \
  | jq -rs 'map(select(.event|startswith("orpc.")))
            | group_by(.event) | map({op:.[0].event, n:length,
              errors:(map(select(.outcome=="error"))|length)})'

# pain point 05, answered: which failures actually happen
docker compose logs app --no-log-prefix \
  | jq -rs 'map(select(.outcome=="error"))
            | group_by(.error_reason)
            | map({reason:.[0].error_reason, code:.[0].error_code, n:length})
            | sort_by(-.n)'

# p95 duration of booking confirmation
docker compose logs app --no-log-prefix \
  | jq -s '[.[]|select(.event=="orpc.booking.create").duration_ms]
           | sort | .[(length*0.95|floor)]'

# near-misses: paid with under a minute left on the hold
docker compose logs app --no-log-prefix \
  | jq -r 'select(.hold_remaining_ms != null and .hold_remaining_ms < 60000)'

# a user quoted reference "a1b2c3d4"
docker compose logs app --no-log-prefix | jq -r 'select(.trace_id=="a1b2c3d4")'
```

Keep these in the doc, not in someone's shell history. They are as much the
deliverable as the emitter.

### When stdout stops being enough

The format is already aggregator-native. Moving to Axiom, Honeycomb, or Loki
is: point a shipper at the container. No application change — the reason for
choosing stdout over a Postgres table.

## Steps

Part A and Part B are independently shippable. **Do B1 first regardless** —
the reason vocabulary is what both halves consume.

1. Add the reason union and `traceId` to `src/api/contract/base.ts`; run
   `bun run openapi:generate`.
2. Give all 61 throw sites a reason. Delete the two raw-SDK-string leaks at
   `payments.ts:286` and `:352`.
3. Write `src/lib/events.ts`: `withEvent`, `addEventFields`, spine stamper,
   `DENIED_KEYS`, swallowing try/catch.
4. Write `src/lib/events.test.ts`. **Before wiring anything.**
5. Add the interceptor to `src/api/server.ts`, outermost; stamp
   `error_reason` from the caught `ORPCError` there.
6. Wrap the webhook route (add `http_status`); rewrite the reconcile script's
   output loop.
7. Add `addEventFields` to the booking, payment, wallet, auth, search and
   tracking handlers — domain and derived fields.
8. Write `src/lib/error-copy.ts` and `src/components/error-panel.tsx`.
9. Replace all twelve bare `catch {}` blocks; delete the `error.message`
   branch in `wallet-panel.tsx` and the `data.reason` passthrough in
   `book.$tripId.tsx`.
10. Add `errorComponent` + `notFoundComponent` to `__root.tsx`, and a
    route-level `errorComponent` to `book.$tripId.tsx`.
11. Add every copy string to `MESSAGES` for `gu` and `hi`.
12. Add the `logging:` block to `compose.yaml`.
13. Confirm no client bundle imports `src/lib/events.ts` — `bun run build`
    fails loudly if `node:async_hooks` reaches the browser.
14. Run one real booking end to end: **one event per operation, no operation
    twice.**

## Required tests

`src/lib/events.test.ts` — the write function is injectable so tests capture
lines instead of stdout.

- [ ] `withEvent` around a resolving function emits **exactly one** line with
      `outcome: "success"` and a numeric `duration_ms`.
- [ ] `withEvent` around a throwing function emits **exactly one** line with
      `outcome: "error"`, the typed `error_code` and `error_reason`, and
      **re-throws**.
- [ ] `addEventFields` from a nested async call reaches the emitted line.
- [ ] Nested `withEvent` produces one line, not two.
- [ ] A denied key (`email`, `contact_mobile`, `passengers`) is dropped and
      the rest of the event survives.
- [ ] A write that throws does not propagate.
- [ ] `addEventFields` outside any scope does not throw.

`src/lib/error-copy.test.ts`

- [ ] **Every reason in the vocabulary has copy**, and every entry has a
      non-empty `action`. This is the test that stops the taxonomy rotting.
- [ ] `toAppError` on an unrecognised value returns the `INTERNAL` entry with
      the `traceId` preserved.
- [ ] `toAppError` never returns a server-supplied `message` in any field.
- [ ] An expired-hold `ORPCError` maps to the `hold_expired` copy, not the
      generic `NOT_FOUND` copy.

`src/api/errors.test.ts`

- [ ] Booking against an expired hold returns `reason: "hold_expired"`; a
      seat conflict returns `seats_taken`. Two errors that were
      indistinguishable are now distinguishable.

## Acceptance criteria

- [ ] Every oRPC operation emits exactly one event, success or failure.
- [ ] The webhook route emits on all four paths: missing header, bad
      signature, processed, processing error.
- [ ] No event contains a passenger name, mobile, or email — verified by
      grepping a full end-to-end run.
- [ ] A failed booking is fully explicable from its one line: operation,
      trip, hold, seat count, error code, reason, duration.
- [ ] **All 61 throw sites carry a reason from the closed vocabulary**, and
      no reason is a free-form string.
- [ ] No Dodo SDK message and no oRPC validation message can reach the
      browser.
- [ ] Every error a user can see states what went wrong **and what to do**.
- [ ] All error copy renders in Gujarati and Hindi.
- [ ] An uncaught loader error renders the error boundary, not a blank page.
- [ ] The `traceId` shown to a user finds exactly one line via `jq`.
- [ ] The documented `jq` queries run against real output.
- [ ] `compose.yaml` caps log size; the browser bundle has no
      `node:async_hooks`.
- [ ] `bun x ultracite check` passes with **no new biome override**.
- [ ] `bun run test` passes.
- [ ] The board row in `README.md` is updated in the same commit.

## Out of scope

- Browser-side wide events. No public ingest route; the server sees enough.
- OpenTelemetry. `@orpc/shared` exports OTEL helpers and Sentry already
  traces — adopt them when a distributed backend exists to receive them.
  There is one process today.
- Metrics, dashboards, alert thresholds. Sentry alerts on exceptions, Dokploy
  on the reconcile job; aggregate alerting needs a backend that aggregates.
- Sampling, batching, async write queue. Marked as `ponytail:` ceilings.
- Retention beyond docker rotation. Ship logs off the box first.
- Deleting the existing Sentry captures. They are the alerting path.
- A sixth contract error code. The five plus a reason are sufficient — that
  is the point.
- Retry-with-backoff or offline queueing in the client. Telling the user what
  to do is this task; doing it for them is not.
