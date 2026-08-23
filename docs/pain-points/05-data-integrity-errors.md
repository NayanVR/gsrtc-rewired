# Data integrity errors — gender flips, generic errors, dead support info

## The complaint

- Gender selected as female on booking shows as male on the printed/PDF
  ticket.
- Generic **"Oops, something went wrong"** errors with pages stuck in
  reload loops and no actionable detail.
- The helpline number listed in the app doesn't connect.

## Why this happens in the current architecture

No claim in this section is externally verifiable: reproducing the gender bug
requires a real booking, and both the error handling and the support-contact
plumbing are only observable from inside. These are hypotheses that would
each produce exactly the reported symptom — the design rationale for the plan
below, not findings:

- **The booking form and the print/PDF template are likely separate code
  paths reading the same underlying field differently** — a classic symptom
  of passenger data being re-mapped or re-serialized between the booking
  action and a distinct print/ticket-generation action, rather than both
  rendering from one shared, typed record. A mismatched enum encoding
  (e.g. `0/1` vs `M/F` between the two systems) reproduces exactly this bug
  and would be invisible to normal testing unless someone specifically
  checks the printed output against what was entered.
- **A single catch-all error handler.** "Oops, something went wrong" with no
  distinguishing detail is what you get from a top-level exception filter
  that doesn't preserve *why* a request failed — validation error, session
  timeout, downstream OPRS failure, and a genuine bug all surface
  identically to the user, so nothing in the UI can guide them toward a fix
  (retry vs. re-login vs. contact support).
- **Support contact info is static content baked into app builds** rather
  than served from a source both the app and the website read at runtime —
  so a changed helpline number requires a coordinated app release to
  actually reach users, and stale numbers linger until then.

## Plan of action

- Passenger fields (`name`, `age`, `gender`, `seatNo`) are one Valibot
  schema (`Passenger` in `src/api/schemas.ts`) shared end-to-end — the
  booking write and anything that renders a ticket read the *same* stored
  record, not a re-entered or re-mapped copy, which structurally removes
  the class of bug where print disagrees with what was entered.
- The typed error set in `src/api/contract/base.ts`
  (`NOT_FOUND` / `CONFLICT` / `PAYMENT_FAILED` / `RATE_LIMITED` /
  `UNAUTHORIZED`) replaces one generic failure with specific, named cases
  the UI renders differently — "that seat was just taken" is not the same
  message as "sign in to continue," where today both would likely be
  the same dead-end error screen.
- Support/contact details are CMS-style content
  (`content.page` / `content.faqs`, `src/data/page-content.ts`) served at
  request time from one place the web frontend reads directly — updating a
  number is a data change, not a coordinated release across every client.

## Sources

No externally verifiable facts in this document. Every claim rests on public
app-store reviews and citizen complaint forums, which are not individually
cited and have not been independently verified. The gender-encoding
hypothesis in particular is not reproducible without a real booking.
