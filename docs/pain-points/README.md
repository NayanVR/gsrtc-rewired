# GSRTC pain points — root causes & plan of action

Six recurring problem clusters surfaced from public complaint boards, app
store reviews, and citizen complaint forums. For each one: why it's happening
given GSRTC's current architecture, and how the gsrtc-rewired design
addresses it. Each file ends with a `## Sources` section separating what was
directly verified from what wasn't.

1. [Booking reliability — seat counts, stale schedules, missing routes](./01-booking-reliability.md)
2. [Payment failures — debited-not-booked, double debits, phantom holds](./02-payment-failures.md)
3. [Refund delays & opacity](./03-refund-delays.md)
4. [Live tracking unreliability](./04-live-tracking.md)
5. [Data integrity errors — gender flips, generic errors, dead support info](./05-data-integrity-errors.md)
6. [Legacy web architecture — heavy, fragmented, non-responsive](./06-legacy-architecture.md)

Read the "Why this happens" sections carefully: they mix a small number of
**directly verified** observations (module paths, session scoping, server
stacks, asset counts — checked against the live systems on 2026-08-22, see
each file's Sources) with a much larger body of **inference** about the
mechanisms behind the symptoms. Each file marks which is which. Docs 03 and
05 contain no externally verifiable facts at all.

We have no access to GSRTC's source or infrastructure. The inferences are the
design rationale for the rebuild, not findings about GSRTC's codebase.
