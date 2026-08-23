# 12 — Tracking degradation & staleness

**Status:** done
**Depends on:** —
**Phase:** 1
**Pain point:** 04

## Goal

Surface staleness and delay in the tracking UI, so a lagging feed reads as
"delayed" rather than "wrong."

## Current state (verified)

- `tracking.progress` **is** implemented (`src/api/router.ts`) and returns
  `lastUpdated`, `delayMin`, and per-stop `etaMin` — the schema claims in
  pain point 04 are accurate.
- What's missing is the consuming half. `../pain-points/04-live-tracking.md`
  says the frontend "can and should show explicit staleness" — correctly
  hedged, because it doesn't.
- `src/routes/track.tsx` exists. **Read it first** and check what it already
  renders before assuming any of this is absent.
- `tracking` has three operations declared in
  `src/api/contract/tracking.ts`; only `progress` is implemented. Check
  whether the other two are needed by the UI, and leave them alone if not.

## Steps

1. Read `src/routes/track.tsx` and record what it currently shows. If it
   already renders `lastUpdated` or `delayMin`, narrow this task to what's
   genuinely missing rather than rebuilding it.
2. Render staleness as relative age: "as of 4 minutes ago", computed from
   `lastUpdated`. Not a raw ISO string.
3. Define one staleness threshold as a named constant. Past it, the UI must
   visibly degrade — mark the data as possibly out of date rather than
   presenting it as live. This is the whole point of the task: the failure
   mode being fixed is confident wrongness, not missing data.
4. Render `delayMin` with its sign meaning made explicit: positive is late,
   negative is early (documented in `src/api/schemas.ts`). "12 min late"
   beats "delay: 12".
5. Accessibility, per `AGENTS.md`: a staleness or delay change is a live
   region, and status must not be conveyed by colour alone.

## Acceptance criteria

- [x] `lastUpdated` is visible on the tracking page as a relative time.
- [x] Past the staleness threshold the UI visibly marks the data as stale.
- [x] `delayMin` is rendered with early/late stated in words.
- [x] Status is distinguishable without colour.
- [x] The staleness threshold is one named constant, not a repeated literal.
- [x] The relative-time formatter has a test covering "just now", minutes,
      and over an hour.

## Completion notes

- `TRACKING_STALE_AFTER_MS` is five minutes. Past that point the page states
  that data may be out of date; the warning does not rely on colour alone.
- Freshness and delay share a polite live region, so a refreshed tracking
  result is announced accessibly.

## Out of scope

Real GPS integration. A map. Polling or websockets — the existing
refresh behaviour stays. Implementing the other two `tracking` operations
unless the UI actually needs them.
