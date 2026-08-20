# Payment failures — debited-not-booked, double debits, phantom holds

## The complaint

- Money debited but no booking created; refund takes 7–21 working days.
- Double debits when a user retries after an apparently failed payment.
- Seats show as "booked" after a payment that never actually completed.
- Payment options sometimes don't render at all; app freezes mid-payment.
- Only Paytm is supported — no direct UPI-intent/GPay option.

## Why this happens in the current architecture

The URL structure itself is a clue: `/OPRSPhonepe` exists as its own module
alongside the Paytm integration referenced in reviews, meaning **each
payment gateway is its own bespoke integration**, not a shared abstraction
behind one interface. That structural choice explains every symptom:

- **No idempotency key tying a payment attempt to a booking attempt.** If
  "charge the card" and "create the booking record" are two separate calls
  with nothing linking a specific charge to a specific hold, any failure
  between them — a dropped callback, a gateway timeout, a webhook that never
  arrives — leaves the system in an inconsistent state: charged-not-booked,
  or booked-not-actually-paid (the "seat shows booked but payment never
  completed" reports). There's no way to safely retry without risking a
  second charge, hence double debits.
- **Confirmation likely depends on a synchronous callback from the gateway
  reaching the JSP servlet.** On a slow or dropped network, the user sees
  "freeze" or a blank payment-options screen while the server-side state
  either never updates or updates without the client ever finding out.
- **Adding a new payment method means writing a new module** (mirroring
  `OPRSPhonepe`), which is exactly why GPay/UPI-intent isn't offered
  generically — it isn't a config change, it's new bespoke integration
  work, so it doesn't happen until someone prioritizes it.
- **Refund-on-failure is a manual/offline reconciliation**, not a real-time
  reversal, because there's no shared transaction ledger the web layer and
  the payment layer both trust — hence the 7–21 day window even for
  "payment succeeded, booking failed" cases that should, in principle, be
  instantly reversible.

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
