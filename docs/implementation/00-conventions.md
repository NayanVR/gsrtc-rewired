# Conventions — read before any task

Rules that apply to every task in this folder.

## The contract is frozen

`src/api/contract/` is the source of truth. **Do not edit contract files to
make an implementation easier.** If a handler cannot satisfy its declared
input/output, that is a finding to raise, not a contract to change.

The contract already defines 34 operations across 10 domains. Every task
below implements handlers for operations that already exist. No task adds a
new operation unless it says so explicitly.

## How a handler is added

`src/api/router.ts` implements the contract via `implement(appContract)`.
Only implemented procedures are exported in the `router` object at the bottom
of the file; unimplemented ones are simply absent and 404 until their task
lands. That pattern stays.

To add a domain:

1. Write handlers with `os.<domain>.<op>.handler(...)`.
2. Add them to the `router` export.
3. Add a `createServerFn` wrapper in `src/api/fns.ts` if the frontend needs
   it. Never import `src/api/server.ts` from a component — it is server-only
   and pulls the whole router into the bundle.

`router.ts` is already ~260 lines. When a domain's handlers exceed roughly
80 lines, move them to `src/api/handlers/<domain>.ts` and import into
`router.ts`. Do not create a barrel file.

## Errors

Use the typed errors from `src/api/contract/base.ts` — `NOT_FOUND`,
`CONFLICT`, `PAYMENT_FAILED`, `RATE_LIMITED`, `UNAUTHORIZED`. Throw via the
`errors` argument the handler receives (`throw errors.NOT_FOUND()`), never a
bare `Error`, and never a generic failure. Doc 05 in the pain points exists
because the legacy system has exactly one error message; do not recreate that.

Every error thrown must be one the contract declares. If a case doesn't fit
an existing error, raise it rather than inventing a sixth.

## Storage

- Schema lives in `src/db/schema.ts` and is already defined for every domain.
  Prefer using the existing tables over adding new ones.
- Get a connection with `getDb()` from `src/db/client.ts`. It throws if
  `DATABASE_URL` is unset — that is intentional.
- Migrations: edit the schema, then `bun run db:generate`, then
  `bun run db:migrate`. Commit the generated SQL in `drizzle/`.
- Money is `numeric(10,2)` in Postgres and comes back as a **string** from
  drizzle. Convert at the boundary; the `Rupees` schema is `v.number()`.

## Time

Timestamps in the contract are ISO strings (`Timestamp` in
`src/api/schemas.ts`). Dates are `YYYY-MM-DD` (`DateStr`). The synthetic trip
generator builds times at `+05:30`. Do not introduce a date library; the
existing code uses `Date` and manual formatting.

## Definition of done

A task is done when all of these hold:

- [ ] Every acceptance criterion in the task file is ticked.
- [ ] `bun x ultracite check` passes.
- [ ] `bun run test` passes.
- [ ] The task's required test exists and fails if the logic is broken.
- [ ] The board row in `README.md` is updated in the same commit.

## Testing

Follow the repo standard in `AGENTS.md`: assertions inside `it()`, no
`.only`/`.skip`, flat suites. One test file per task, colocated as
`src/api/<domain>.test.ts` unless the task says otherwise.

Test the decision, not the plumbing. For a task whose point is "two users
cannot book the same seat," the test that matters is the one that attempts
exactly that and asserts `CONFLICT`.

## Out of scope for every task

Real gateway calls, real OPRS calls, real SMS/email delivery, and any
credential-requiring integration. Where a task needs one of these, it stubs
it behind a named function so the seam is obvious — the way
`src/lib/mock-payment.ts` already does.
