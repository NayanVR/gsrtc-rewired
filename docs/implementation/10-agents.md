# 10 — Agents

**Status:** done
**Depends on:** 07
**Phase:** 4
**Pain point:** —

## Goal

Implement the four `agents.*` operations — the booking-agent channel.

Lowest priority on the board. Phase 4 in the migration plan. Do tasks 03–06
first; they carry the pain-point value.

## Current state (verified)

- **No `agents.*` handler exists.** All four are declared in
  `src/api/contract/agents.ts` and absent from the `router` export.
- **There is no agents table in `src/db/schema.ts`.** Unlike every other
  domain, this one has no storage scaffolded. This task must add it — the
  only task on the board that introduces new tables.

## Contract (frozen)

```
agents.register    in: { name, mobile, email, pan /^[A-Z]{5}\d{4}[A-Z]$/, division }  out: { applicationNo }
agents.login       in: { agentId, password }        out: Session
agents.allotment   in: { agentCode }                out: { seats: number, routes: string[] }
agents.eTopStatus  in: { transactionId }            out: { amount, status }
```

## Steps

1. Add an `agents` table. Mirror the existing conventions in
   `src/db/schema.ts`: text primary key, `createdAt` with `defaultNow()`,
   status as a `text` column with an `enum` constraint, an index on the
   lookup column. Read the file first and match it.
2. **PAN is personal data.** Do not log it, do not return it in any response,
   and do not put it in an error message. The contract's outputs don't
   include it — keep it that way.
3. Implement `agents.register` → application number, status `applied`.
4. Implement `agents.login`. Reuse task 07's session helper and cookie
   handling — do not write a second auth path. If agent passwords are out of
   scope like `auth.login`, throw `UNAUTHORIZED` with a comment saying why,
   consistently with task 07's decision.
5. Implement `agents.allotment` and `agents.eTopStatus`, session-gated.
   Unknown agent code or transaction → `NOT_FOUND`.

## Acceptance criteria

- [x] All four operations appear in the `router` export.
- [x] The new table follows the existing schema conventions and has a
      committed migration.
- [x] An invalid PAN is rejected by contract validation.
- [x] PAN never appears in any response body or error message.
- [x] `agents.allotment` and `agents.eTopStatus` throw `UNAUTHORIZED` without
      a session.
- [x] There is exactly one session implementation in the codebase, shared
      with task 07.

## Completion notes

- `agents.login` returns the contract's typed `UNAUTHORIZED` error. Agent
  credentials and account linking are out of scope; creating a second password
  or cookie path would violate the Better Auth single-session boundary.
- Registration validation errors are redacted at the server-function API
  boundary because oRPC's default validation details retain rejected inputs.

## Out of scope

Agent commission calculation. E-Top wallet top-ups for agents. Agent
onboarding approval workflow. Any real agent-network integration.
