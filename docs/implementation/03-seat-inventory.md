# 03 — Seat inventory & holds

**Status:** done
**Depends on:** 02
**Phase:** 3
**Pain point:** 01

## Goal

Make `booked_seats` the single source of truth for seat state, and implement
`booking.hold` so selecting a seat creates a real, expiring, server-side
reservation.

This is the task that makes pain point 01's central claim true. Right now
that document describes this mechanism in the present tense and none of it
exists.

## Current state (verified)

- `booking.seatMap` is implemented but computes seats from a pure hash
  function — `buildSeats()` in `src/api/router.ts` derives status from
  `(n * 7 + index * 3) % 10`. It reads no storage. Two concurrent users see
  identical seat maps forever.
- **`booking.hold` has no handler.** It is declared in
  `src/api/contract/booking.ts` and absent from the `router` export.
- `seat_holds` and `booked_seats` tables exist and are unused.

## Contract (frozen)

```
booking.hold
  in:  { tripId: string, seatNos: string[] }
  out: { holdId: string, expiresAt: Timestamp }

booking.seatMap
  in:  { tripId: string }
  out: { tripId: string, seats: Seat[] }   // Seat.status: available|booked|ladies|held
```

## Design

Keep the deterministic generator as the **baseline occupancy** — it stands in
for OPRS's existing bookings. Layer real rows on top:

```
seatMap = buildSeats(tripId)  overlaid with  booked_seats WHERE tripId = ?
```

A `booked_seats` row with `state: "held"` and `expiresAt > now()` renders as
`held`. `state: "booked"` renders as `booked`. Expired holds are ignored by
the read — they do not need to be deleted to stop mattering. This is what
makes "the seat frees itself" true rather than aspirational.

## Steps

1. Add a hold TTL constant. Something in the 5–10 minute range; name it, do
   not inline the number.
2. Implement `booking.hold`:
   - Reject seats already taken in the baseline generator.
   - Insert `seat_holds` plus one `booked_seats` row per seat with
     `state: "held"`, `holdId`, and `expiresAt`.
   - The insert must fail rather than overwrite if any requested seat already
     has a live `held` or `booked` row. Enforce this in the database — a
     partial unique index on `(trip_id, seat_no)` for live rows — not with a
     read-then-write in application code, which races.
   - On conflict, `throw errors.CONFLICT()`.
3. Rewrite `booking.seatMap` to overlay live `booked_seats` rows on the
   generator output. Treat a row with `expiresAt <= now()` as absent.
4. Use `src/lib/ids.ts` for id generation if it fits; read it before adding
   any new id helper.

## Acceptance criteria

- [x] `booking.hold` appears in the `router` export and returns a real
      `holdId` and `expiresAt`.
- [x] Holding a seat then re-reading `booking.seatMap` shows that seat as
      `held`.
- [x] Two `booking.hold` calls for the same seat: the second throws
      `CONFLICT`. **Test this by racing them concurrently**, not sequentially
      — a sequential test passes even with a read-then-write race.
- [x] A hold with `expiresAt` in the past does not affect `seatMap` output,
      with no cleanup job having run.
- [x] Seats occupied in the baseline generator still cannot be held.

## Out of scope

`booking.create` — task 04. Any hold-expiry cron; the read-side filter makes
one unnecessary. UI changes to the seat picker.
