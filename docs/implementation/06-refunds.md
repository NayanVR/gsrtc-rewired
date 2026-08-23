# 06 — Refunds

**Status:** done
**Depends on:** 05
**Phase:** 2, 3
**Pain point:** 03

## Goal

Implement `refunds.status` and `refunds.complaint` so a passenger can look up
where their money is instead of waiting on an SMS.

## Current state (verified)

- **Neither handler exists.** Both are declared in
  `src/api/contract/refunds.ts` and absent from the `router` export.
- `refunds` and `refund_complaints` tables exist and are unused.
- Task 05 is what starts creating `refunds` rows. Without it this task has
  nothing to read.

## Contract (frozen)

```
refunds.status
  in:  { ref: string, mobile: Mobile }
  out: { ref, amount: Rupees, status: initiated|processing|credited|failed, expectedBy?: DateStr }

refunds.complaint
  in:  { ticketNo, mobile, email, message (min 10 chars) }
  out: { complaintId: string }
```

## Steps

1. Implement `refunds.status`. Scope by `mobile` — a refund reference alone
   must not be enough to read someone's refund. Unknown ref or mismatched
   mobile → `NOT_FOUND`.
2. Populate `expectedBy` when the refund row is created (task 05), not here.
   Pick a realistic offset and name the constant. Pain point 03's honest
   position is that this build does not make bank settlement faster — it
   removes the silence. Do not model instant credit.
3. Implement `refunds.complaint`. Verify the referenced ticket exists and
   belongs to that mobile before accepting; otherwise `NOT_FOUND`. Insert
   into `refund_complaints` and return the id.
4. Rate-limit `refunds.complaint` per mobile. `RATE_LIMITED` is already a
   declared error and currently has no user anywhere in the codebase; this
   is a natural first one. Keep it simple — a count of recent rows for that
   mobile is enough, no new infrastructure.
5. Wire both into `src/api/fns.ts` and the relevant page forms. Check
   `src/data/page-forms.ts` for the existing form definitions before adding
   any new UI.

## Acceptance criteria

- [x] Both operations appear in the `router` export.
- [x] Cancelling a ticket (task 05) then calling `refunds.status` with the
      persisted refund ref finds the refund. The frozen `tickets.cancel`
      contract does not return a ref.
- [x] `refunds.status` with a valid ref but the wrong mobile throws
      `NOT_FOUND`.
- [x] A complaint against a ticket the mobile doesn't own throws `NOT_FOUND`.
- [x] Exceeding the complaint rate limit throws `RATE_LIMITED`.
- [x] A `message` under 10 characters is rejected by contract validation.

## Out of scope

Real bank settlement. Status transitions past `initiated` — nothing in this
build moves a refund to `credited`, and that is the honest behaviour.
Complaint resolution workflow.
