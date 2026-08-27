# 16 — Dodo Payments (test mode only)

**Status:** done
**Depends on:** 04, 08, 15
**Phase:** 3
**Pain point:** 02

## Goal

Replace the simulated charge on **both** paying surfaces — seat booking and
wallet top-up — with a real Dodo Payments hosted checkout, **locked to test
mode**, so no real money can be charged. Every payment attempt — succeeded,
failed, abandoned, or paid-but-unfulfillable — leaves a durable row you can
query and an alert you can act on.

Two hard requirements shape every decision below:

1. **No real money.** Live mode must be structurally unreachable, not merely
   unconfigured. See [Test-mode lock](#test-mode-lock).
2. **No silent failure.** A payment that cannot be turned into a booking or a
   wallet credit must produce an incident row, a Sentry event, and an
   attempted refund — never a dropped promise. See
   [Failure taxonomy](#failure-taxonomy).

## Current state (verified)

- `src/api/handlers/booking.ts:189` calls `mockCharge()` **inside** the
  booking transaction. It is synchronous and cannot fail, so today
  "charge + insert booking + flip seats" is one atomic step.
- `src/api/handlers/wallet.ts:97` calls `mockCharge()` inside the top-up
  transaction, then writes a `wallet_transactions` row keyed by the returned
  `transactionId` and increments the balance.
- `holdId` is the booking idempotency key. `booking.create` has exactly three
  outcomes (live hold / consumed hold / expired hold) — task 04's table.
  **Wallet top-up has no idempotency key at all today.**
- `HOLD_TTL_MS` is **10 minutes** (`src/api/services/seat-holds.ts:6`).
- Fare = seat fares + `SERVICE_FEE_PER_SEAT` (15) per seat
  (`src/api/handlers/booking.ts:17`), rupees, 2dp.
- `wallet.topUp` input is `{ amount: Rupees (min 10), method }`; output is
  `{ balance, transactionId }`. The UI is `src/components/wallet-panel.tsx`,
  mounted from `src/routes/p.$slug.tsx:54`.
- Deployment is **Dokploy on a VPS**: `Dockerfile` + `compose.yaml` exist,
  there is no `Caddyfile` (Dokploy's Traefik owns domain routing). Task 15's
  board row still says `todo`, but its artifacts have landed, so this task is
  not blocked on it.
- Sentry is initialised in `src/start.ts` **only when `VITE_SENTRY_DSN` is
  set at build time**, with `sendDefaultPii: false`.
- `src/api/openapi.test.ts` asserts `docs/openapi.json` matches the contract,
  so any new contract operation requires `bun run openapi:generate`.
- `src/db/client.ts` holds an explicit `schema` map — new tables must be
  registered there as well as in `src/db/schema.ts`.

### The structural problem

Dodo's checkout is a **redirect to a hosted page**. The charge cannot happen
inside a database transaction, and its result arrives on a _different
request_ — a webhook — that may land before the browser returns, after it,
twice, or ten hours late. Three consequences drive the design:

- Neither a booking nor a wallet credit can be completed by the request that
  starts payment.
- The confirming request (the webhook) carries **no passenger data and no
  session**, so passengers, contact, and the user id must be persisted
  _before_ the redirect.
- The 10-minute seat hold can expire while the customer is on Dodo's page.
  Money taken against seats we no longer own is the single worst outcome in
  this system and gets its own explicit path.

### Booking and wallet are not symmetric

They share the ledger, the webhook, the test-mode lock, and the reconcile
sweep. They differ in exactly one way that matters, and the design leans on
it:

|                                         | Booking                      | Wallet top-up                |
| --------------------------------------- | ---------------------------- | ---------------------------- |
| Holds scarce inventory                  | Yes — seats                  | No                           |
| Can a late success always be fulfilled? | **No** — seats may be gone   | **Yes** — always creditable  |
| Orphan path reachable                   | Yes, and it is the main risk | Only if the user row is gone |
| Idempotency key                         | `holdId` (exists today)      | `paymentIntentId` (**new**)  |
| Session required                        | No — booking is account-free | Yes                          |

So: **a `payment.succeeded` for a wallet top-up is credited unconditionally,
however late it arrives.** There is no expiry race to lose. Booking is where
the hard work is.

## Provider choice and the mock seam

`booking.create`, `wallet.topUp` and `mockCharge()` **stay exactly as they
are.** They become the `mock` provider: the default for local development,
CI, and every existing test, none of which have Dodo credentials.

```
PAYMENTS_PROVIDER unset | "mock"  → today's behaviour, unchanged
PAYMENTS_PROVIDER="dodo"          → hosted checkout, webhook-confirmed
```

This keeps the frozen contract intact, keeps task 04's acceptance criteria
true (`mockCharge` still has a caller), and gives a working fallback when
Dodo is unreachable. The seam is the one `00-conventions.md` already asks
for.

**Both mock operations must be gated on the provider.** `booking.create` is
unauthenticated and mints a confirmed booking against a fake charge;
`wallet.topUp` mints balance for any signed-in user. Both are published in
`docs/openapi.json`. Leaving them routable while `PAYMENTS_PROVIDER=dodo` is
a free-booking endpoint and a free-money endpoint. When the provider is
`dodo`, both throw `PAYMENT_FAILED` immediately — before touching the hold or
the wallet — and the webhook becomes the only path to a booking row or a
credit.

Rejected: the Better Auth `dodopayments` plugin. It exists for subscriptions
and a customer portal keyed to a logged-in user. Booking without an account
must keep working (see the board README), so payments cannot hang off the
session.

## Contract additions

Three new operations. `00-conventions.md` freezes the contract _unless a task
says otherwise_ — **this task says otherwise, for these three only.** No
existing operation's input, output, or error set changes.

```
booking.startPayment
  POST /bookings/payment
  in:  { tripId, holdId, passengers: Passenger[],
         contact: { mobile, email? }, singleLady? }
  out: { checkoutUrl: string, paymentIntentId: string, expiresAt: Timestamp }
  err: NOT_FOUND (hold gone) | CONFLICT (seats/passenger mismatch)
     | PAYMENT_FAILED (session creation failed) | RATE_LIMITED (attempt cap)

wallet.startTopUp
  POST /wallet/topup/session
  in:  { amount: Rupees (min 10) }
  out: { checkoutUrl: string, paymentIntentId: string, expiresAt: Timestamp }
  err: UNAUTHORIZED | PAYMENT_FAILED | RATE_LIMITED

booking.paymentStatus
  GET /bookings/payment/{paymentIntentId}
  in:  { paymentIntentId: string }
  out: { status: PaymentIntentStatus, purpose: "booking" | "wallet_topup",
         booking?: Booking, balance?: Rupees, failureReason?: string }
  err: NOT_FOUND
```

`startTopUp` drops the `method` input — Dodo's hosted page owns method
selection, so offering our own picker would be a lie. The passbook
description becomes `Wallet top-up · <method from the webhook payload>`,
falling back to `Wallet top-up` when the payload omits it.

`paymentStatus` covers both purposes so there is one return page and one
poll. It returns the whole `Booking` on success, so the page needs one round
trip and does not need the customer's mobile to read it. It is deliberately
**unauthenticated but unguessable** — the intent id is a UUID, and a wallet
intent returns only the resulting balance, never the passbook.

The five errors in `src/api/contract/base.ts` are sufficient. Do not add a
sixth.

## Storage

Two tables in `src/db/schema.ts`, registered in `src/db/client.ts`.

### `payment_intents` — the ledger

One row per payment attempt, written **before** the redirect. This is the
only place the passenger snapshot and the user id live between redirect and
webhook.

| column                                  | type               | note                                                    |
| --------------------------------------- | ------------------ | ------------------------------------------------------- |
| `id`                                    | text PK            | `crypto.randomUUID()`; appears in the return URL        |
| `purpose`                               | text enum          | `booking` \| `wallet_topup`                             |
| `status`                                | text enum          | see state machine below                                 |
| `holdId`                                | text               | null for wallet top-ups                                 |
| `tripId`                                | text               | null for wallet top-ups                                 |
| `userId`                                | text               | set for wallet top-ups; null for booking (account-free) |
| `amountPaise`                           | integer            | integer, never float; `Math.round(rupees * 100)`        |
| `currency`                              | text               | `INR`                                                   |
| `passengers`                            | jsonb              | booking snapshot; the webhook has none                  |
| `contactMobile` / `contactEmail`        | text               | booking snapshot                                        |
| `singleLady`                            | boolean            | booking snapshot                                        |
| `dodoSessionId`                         | text               | from `checkoutSessions.create`                          |
| `dodoPaymentId`                         | text               | from the webhook / `payments.retrieve`                  |
| `checkoutUrl`                           | text               | asserted test-mode before it is ever returned           |
| `pnr`                                   | text               | set only on a succeeded booking                         |
| `failureCode` / `failureMessage`        | text               | set on `failed`                                         |
| `incidentReason`                        | text               | **non-null means a human must look**                    |
| `refundId`                              | text               | set if the orphan auto-refund succeeded                 |
| `lastWebhookId` / `lastWebhookAt`       | text / timestamptz | provenance                                              |
| `createdAt` / `updatedAt` / `expiresAt` | timestamptz        |                                                         |

Indexes: `holdId`, `userId`, `dodoPaymentId`, `status`, and a partial index
`where incident_reason is not null` — the ops query must stay a single fast
scan.

`userId` references `user.id` with **no cascade delete**. An intent must
outlive the account it belonged to; losing the row would erase the record of
a payment.

### `payment_webhook_events` — the audit log

| column                       | type        | note                                      |
| ---------------------------- | ----------- | ----------------------------------------- |
| `webhookId`                  | text PK     | the `webhook-id` header; the dedupe fence |
| `eventType`                  | text        | `payment.succeeded` etc.                  |
| `payload`                    | jsonb       | the full verified envelope, as received   |
| `paymentIntentId`            | text        | resolved from metadata, nullable          |
| `receivedAt` / `processedAt` | timestamptz | `processedAt` null = unprocessed          |
| `processingError`            | text        | set when handling threw                   |

Every verified delivery is persisted **before** it is processed, so a crash
mid-processing is replayable from this table alone. Nothing here is deleted.

No third table for incidents. `incidentReason` on the intent is one column
and one query; a separate table would be one join and one more thing to keep
in sync.

## State machine

```
                    ┌──────────► failed   (payment.failed)
created ──► processing ─────────► succeeded (booking confirmed / wallet credited)
   │                └──────────► orphaned  (paid, not fulfillable → INCIDENT)
   └───────────────────────────► expired   (no terminal event in the window)
                                     orphaned ──► refunded (auto-refund ok)
```

Terminal: `succeeded`, `failed`, `expired`, `refunded`. `orphaned` is
terminal _and_ open — it stays visible until someone clears
`incidentReason`.

Transitions only ever move forward. A late `payment.processing` arriving
after `succeeded` is recorded in the event log and ignored — Dodo documents
that events can arrive out of order.

One exception, and it is the asymmetry above: **an `expired` wallet intent
that later receives `payment.succeeded` moves to `succeeded` and credits.**
Nothing was released, so there is nothing to lose. An `expired` _booking_
intent that later succeeds goes to `orphaned` — its seats are gone.

## Flow A · Booking

### 1 · `booking.startPayment`

In one transaction:

1. `SELECT … FOR UPDATE` the hold. Gone or expired → `NOT_FOUND`.
   Already consumed → `CONFLICT` (a booking already exists; the client
   should call `booking.get`).
2. Validate passenger seats against the hold seats — the same
   `hasMatchingSeatNos` check `booking.create` already does. Mismatch →
   `CONFLICT`.
3. **Extend the hold** to `now + PAYMENT_WINDOW_MS` (15 min) and push the
   same expiry to the `booked_seats` rows. The hold must outlive the
   checkout, not the other way round.
4. Re-entry guard: if a `created` intent for this hold is younger than the
   window, return its existing `checkoutUrl` — a browser refresh must not
   mint a second session. More than 5 intents for one hold → `RATE_LIMITED`.
5. Compute the amount with the existing `calculateBookingAmount`. **Never
   trust a client-supplied amount.**
6. Insert the `payment_intents` row as `created`.

Then, outside the transaction, call Dodo:

```ts
const session = await dodo.checkoutSessions.create({
  product_cart: [{ product_id: BOOKING_PRODUCT_ID, quantity: 1, amount: intent.amountPaise }],
  customer: { email: contact.email, name: passengers[0].name },
  return_url: `${BETTER_AUTH_URL}/payment/return?intent=${intent.id}`,
  metadata: { payment_intent_id: intent.id, purpose: "booking", hold_id: holdId, trip_id: tripId },
});
```

`amount` requires a **Pay What You Want** one-time product in the Dodo test
dashboard — that is the only way to set a per-checkout price, and bus fares
are per-seat. It is in the lowest denomination, so paise.

If the call throws, mark the intent `failed` with the SDK error and throw
`PAYMENT_FAILED`. If it succeeds, assert the test-mode URL (below), store
`dodoSessionId` + `checkoutUrl`, and return.

`metadata.payment_intent_id` is the primary correlation key; `hold_id` is the
fallback if metadata is ever partially lost.

### 2 · Redirect

`src/routes/book.$tripId.tsx` — the existing "Pay ₹X" button calls
`startPayment` and sets `window.location.href = checkoutUrl` instead of
calling `createBooking`. The `mock` provider keeps the current code path
unchanged. The sessionStorage booking session already survives the
cross-origin round trip (same tab), and the hold-restore effect already
handles coming back.

### 3 · Confirming a booking

Extract the body of `confirmLiveHold` (`src/api/handlers/booking.ts:158`)
into `src/api/services/confirm-booking.ts` as
`confirmHold(tx, { holdRow, passengers, contact, singleLady, paymentRef })`,
with **the charge call removed** — the caller supplies a payment reference.

- `booking.create` (mock) → opens the tx, calls `mockCharge()`, then
  `confirmHold`. Behaviour identical to today.
- The webhook → opens the tx, `SELECT … FOR UPDATE` on the intent, then
  `confirmHold` with the snapshot and `dodoPaymentId`.

Both keep `holdId` as the idempotency key, so task 04's "same holdId charges
once, returns the same PNR" property survives untouched.

Inside the webhook confirm, in order:

1. Intent already `succeeded` → return its PNR. Done.
2. Hold missing, expired, or its seats reassigned → **orphan path** (below).
3. `data.total_amount` ≠ `amountPaise` → **confirm the booking anyway**, then
   set `incidentReason` to the mismatch. A paying customer never loses their
   seat over a reconciliation discrepancy; the discrepancy gets a human.
   (Dodo is a merchant of record — keep tax-inclusive pricing on and adaptive
   currency **off** so this stays a real signal rather than noise.)
4. `confirmHold` → set intent `succeeded` + `pnr`.

## Flow B · Wallet top-up

### 1 · `wallet.startTopUp`

`requireSession` first — this one is authenticated. Then insert a
`payment_intents` row with `purpose: "wallet_topup"`, `userId`,
`amountPaise`, and no hold/trip/passenger fields. Rate limit: more than 10
non-terminal intents for one user in an hour → `RATE_LIMITED`.

```ts
const session = await dodo.checkoutSessions.create({
  product_cart: [{ product_id: WALLET_PRODUCT_ID, quantity: 1, amount: intent.amountPaise }],
  customer: { email: user.email, name: user.name },
  return_url: `${BETTER_AUTH_URL}/payment/return?intent=${intent.id}`,
  metadata: { payment_intent_id: intent.id, purpose: "wallet_topup", user_id: user.id },
});
```

A **separate** PWYW product from booking, so the Dodo dashboard separates
ticket revenue from wallet loads without us parsing metadata.

`src/components/wallet-panel.tsx` drops its method picker under the `dodo`
provider and redirects to `checkoutUrl`.

### 2 · Crediting

The critical piece, because wallet has no natural idempotency key today.
**`wallet_transactions.id` becomes the `paymentIntentId`.** In one
transaction:

1. `SELECT … FOR UPDATE` the wallet account (upserting it first, as the
   existing handler does).
2. `insert(walletTransactions).values({ id: paymentIntentId, … })
.onConflictDoNothing().returning()`.
3. **Only if that returned a row, increment the balance.** An empty return
   means this intent was already credited — a duplicate webhook, a replay, or
   the reconcile sweep racing the webhook. Skip and report success.

The primary-key conflict _is_ the fence. It is a database-level guarantee, in
the same transaction as the balance write, so no amount of concurrent or
out-of-order delivery can double-credit. This is strictly stronger than what
`wallet.topUp` does today.

A missing or deleted `user` row is the only way a wallet credit can fail
permanently → orphan path.

## The webhook — `src/routes/api/payments/dodo/webhook.ts`

`POST` only. This is the **only** thing that confirms a booking or credits a
wallet.

1. `const raw = await request.text()` — raw body, before any JSON parse.
   Parsing first breaks signature verification.
2. `dodo.webhooks.unwrap(raw, headers)` with `webhook-id`,
   `webhook-signature`, `webhook-timestamp`. Failure → **401, write
   nothing**, `Sentry.captureMessage(..., "warning")`. Never 500 on a bad
   signature: 500 makes Dodo retry a forged request eight times.
3. Insert the `payment_webhook_events` row. If `webhookId` already exists
   **and** `processedAt` is set → 200, done. If it exists unprocessed, fall
   through and process again; both fulfilment paths are idempotent, so a
   replay is safe.
4. Resolve the intent from `metadata.payment_intent_id`. Unknown → 200 (not
   5xx — retrying for ten hours will not make it known) + incident row keyed
   by `dodoPaymentId` + Sentry error.
5. Dispatch on `type`, then on `intent.purpose`:
   - `payment.succeeded` → confirm booking, or credit wallet
   - `payment.failed` → `failed`, store `failureCode`/`failureMessage`
   - `payment.processing` → `processing`, nothing else
   - `refund.succeeded` → `refunded`
   - anything else → logged in the event table, ignored
6. Set `processedAt`, return 200.

A transient error (database down) returns **500** so Dodo's retry ladder
(immediate, 5s, 5m, 30m, 2h, 5h, 10h, 10h) does its job. A permanent error
returns **200** and leaves an incident. Getting this distinction wrong is
either a lost payment or a retry storm.

Dodo's read timeout is 15 seconds. Both fulfilment transactions are a handful
of indexed queries, so they run inline — no queue.

Dokploy's Traefik already routes every path to the app container, so the
endpoint needs no proxy configuration. Register
`${BETTER_AUTH_URL}/api/payments/dodo/webhook` in the Dodo test dashboard.

## Orphan path — paid but unfulfillable

The case this whole design exists for. Reachable from booking whenever the
hold is gone; from wallet only when the user row is.

1. Set intent `orphaned`, `incidentReason` = why (`hold_expired`,
   `seats_taken`, `trip_unresolvable`, `user_missing`).
2. `Sentry.captureException` at `level: "fatal"`, tagged `payment_intent_id`,
   `dodo_payment_id`, `purpose`, `hold_id`, `trip_id`, `user_id`. Explicit —
   incidents do not throw, so the global middleware will not see them.
3. Attempt `dodo.refunds.create({ payment_id, reason })`. Success → status
   `refunded`, keep `incidentReason` set. Failure → leave `orphaned`, append
   the refund error to `incidentReason`, second Sentry event.
4. Return 200. The payment is resolved as far as Dodo is concerned; the
   incident row is our record.

Sentry may be a no-op (no DSN at build time). **The database row is the
durable record and does not depend on Sentry being configured.**

## Return page — `src/routes/payment.return.tsx`

Reads `?intent=`, polls `booking.paymentStatus` every 2s for up to 60s, and
branches on `purpose`:

- **booking succeeded** → the existing confirmation panel with the PNR;
  clears the booking sessionStorage key.
- **wallet succeeded** → the new balance and a link back to the wallet page.
- **failed** → the failure message and a link back (`/book/$tripId` or the
  wallet page). For booking the hold may still be alive, so retry is one
  click.
- **still pending after 60s** → "we are confirming your payment", the intent
  id, and a lookup link.

Dodo's own docs say the redirect can be missed entirely. The return page is
**display only** — it never confirms anything.

## Reconciliation — `scripts/reconcile-payments.ts`

Closes the "webhook never arrived" hole. For every intent in `created` or
`processing` past its `expiresAt`:

- `dodo.payments.retrieve(dodoPaymentId ?? sessionId)` — resolve the truth.
- succeeded → run the same fulfilment path (orphan path included).
- failed / not found → `expired`; for bookings, release the hold.

Then print every row with a non-null `incidentReason` and **exit non-zero if
any exist.**

**Runs as a Dokploy scheduled job**, every 5 minutes, invoking
`bun scripts/reconcile-payments.ts` in the app service. The non-zero exit
turns Dokploy's job-failure surface into the incident alarm, so open
incidents are visible even with no Sentry DSN configured. The script is
idempotent — a concurrent run and a webhook cannot double-fulfil, because
both go through the same `holdId` / `paymentIntentId` fences.

The single documented ops query:

```sql
select id, purpose, status, incident_reason, dodo_payment_id,
       amount_paise, created_at
from payment_intents
where incident_reason is not null
order by created_at desc;
```

No admin UI. Add one when this query is being run daily, not before.

## Test-mode lock

Defence in depth, because "we set the env var to test" is not a guarantee.

1. **The environment is a constant, not configuration.** `src/lib/dodo.ts`
   hardcodes `environment: "test_mode"` and exports no way to change it. No
   `DODO_PAYMENTS_ENVIRONMENT` variable exists anywhere in the repo, so no
   deploy-time mistake can flip it.
2. **The redirect URL is asserted.** Before `checkoutUrl` is stored or
   returned, assert it starts with `https://test.checkout.dodopayments.com`. Anything
   else → intent `failed`, incident, Sentry fatal, and **the customer is
   never redirected**. This guards the exact thing that matters: where the
   browser goes.
3. **The customer is told.** A persistent "Test mode — no real payment is
   taken" banner on the booking payment step, the wallet top-up panel, and
   the return page.
4. **CI guards it.** A test asserts the exported environment constant is
   `test_mode` and that a non-test checkout URL is rejected.

Going live later is a deliberate, reviewable diff to `src/lib/dodo.ts` — not
an environment variable someone sets by accident.

## Failure taxonomy

Every way this can fail, and where it lands. Nothing reaches "unknown".

| What happens                   | Status                  | Where it shows up                                      |
| ------------------------------ | ----------------------- | ------------------------------------------------------ |
| Session creation throws        | `failed`                | Intent row + `PAYMENT_FAILED` to the user              |
| Customer abandons the tab      | `expired`               | Reconcile sweep; booking hold released                 |
| Card declined                  | `failed`                | `failureCode`/`failureMessage`; hold still live, retry |
| Webhook signature invalid      | —                       | 401 + Sentry warning; no state change                  |
| Webhook duplicate              | unchanged               | Event row; both fulfilment paths idempotent            |
| Webhook out of order           | unchanged               | Forward-only transitions                               |
| Webhook never arrives          | resolved                | Dokploy job via `payments.retrieve`                    |
| Unknown intent in metadata     | —                       | Event row + incident + Sentry, 200                     |
| Booking paid, hold expired     | `orphaned` → `refunded` | Incident + Sentry fatal + auto-refund                  |
| Booking paid, seats taken      | `orphaned` → `refunded` | Incident + Sentry fatal + auto-refund                  |
| Wallet paid, intent expired    | `succeeded`             | Credited anyway — nothing was released                 |
| Wallet paid, user deleted      | `orphaned` → `refunded` | Incident + Sentry fatal + auto-refund                  |
| Wallet webhook delivered twice | `succeeded`             | PK conflict on `wallet_transactions.id`; one credit    |
| Amount mismatch                | `succeeded`             | Fulfilled, incident flagged                            |
| Refund attempt fails           | `orphaned`              | Incident text + second Sentry event                    |
| Database down during webhook   | unchanged               | 500 → Dodo retries 8× over ~28h                        |

## Invariants

These are what the tests defend:

1. No booking row exists without a `succeeded` intent (mock provider aside).
2. No `succeeded` booking intent exists without a `pnr`.
3. Money taken that cannot be fulfilled **always** leaves a non-null
   `incidentReason`. There is no silent branch.
4. Every verified webhook is persisted before it is processed.
5. One `holdId` produces at most one booking, however many payment attempts
   or webhook deliveries occur.
6. One `paymentIntentId` produces at most one wallet credit, enforced by a
   primary key in the same transaction as the balance write.
7. Under `PAYMENTS_PROVIDER=dodo` there is exactly one route to a booking row
   or a wallet credit: a signature-verified `payment.succeeded` webhook.

## Steps

1. Add the `dodopayments` dependency. Create `src/lib/dodo.ts`: the client
   (`bearerToken`, hardcoded `environment: "test_mode"`, `webhookKey`), the
   `PAYMENTS_PROVIDER` resolver, and `assertTestCheckoutUrl`.
2. Add both tables to `src/db/schema.ts`, register them in
   `src/db/client.ts`, then `bun run db:generate` && `bun run db:migrate`,
   committing the SQL in `drizzle/`.
3. Extract `confirmHold` into `src/api/services/confirm-booking.ts` and
   rewire `booking.create` to it. **Existing tests must pass unchanged at
   this point** — do not continue until they do.
4. Add the three operations to the contract and run
   `bun run openapi:generate`.
5. Write `src/api/services/payments.ts`: intent creation, forward-only
   transitions, the webhook dispatch, both fulfilment paths, the orphan path,
   incident recording.
6. Implement the handlers, gate `booking.create` and `wallet.topUp` on the
   provider, and add the three wrappers to `src/api/fns.ts`.
7. Add `src/routes/api/payments/dodo/webhook.ts`.
8. Add `src/routes/payment.return.tsx`; branch the payment button in
   `src/routes/book.$tripId.tsx` and the top-up form in
   `src/components/wallet-panel.tsx` on the provider.
9. Add `scripts/reconcile-payments.ts` and register it as a Dokploy
   scheduled job (`*/5 * * * *`) against the app service.
10. Document the five variables in `.env.example` and pass them through to
    the `app` service in `compose.yaml`. Register the webhook URL in the Dodo
    test dashboard.
11. Write `src/api/payments.test.ts` (below).

Ship booking end to end before wiring the wallet UI. Steps 5–8 are ordered
booking-first deliberately: booking carries every hard case, and wallet is
the same machinery with a simpler fulfilment step.

## Configuration

```bash
PAYMENTS_PROVIDER=dodo               # unset or "mock" keeps mockCharge()
DODO_PAYMENTS_API_KEY=               # TEST key from the test dashboard
DODO_PAYMENTS_WEBHOOK_KEY=           # webhook signing secret
DODO_PRODUCT_ID_BOOKING=             # Pay-What-You-Want one-time product, INR
DODO_PRODUCT_ID_WALLET=              # second PWYW product, INR
```

Set these in Dokploy's Compose Environment editor, matching how task 15
handles `DATABASE_URL` and `BETTER_AUTH_SECRET`.

`BETTER_AUTH_URL` is reused as the public origin for `return_url` and the
webhook. It is already required and already correct per environment; a second
base-URL variable is a second thing to get wrong.

Dashboard setup, for both products: one-time, **Pay What You Want on**,
currency INR, tax-inclusive pricing **on**, adaptive currency **off**.

## Manual verification

Test cards (billing country `IN`, currency `INR`):

- India Visa success — `4576238912771450`, exp `06/32`, CVV `123`
- India Visa decline — `4706131211212123` → `GENERIC_DECLINE`
- UPI — `success@upi` / `failure@upi`

Local webhooks need a public URL: use the Dodo CLI's webhook forwarding, or a
`cloudflared` tunnel to port 3000. On the deployed VPS, point the test
dashboard at the real host and use Dodo's redelivery button.

Walk all seven by hand before calling this done: booking success, booking
decline, close the tab mid-checkout, pay after letting the hold lapse (must
orphan + refund), redeliver one webhook twice (must stay one PNR), wallet
top-up success, and redeliver a wallet webhook twice (balance must move once).

## Required tests — `src/api/payments.test.ts`

The Dodo SDK is stubbed with `vi.spyOn`; **no test may touch the network.**

- [ ] The exported environment constant is `test_mode`, and a checkout URL
      not on `test.checkout.dodopayments.com` is rejected without redirecting.
- [ ] An invalid webhook signature returns 401 and mutates nothing.
- [ ] The same `webhook-id` delivered twice yields one booking, one PNR, and
      one `succeeded` intent.
- [ ] `payment.succeeded` for a released hold creates **no** booking, sets
      `orphaned`, sets `incidentReason`, and calls `refunds.create`.
- [ ] `payment.failed` sets `failureCode`/`failureMessage`, leaves the hold
      live, and permits a second `startPayment` on the same hold.
- [ ] `startPayment` twice in the window returns the _same_ `checkoutUrl`.
- [ ] An amount mismatch still confirms the booking and flags an incident.
- [ ] With `PAYMENTS_PROVIDER=dodo`, `booking.create` throws
      `PAYMENT_FAILED` and leaves the hold unconsumed.
- [ ] With `PAYMENTS_PROVIDER=dodo`, `wallet.topUp` throws `PAYMENT_FAILED`
      and leaves the balance unchanged.
- [ ] **A wallet `payment.succeeded` delivered twice moves the balance
      exactly once.** This is the wallet equivalent of task 04's core test.
- [ ] A wallet `payment.succeeded` for an `expired` intent still credits.
- [ ] The reconcile sweep resolves a stale `created` intent from a stubbed
      `payments.retrieve` and exits non-zero when an incident is open.

## Acceptance criteria

- [ ] With `PAYMENTS_PROVIDER` unset, every existing test passes and both
      booking and wallet behave exactly as before.
- [ ] With `PAYMENTS_PROVIDER=dodo`, a test-card payment produces a booking
      whose PNR matches `paymentStatus`, and the seats flip to `booked`.
- [ ] With `PAYMENTS_PROVIDER=dodo`, a test-card top-up increments the
      balance exactly once and writes one `wallet_transactions` row.
- [ ] Live mode is unreachable without editing `src/lib/dodo.ts`; no
      environment variable can select it.
- [ ] Every checkout URL handed to a browser is on `test.checkout.dodopayments.com`.
- [ ] `booking.create` and `wallet.topUp` are both closed under the `dodo`
      provider.
- [ ] Every verified webhook delivery has a row in
      `payment_webhook_events`, including ones that failed to process.
- [ ] A payment that cannot be fulfilled leaves a non-null `incidentReason`,
      a Sentry fatal event, and a refund attempt.
- [ ] The Dokploy scheduled job runs the reconcile script every 5 minutes and
      fails visibly when an incident is open.
- [ ] The ops query returns zero rows after a clean end-to-end run.
- [ ] `bun x ultracite check` passes.
- [ ] `bun run test` passes.
- [ ] The board row in `README.md` is updated in the same commit.

## Out of scope

- Live mode. Deliberately, permanently, for this task.
- Subscriptions, the customer portal, and the Better Auth Dodo plugin.
- Storing a Dodo `customer_id` per user. Passing email + name per session is
  enough in test mode; add it if the dashboard's duplicate customers become
  annoying.
- Routing task 06's `refunds` table through Dodo. The only Dodo refund here
  is the orphan auto-refund, which the safety argument requires.
- Paying for a booking **from** the wallet balance. That is an internal debit
  with no gateway involved and belongs with task 08, not here.
- An admin UI. The ops query and the reconcile script's output cover it.
- Disputes and chargeback webhooks. Log the event, act later.
- Agent e-top-up (task 10) and pass fees (task 09).
