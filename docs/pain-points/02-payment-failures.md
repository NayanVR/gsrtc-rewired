# Payment failures — debited-not-booked, double debits, phantom holds

## The complaint

- Money debited but no booking created; refund takes 7–21 working days.
- Double debits when a user retries after an apparently failed payment.
- Seats show as "booked" after a payment that never actually completed.
- Payment options sometimes don't render at all; app freezes mid-payment.
- Only Paytm is supported — no direct UPI-intent/GPay option.

## Why this happens in the current architecture

The URL structure is the clue: `/OPRSPhonepe` is a separately-deployed web
application — `/OPRSPhonepe/preGatewayTransactionStatus.do` responds with its
own `JSESSIONID; Path=/OPRSPhonepe/` — sitting alongside the booking modules
rather than inside them. A payment gateway that gets its own deployment and
its own session scope is a bespoke integration, not an adapter behind a
shared interface. And because that cookie is path-scoped, the booking
module's session is *not* carried into the payment module's requests:
whatever ties a payment back to a booking has to be re-established
explicitly at the boundary.

(On "only Paytm": a PhonePe module plainly exists. Users may be seeing Paytm
as the only option *offered at checkout*, with `/OPRSPhonepe` dormant,
backend-only, or limited to certain flows. Which of those is true isn't
determinable from outside.)

Everything below is inference from those observable facts plus the public
complaint patterns — not from GSRTC's source:

- **No idempotency key tying a payment attempt to a booking attempt.** If
  "charge the card" and "create the booking record" are two separate calls
  with nothing linking a specific charge to a specific hold, any failure
  between them — a dropped callback, a gateway timeout, a webhook that never
  arrives — leaves the system in an inconsistent state: charged-not-booked,
  or booked-not-actually-paid (the "seat shows booked but payment never
  completed" reports). There's no way to safely retry without risking a
  second charge, hence double debits.
- **Confirmation likely depends on a synchronous callback from the gateway
  reaching the booking module.** On a slow or dropped network, the user sees
  "freeze" or a blank payment-options screen while the server-side state
  either never updates or updates without the client ever finding out. The
  session split between the two modules gives this failure somewhere to
  hide.
- **Adding a new payment method means writing a new module** (mirroring
  `OPRSPhonepe`), which is a plausible reason GPay/UPI-intent isn't offered
  generically — it isn't a config change, it's new bespoke integration
  work, so it doesn't happen until someone prioritizes it.
- **Refund-on-failure is likely a manual/offline reconciliation**, not a
  real-time reversal, because there's no shared transaction ledger the web
  layer and the payment layer both trust — which would explain the 7–21 day
  window even for "payment succeeded, booking failed" cases that should, in
  principle, be instantly reversible.

## Plan of action

- `booking.create` takes a `holdId`, not raw seat numbers — payment is
  always attempted against a specific, already-reserved hold. This is the
  idempotency key the current system lacks: a retry against the same hold
  either finds it already consumed (safe no-op) or still open (safe retry),
  never a double charge against a *new* reservation.
- The charge and the booking write happen as one operation
  (`mockCharge()` in `src/lib/mock-payment.ts`, called inside
  `booking.create`) — there is no window where money moves but the booking
  doesn't exist, or vice versa, because both are decided in the same
  request. When this is wired to a real gateway later, the same shape holds:
  gateway idempotency key = `holdId`.
- `PAYMENT_FAILED` is a typed, specific error
  (`src/api/contract/base.ts`) the client can act on directly — offer retry
  against the *same* hold — rather than a generic failure that leaves the
  user unsure whether to retry (and risk a double charge) or start over.
- Payment method is already modeled as a **generic picklist**
  (`"upi" | "card" | "netbanking"` in `wallet.topUp`,
  `src/api/contract/wallet.ts`), not a gateway-specific branch — so adding a
  method is a config/UI change against one interface, not a new bespoke
  module per provider, which is the structural reason GSRTC's current
  system is stuck on one dated gateway.
- Because a hold has a TTL (`seat_holds.expiresAt`), a payment that never
  completes doesn't need a manual cleanup process — the seat frees itself,
  removing the "phantom booked seat" class of bug entirely.

## Sources

Observable facts (Verified 2026-08-22.)

- <https://gsrtc.in/OPRSPhonepe/preGatewayTransactionStatus.do> — 200, sets
  `JSESSIONID; Path=/OPRSPhonepe/`, confirming a separate webapp context.

Complaint patterns: public app-store reviews and citizen complaint forums;
not individually cited, and not independently verified.
