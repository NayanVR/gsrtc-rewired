# Refund delays & opacity

## The complaint

- Standard refund window is 7–21 working days.
- Cancellation charges (25% / 20% / 15% of basic fare, by how close to
  departure) aren't always made clear at the point of cancellation.
- Passengers get an SMS saying "refunded" but the amount doesn't land, and
  the refund-email address (`erefund@mail1.gsrtc.in`) reportedly goes
  unanswered — leaving no way to check status in between.

## Why this happens in the current architecture

- **No self-service status endpoint.** The refund flow in the JSP portal
  appears to end at "cancellation submitted" — there's no page a passenger
  can return to and query "where is my money," only an SMS notification and
  an email address for escalation. That forces every uncertain case into
  a support queue instead of a lookup.
- **Refund settlement is likely a manual/batch reconciliation** between the
  OPRS ledger and whatever gateway (Paytm/PhonePe) processed the original
  payment, run on its own schedule independent of the cancellation action —
  which is consistent with a fixed 7–21 day window regardless of how simple
  the individual case is, and with the SMS ("refund initiated") arriving
  long before the money ("refund credited").
- **Charge policy communicated as static text, not computed per-cancellation**
  — a rate table shown on a terms page rather than the actual applicable
  amount shown at the moment of cancelling, which is why users report being
  surprised by the deducted amount.

## Plan of action

- `tickets.cancel` creates a `refunds` row (`src/db/schema.ts`)
  **automatically, in the same operation as the cancellation** — there is no
  gap between "ticket cancelled" and "a trackable refund record exists."
- `refunds.status` (`src/api/contract/refunds.ts`) gives a real lookup by
  `mobile` + `ref`, with a typed status enum
  (`initiated → processing → credited → failed`) the passenger can check any
  time, instead of waiting on an SMS and an unanswered inbox.
- `refunds.complaint` is a distinct, first-class escalation path with its
  own `complaintId` — a structured record instead of an email into a void —
  for cases where the automatic refund actually stalls.
- Because `tickets.cancel` computes and returns `refundAmount` directly in
  its response (`src/api/contract/tickets.ts`), the applicable cancellation
  charge is shown at the moment of cancelling, computed from the same fare
  data as the booking — not read separately off a static policy page.
- The actual bank-side settlement timing stays realistic (mocked as
  instant in this build, matching the "payment mocked" scope) — the fix
  here isn't claiming faster money movement, it's removing the *silence*
  during the wait.
