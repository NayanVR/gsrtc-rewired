# 09 — Passes

**Status:** done
**Depends on:** 02
**Phase:** 3
**Pain point:** —

## Goal

Implement the three `passes.*` operations.

Context worth knowing: GSRTC's real pass system is not part of the booking
stack at all — it runs on a separate host on IIS 8.5 / ASP.NET (see
`../pain-points/06-legacy-architecture.md`). This task does not integrate
with it. It implements the contract against this project's own storage, which
is the point: one contract, whatever sits behind it.

## Current state (verified)

- **No `passes.*` handler exists.** All three are declared in
  `src/api/contract/passes.ts` and absent from the `router` export.
- The `passes` table exists and is unused. It has a `renewedFrom` column
  the contract's `Pass` output does not expose — use it for the renewal
  chain, don't surface it.

## Contract (frozen)

```
passes.apply   in: { name, mobile, from, to, type, photoRef? }  out: { applicationNo }
passes.renew   in: { passNo }                                   out: { applicationNo }
passes.status  in: { applicationNo }                            out: Pass
```

`type` is `Daily | Monthly | Quarterly | Student`.

## Steps

1. Implement `passes.apply`. Compute `validFrom`/`validTo` from the pass type
   — the durations belong in one named constant map, not inline arithmetic
   per branch.
2. Implement `passes.renew`: look up the existing pass, create a new row with
   `renewedFrom` set to the old `applicationNo`, and start validity from the
   later of today and the old pass's `validTo` so renewal never silently
   loses days. Renewing an unknown pass → `NOT_FOUND`.
3. Implement `passes.status` → `NOT_FOUND` when absent.
4. `issueLocation` is `notNull` in the schema but absent from the `apply`
   input. Decide a default and document it in a comment, or raise this as a
   contract gap. Do not silently write an empty string.

## Acceptance criteria

- [x] All three operations appear in the `router` export.
- [x] Each pass type produces the correct `validTo`, tested per type.
- [x] Renewing extends from the old `validTo`, not from today, when the old
      pass is still valid.
- [x] Renewing sets `renewedFrom` and `passes.status` never exposes it.
- [x] `passes.status` on an unknown application number throws `NOT_FOUND`.
- [x] `issueLocation` is never written as an empty string.

## Completion notes

- Validity uses calendar durations: Daily (1 day), Monthly (1 calendar month),
  Quarterly (3 calendar months), and Student (1 calendar month). The frozen
  contract has no academic-term input, so the Student duration is deliberately
  the monthly concession default until that input exists.
- The contract does not select a collection counter. Applications use the route
  origin as their non-empty issue location (for example, `Ahmedabad Bus Station`).

## Out of scope

Integration with `pass.gsrtc.in`. Photo upload — `photoRef` is an opaque
string; do not build storage for it. Concession eligibility verification.
Physical card issuance.
