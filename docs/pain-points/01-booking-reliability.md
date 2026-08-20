# Booking reliability — seat counts, stale schedules, missing routes

## The complaint

- AC Luxury buses show incorrect/inconsistent seat counts; seats shown as
  available disappear on selection.
- Search results include buses outside the requested time window (e.g.
  midnight–7am buses returned for a 7am query).
- Bus name, express/local label, and boarding/dropping points are frequently
  blank or incomplete.
- No last-minute booking support.

## Why this happens in the current architecture

GSRTC sells the same seat inventory through **at least four independent
channels**: the web portal (`/OPRSOnline`), the mobile app (`/OPRSWeb`), the
pass system (`/OPRSPass`), and agent counters — each historically bolted on
as its own JSP/servlet module rather than a shared service. That structure
produces the exact symptoms reported:

- **No single source of truth for seat state.** If each channel queries (and
  writes) inventory through its own code path, two channels can legitimately
  disagree about whether a seat is free at the same instant — which reads as
  "seat count wrong" or "seat vanished on selection" to the passenger.
- **No short-lived server-side hold.** Server-rendered JSP pages typically
  render a seat map once per request with no reservation step; between "seat
  shown available" and "form submitted," another channel can take it, with
  nothing to reconcile that race except a failure at submit time (or worse,
  silent overbooking).
- **Schedule and route data assembled per-page, not from one schema.** JSP
  templates commonly pull each field (bus name, timing, boarding points)
  from separate lookups populated by different back-office processes; a gap
  in any one lookup renders as a blank field rather than a validation error,
  because there's no shared contract enforcing the record is complete before
  it's shown.
- **Time-window filtering done loosely** (e.g. by date only, not by a
  server-validated datetime range), letting stale or mistimed rows leak into
  results.

## Plan of action

This is the concrete reason the rebuild treats **seat inventory as one
authoritative table**, not a per-request computation:

- `booked_seats` (already scaffolded in `src/db/schema.ts`) is the single
  overlay every channel — web, and later app/agent — would read and write
  through the same `booking.seatMap` / `booking.hold` operations. There is
  no second code path that can independently mark a seat taken.
- `seat_holds` gives every "seat selected" a real, short-TTL server-side
  reservation (`booking.hold` → `holdId` + `expiresAt`) instead of a
  client-side-only selection. A hold that expires releases the seat
  automatically; a hold that's consumed by `booking.create` is atomic with
  the booking write, so two passengers can never both confirm the same seat.
- `Trip`/`Seat` are enforced by one Valibot schema (`src/api/schemas.ts`) on
  the way out of the server — a trip missing `busType`, `from`/`to`, or
  timing fields fails validation rather than rendering blank in the UI.
- Search already filters by the requested date server-side
  (`search.trips` in `src/api/router.ts`); as real OPRS data replaces the
  synthetic generator, the same contract enforces the query stays
  date/time-scoped rather than leaking adjacent-day services.
- `CONFLICT` is a first-class typed error (`src/api/contract/base.ts`) for
  exactly the "someone else took this seat" case, so the UI can show
  "that seat was just taken, pick another" instead of a failed submit with
  no explanation.
