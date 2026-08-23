# 04 — Booking create & payment idempotency

**Status:** done
**Depends on:** 03
**Phase:** 3
**Pain point:** 02

## Goal

Implement `booking.create` and `booking.get`, consuming a hold atomically
with the payment and the booking write. This is the task that makes pain
point 02's idempotency argument real.

## Current state (verified)

- **`booking.create` has no handler.** Declared in
  `src/api/contract/booking.ts`, absent from the `router` export.
- **`booking.get` has no handler.**
- **`mockCharge()` in `src/lib/mock-payment.ts` has zero callers.** Pain
  point 02 states it is "called inside `booking.create`". It is not called
  anywhere.
- `bookings` table exists and is unused.

## Contract (frozen)

```
booking.create
  in:  { tripId, holdId, passengers: Passenger[], contact: { mobile, email? }, singleLady? }
  out: Booking

booking.get
  in:  { pnr: string, mobile: Mobile }
  out: Booking
```

Note `booking.create` takes a `holdId`, **not** seat numbers. The seats come
from the hold. This is deliberate and is the whole idempotency mechanism —
do not add a `seatNos` input.

## Design — the idempotency rule

`holdId` is the idempotency key. Exactly three outcomes, and the handler must
distinguish them:

| Hold state | Behaviour |
|---|---|
| Live, unconsumed | Charge, write booking, mark hold consumed. Return the booking. |
| Already consumed | **Return the existing booking.** Do not charge again. |
| Expired or unknown | `NOT_FOUND`. The seats are already free; the client must re-hold. |

The middle row is the one that prevents double debits. A retry after a
dropped response must be a safe no-op that returns the original result, not a
second charge and not an error.

All of it — charge, booking insert, `booked_seats` flip from `held` to
`booked`, `seat_holds.consumedAt` — happens in **one database transaction**.
`mockCharge()` is synchronous and cannot fail today, but write the code so
that a failing charge rolls the transaction back. When a real gateway
replaces it, pass `holdId` as the gateway's idempotency key.

## Steps

1. Implement `booking.create` per the table above.
2. Validate that `passengers[].seatNo` exactly matches the seats on the hold.
   Mismatch is `CONFLICT`, not a silent correction.
3. Generate a PNR. Check `src/lib/ids.ts` first.
4. Call `mockCharge()` inside the transaction. On a non-success result throw
   `PAYMENT_FAILED` and roll back.
5. Implement `booking.get`, scoped by `mobile` — a PNR alone must not be
   enough to read someone's booking.
6. Add `createServerFn` wrappers in `src/api/fns.ts` and wire the booking
   route's submit path.

## Acceptance criteria

- [x] Creating a booking against a live hold returns a `Booking` and flips
      those `booked_seats` rows to `booked`.
- [x] **Calling `booking.create` twice with the same `holdId` charges once
      and returns the same PNR both times.** This is the core test.
- [x] Creating against an expired hold throws `NOT_FOUND`.
- [x] A passenger list whose seats don't match the hold throws `CONFLICT`.
- [x] `booking.get` with the wrong mobile throws `NOT_FOUND`, not the booking.
- [x] A simulated charge failure leaves no booking row and no `booked` seats.
- [x] `mockCharge` has a caller.

## Out of scope

Real gateway integration. Wallet as a payment source — task 08. Ticket
delivery by SMS/email — task 05.
