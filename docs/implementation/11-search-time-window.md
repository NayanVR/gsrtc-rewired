# 11 — Search time-window filtering

**Status:** done
**Depends on:** —
**Phase:** 1
**Pain point:** 01

## Goal

Make trip search respect a **time** window, not just a date.

This closes a real gap. Pain point 01's lead complaint is that a 7am query
returns midnight–7am buses. Nothing in the contract or the router currently
addresses that.

## Current state (verified)

- `search.trips`'s input is `{ from, to, date, passengers, busType? }`
  (`src/api/contract/search.ts`). **There is no time field.**
- The handler in `src/api/router.ts` does not filter by date at all — it
  *generates* six synthetic trips from `input.date` via `buildTrip()`. The
  only real filter applied is `busType`.
- An earlier version of `../pain-points/01-booking-reliability.md` claimed
  "search already filters by the requested date server-side." It did not.

So there is nothing to fix in the filter — there is no filter. It has to be
built, and the contract needs a field to drive it.

## This task changes the contract

The only task on the board that does. `00-conventions.md` freezes the
contract precisely so this is a deliberate decision rather than a drift. Make
the change explicitly and in one commit.

Add an optional departure-window input to `search.trips`:

```ts
departAfter: v.optional(v.string())   // "HH:MM", local (+05:30)
departBefore: v.optional(v.string())
```

Optional so existing callers keep working. A `v.picklist` of coarse bands
(morning / afternoon / night) is the alternative — pick one, don't ship both.
Whichever you choose, the filter is applied **server-side**; a client-side
filter would leave the API surface still wrong for every other consumer,
which is the entire premise of the rebuild.

## Steps

1. Add the field(s) to `src/api/contract/search.ts`.
2. Implement the filter in the `trips` handler against each trip's
   `departure` timestamp. Trips are generated at `+05:30`; compare in that
   offset, do not compare UTC hours against local input.
3. An empty result is a valid result — return `{ trips: [] }`, never
   `NOT_FOUND`.
4. Wire it into `src/components/search-form.tsx`. Read that file first; it
   may already have a time control, and the repo convention is single-source
   config in `src/data/`.
5. Add the round-trip through `src/api/fns.ts`.

## Acceptance criteria

- [x] A search with `departAfter: "07:00"` returns no trip departing before
      07:00 local.
- [x] The boundary case is tested: a trip departing at exactly 07:00 with
      `departAfter: "07:00"` — decide inclusive or exclusive, document it,
      and test it.
- [x] Omitting the field returns all trips, unchanged from today.
- [x] A window matching nothing returns an empty array, not an error.
- [x] Timezone handling is tested against a trip near midnight — this is
      where an offset bug will actually show up.

## Completion notes

- `departAfter` and `departBefore` are optional `HH:MM` inputs in GSRTC's
  `+05:30` local time. Both bounds are inclusive, so a 07:00 departure is
  returned by `departAfter: "07:00"`.
- Filtering extracts the wall-clock portion of the timestamp rather than
  converting it to UTC, preserving correct behaviour around local midnight.

## Out of scope

Real OPRS timetable data. Sorting, price filters, amenity filters.
