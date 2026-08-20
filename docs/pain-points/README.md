# GSRTC pain points — root causes & plan of action

Six recurring problem clusters surfaced from public complaint boards, app
store reviews, and citizen complaint forums (sources in each file). For each
one: why it's happening given GSRTC's current architecture, and how the
gsrtc-rewired design addresses it.

1. [Booking reliability — seat counts, stale schedules, missing routes](./01-booking-reliability.md)
2. [Payment failures — debited-not-booked, double debits, phantom holds](./02-payment-failures.md)
3. [Refund delays & opacity](./03-refund-delays.md)
4. [Live tracking unreliability](./04-live-tracking.md)
5. [Data integrity errors — gender flips, generic errors, dead support info](./05-data-integrity-errors.md)
6. [Legacy web architecture — heavy, fragmented, non-responsive](./06-legacy-architecture.md)

These are inferences about *why* the current system behaves this way, made
from its observable characteristics (JSP/servlet endpoints, module
boundaries, page weight) and public complaint patterns — not from access to
GSRTC's actual source or infrastructure.
