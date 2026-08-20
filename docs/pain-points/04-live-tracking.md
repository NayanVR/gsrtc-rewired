# Live tracking unreliability

## The complaint

- Wrong/inaccurate bus locations; data that only loads after restarting the
  app; frequent authentication errors.
- Some users and even conductors describe tracking as effectively switched
  off or non-functional in practice.

## Why this happens in the current architecture

- **Tracking is a separate app from a separate vendor**
  (`com.infiniumsolutionzgsrtc.myapplication`), distinct from the main
  booking app/portal — meaning the GPS feed, its auth, and its outage
  handling live entirely outside GSRTC's own booking stack, with whatever
  reliability that third party's ingestion pipeline happens to have.
- **No graceful degradation when the live feed is stale or missing.** The
  reports of "always wrong location" and "never finds the bus" are
  consistent with a UI that only knows how to show a live GPS pin — when
  that feed drops or lags, there's no fallback to schedule-based estimation,
  so the screen just shows something confidently wrong instead of a
  visibly-stale or estimated state.
- **No staleness signal surfaced to the user.** Without a visible
  "last updated" indicator, a frozen or delayed feed is indistinguishable
  from a live one until the passenger notices the bus hasn't moved — which
  reads as "broken" rather than "temporarily delayed."

## Plan of action

- `tracking.progress` (`src/api/contract/tracking.ts`) is deliberately
  modeled as a **derived stop-by-stop timeline**, not a raw GPS pin — the
  adapter's job (per the doc comment in `src/api/schemas.ts`) is to combine
  the live feed with the service timetable, so a gap in live data still
  yields a reasonable "expected at stop X around Y" answer instead of
  nothing.
- `JourneyProgress.lastUpdated` and per-stop `etaMin` are already part of
  the schema — the frontend can and should show explicit staleness
  ("as of 4 minutes ago") rather than presenting every value as
  equally live, so a lagging feed reads as "delayed" not "wrong."
- `delayMin` is a first-class field, not something the UI has to infer —
  the intent is to surface *how* off-schedule a service is rather than
  silently showing an inaccurate position with no context.
- When this is wired to GSRTC's real GPS feed, the adapter boundary (one
  `tracking` domain behind the typed contract) means feed outages get
  handled once, centrally, with one degradation strategy — instead of each
  client (web, app, agent) independently guessing what to show when data
  is missing.
