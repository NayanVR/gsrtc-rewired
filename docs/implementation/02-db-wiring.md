# 02 — Wire the database

**Status:** done
**Depends on:** 01
**Phase:** 0
**Pain point:** 01, 02

## Goal

Connect the scaffolded Postgres layer to the running application, and fix the
one schema flaw that undermines pain point 05 before any data is written
through it.

## Current state (verified)

- `src/db/schema.ts` defines all 10 tables. `drizzle/0000_daily_power_pack.sql`
  exists. `drizzle.config.ts` exists.
- `src/db/client.ts` exports `getDb()`.
- **`getDb()` has zero callers.** The persistence layer is entirely
  disconnected from the router. Commit `a5c8d0c` describes it as "unwired."
- `src/api/router.ts` implements 7 of 34 operations, all from synthetic data.

## The schema flaw

`bookings.passengers` is:

```ts
jsonb("passengers")
  .$type<{ name: string; age: number; gender: string; seatNo: string }[]>()
```

`gender` is `string`. The contract's `Gender` is
`v.picklist(["male", "female", "other"])` (`src/api/schemas.ts`).

Pain point 05 is *specifically* about a gender value changing between the
booking form and the printed ticket. The one place this project could
reproduce that bug is an untyped enum at the storage boundary. Fix it here,
before task 04 starts writing bookings.

## Scope

- `src/db/schema.ts` — type the passengers jsonb against the contract types.
- `.env.example` — confirm `DATABASE_URL` is documented.
- New: `src/db/README.md` or a short comment block — how to get a local DB up.
- New test: `src/db/schema.test.ts`.

## Steps

1. Import the inferred passenger type from `src/api/schemas.ts` rather than
   re-declaring the shape inline, so the DB column and the contract cannot
   drift. Export a `Passenger` type from `schemas.ts` if one isn't exported
   yet (the file already exports `Trip`, `Booking`, `Seat` and others this
   way).
2. Apply the same treatment anywhere else a jsonb column restates a contract
   shape.
3. Regenerate migrations (`bun run db:generate`). A `$type` change is
   compile-time only and may produce no SQL — that is expected and fine.
4. Document local setup: any Postgres works. Note that `getDb()` throws a
   descriptive error when `DATABASE_URL` is missing, and that this is
   deliberate.
5. Do **not** convert any existing handler to read from the DB in this task.
   Tasks 03+ do that, one domain at a time.

## Acceptance criteria

- [x] `bookings.passengers` is typed from the contract's passenger type, not
      an inline shape with `gender: string`.
- [x] Assigning `gender: "M"` to a passengers row fails typecheck.
- [x] A test round-trips a booking row through the schema types and asserts
      the gender value survives unchanged.
- [x] `bun run db:generate` produces no unexpected destructive SQL.
- [x] Local setup is documented in one place.

## Out of scope

Migrating handlers to the DB. Connection pooling tuning. Seed data — task 03
introduces it if needed.
