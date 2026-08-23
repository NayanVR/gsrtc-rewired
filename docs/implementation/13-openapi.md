# 13 — OpenAPI spec

**Status:** done
**Depends on:** —
**Phase:** 4
**Pain point:** 06

## Goal

Actually emit the OpenAPI spec that three documents already claim exists.

## Current state (verified)

- `src/api/contract.ts:14` says the contract "is also the source for the
  OpenAPI spec handed to GSRTC's existing integrators." It is a comment.
- `../migration-plan.md` references the OpenAPI spec in five places
  (lines 16, 37, 53, 80, 99–100).
- **No generator is wired anywhere.** No `@orpc/openapi` dependency, no
  generation script, no committed spec.
- Every contract procedure already declares `method`, `path`, and `summary`,
  so the inputs for generation are complete. Nothing about the contract needs
  to change.

## Steps

1. Add oRPC's OpenAPI generator package, matching the `@orpc/*` versions
   already in `package.json` (currently `^1.15.0` — keep them aligned).
2. Add a script under `scripts/` that generates the spec from `appContract`
   and writes it to a committed path. Add a `package.json` script for it.
   Follow the existing script naming style.
3. Commit the generated spec. A spec that only exists after someone runs a
   command is not a spec integrators can rely on.
4. Add a test asserting the committed spec is current — regenerate and
   compare. Otherwise it silently rots the first time a contract changes,
   which is the failure this whole task is meant to prevent.
5. Optionally serve it from a route. Only if it is genuinely wanted; the
   committed file is the deliverable.

## Acceptance criteria

- [x] Running the script produces a valid OpenAPI document.
- [x] The spec contains all 34 operations across the 10 domains.
- [x] Paths and methods match the contract's `.route()` declarations exactly.
- [x] Typed errors from `src/api/contract/base.ts` appear as documented
      responses.
- [x] A test fails when the contract changes and the spec is not regenerated.
- [x] The spec is committed.

## Completion notes

- Run `bun run openapi:generate` to regenerate `docs/openapi.json` after a
  contract change.
- The generated document uses OpenAPI 3.1.1 and includes oRPC's typed error
  response schemas.

## Out of scope

Publishing or hosting the spec. Versioning strategy. Client SDK generation.
An interactive docs UI. Deprecating the JSP entry points — that is Phase 4
organisational work, not code.
