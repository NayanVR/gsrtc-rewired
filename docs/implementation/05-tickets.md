# 05 — Tickets

**Status:** done
**Depends on:** 04
**Phase:** 3
**Pain point:** 03, 05

## Goal

Implement the five `tickets.*` operations, including the cancellation-charge
calculation that pain point 03 claims already exists.

## Current state (verified)

- **No `tickets.*` handler exists.** All five are declared in
  `src/api/contract/tickets.ts` and absent from the `router` export.
- `tickets.cancel`'s output declares `refundAmount: Rupees`, but **no
  cancellation-charge computation exists anywhere in `src/`.**
- The charge rates live only as static bullets in
  `src/data/page-content.ts:202-206` — i.e. exactly the "static policy page"
  pain point 03 criticises.

## The rates (from `src/data/page-content.ts`)

| When cancelled | Charge |
|---|---|
| 0–1 day before departure | 25% of fare |
| 2–5 days before | 20% of fare |
| 6–60 days before | 15% of fare |
| Current bookings | no refund |
| After departure | cancellation prohibited |

## Steps

1. Extract these rates into **one exported constant** — a single source both
   the calculation and the content page read. Put it somewhere both can
   import; `src/data/` is the existing home for single-source config. The
   page content must stop hardcoding the numbers in prose, or they will
   drift. This is the actual fix for "policy shown as static text."
2. Write a pure `cancellationCharge(fare, departureAt, now)` function. Pure
   and separately testable — the boundaries (exactly 1 day, exactly 60 days,
   after departure) are where this will be wrong.
3. Implement `tickets.cancel`:
   - Load the booking by `ticketNo` + `mobile`; `NOT_FOUND` otherwise.
   - Already cancelled → `CONFLICT`.
   - After departure → `CONFLICT`, per the policy.
   - In one transaction: set booking status to `cancelled`, release its
     `booked_seats` rows, **and insert a `refunds` row** (task 06 reads it).
     Return `refundAmount`.
4. Implement `tickets.history` — bookings by mobile, newest first.
5. Implement `tickets.reschedule` — hold on the new trip, release the old
   seats, keep the PNR. Reuse task 03's hold logic rather than writing a
   second seat-allocation path.
6. Implement `tickets.print` — stub the SMS/email send behind one named
   function, the way `mock-payment.ts` does. Return `{ sent: true }`.
7. Implement `tickets.waitingListStatus`.

## Acceptance criteria

- [x] All five operations appear in the `router` export.
- [x] `cancellationCharge` has a test covering each band **and both
      boundaries of each band** (1 vs 2 days, 5 vs 6 days, 60 vs 61 days).
- [x] Cancelling releases the seats: the seat map shows them available again.
- [x] Cancelling creates a `refunds` row in the same transaction.
- [x] Cancelling an already-cancelled ticket throws `CONFLICT` and does not
      create a second refund row.
- [x] The rate table exists in exactly one place in the codebase.
- [x] `tickets.history` for a mobile with no bookings returns an empty array,
      not `NOT_FOUND`.

## Out of scope

Actual SMS/email delivery. PDF generation. Partial cancellation of individual
passengers on a multi-seat booking — the contract takes a whole `ticketNo`.
