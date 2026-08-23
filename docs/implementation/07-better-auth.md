# 07 — better-auth: email/password & sessions

**Status:** done
**Depends on:** 02
**Phase:** 2
**Pain point:** —

## Goal

Stand up [better-auth](https://www.better-auth.com) as the **single session
layer** for the whole application, with email/password sign-up and sign-in.

Every session-gated task on this board (08 wallet, 10 agents, 14 mobile OTP)
builds on what this task produces. There must be exactly one session
implementation in the codebase when this is done.

## Current state (verified)

- `better-auth` is **not** in `package.json`.
- No auth of any kind is implemented. All five `auth.*` operations are
  declared in `src/api/contract/auth.ts` and absent from the `router` export.
- `users` (mobile-keyed) and `otp_codes` exist and are unused.
- Routes are file-based under `src/routes/`, generated into
  `src/routeTree.gen.ts` by `bun run generate-routes`. There is currently no
  `src/routes/api/` directory.
- The import alias is `#/*` (see `package.json` `imports`), **not** `@/*`.
  better-auth's docs use `@/`; translate every example.

## Decision: better-auth owns identity outright

**Delete the `users` table. Delete `otp_codes`.** better-auth's user table is
the only user table in this application.

This is cheaper than it looks. Verified dependency check on `users`:

- `wallet_accounts.userId` → `users.id` (`src/db/schema.ts:121`)
- `wallet_transactions.userId` → `users.id` (`src/db/schema.ts:136`)
- **Nothing else.** No handler reads `users`; `src/db/client.ts` only
  registers it in the schema object.

Every other domain — `bookings.contactMobile`, `passes.mobile`,
`refunds.mobile`, `refund_complaints.mobile` — keys off a plain `mobile` text
column with **no foreign key**. That is deliberate and it stays: a passenger
can book without an account, which is how the current system works and how
this one should keep working. Do not add FKs from those tables to the user
table.

### Where mobile lives

better-auth's `user.email` is notNull and there is no mobile column. Use the
**phone-number plugin**, which adds `phoneNumber` and `phoneNumberVerified`
to the user table. Do not hand-roll this as an `additionalFields` entry — the
plugin also brings OTP issuance, expiry, and brute-force protection that task
14 would otherwise have to write.

Enable the plugin in this task so the column exists. Task 14 wires the
actual OTP flow.

### Migration

1. Repoint both wallet FKs at better-auth's user table.
2. Drop `users` and `otp_codes` from `src/db/schema.ts`, and remove them from
   the schema object in `src/db/client.ts`.
3. `bun run db:generate` — **read the generated SQL before running it.** This
   is a destructive migration that drops two tables. Task 02 is already
   `done` and may have written rows; confirm what's in there first.
4. Commit the generated SQL.

The schema comment above `users` ("A user row exists once a mobile number has
completed OTP verification…") describes the old design and must be deleted
with the table, not left to mislead.

## The contract question

better-auth serves its own HTTP surface at `/api/auth/*` and its own client
SDK. **Do not proxy email/password sign-in through the oRPC contract.**
better-auth's own guidance is that the client SDK should handle
authentication rather than server actions wrapping `auth.api`.

Concretely, for the frozen `auth.*` contract:

| Operation | What to do |
|---|---|
| `auth.session` | Implement — read the better-auth session, map to the contract's `User`. `UNAUTHORIZED` when absent. |
| `auth.logout` | Implement — delegate to better-auth. |
| `auth.login` | Declares `{ mobile, password }`, which is **not** what this task ships. Leave unimplemented (absent from the `router` export) with a comment in `auth.ts` explaining that email/password lives at `/api/auth/*` and mobile login is task 14. |
| `auth.otpRequest` / `auth.otpVerify` | Task 14, via the phone-number plugin. |

This is a genuine contract gap: the contract has no email/password operation.
Raise it rather than bending `auth.login`'s input to fit. See
`00-conventions.md` — the contract is frozen; noticing a gap is the correct
outcome here, not editing it.

## Steps

1. Install `better-auth`. Add to `.env.example`, following the existing
   commented style in that file:
   - `BETTER_AUTH_SECRET` — 32+ chars, no default value committed
   - `BETTER_AUTH_URL` — base URL, `http://localhost:3000` in dev (the `dev`
     script already pins port 3000)

2. Create `src/lib/auth.ts` — the server instance:
   - `betterAuth({ ... })` with `emailAndPassword: { enabled: true }`
   - `database: drizzleAdapter(getDb(), { provider: "pg" })`, reusing
     `getDb()` from `src/db/client.ts`. Do **not** open a second connection
     pool.
   - Add the `tanstackStartCookies()` plugin. It must be **last** in the
     plugins array — ordering is significant.
   - This file is server-only. It pulls in `getDb()`, which throws without
     `DATABASE_URL`. Never import it from a component.

3. Generate the schema. better-auth's CLI emits the four tables; commit them
   into `src/db/schema.ts` alongside the existing tables so there is one
   schema file, then run `bun run db:generate` and `bun run db:migrate` per
   `00-conventions.md`. Commit the generated SQL.

   With `users` gone there is no naming collision left to manage. Keep
   better-auth's default table names unless something else forces a change.

4. Mount the handler at `src/routes/api/auth/$.ts`:
   ```ts
   export const Route = createFileRoute("/api/auth/$")({
     server: { handlers: { GET: ({ request }) => auth.handler(request),
                           POST: ({ request }) => auth.handler(request) } },
   });
   ```
   Then run `bun run generate-routes` and commit `src/routeTree.gen.ts`.

5. Create `src/lib/auth-client.ts` with `createAuthClient` from
   `better-auth/react`. This one **is** browser-safe — keep the server
   instance and the client strictly separate files so `src/lib/auth.ts`
   never reaches the bundle.

6. Write the **session helper** every gated handler will use. One function,
   used everywhere:
   - reads request headers, calls `auth.api.getSession({ headers })`
   - throws `errors.UNAUTHORIZED()` when there is no session
   - returns the user

   Tasks 08, 10 and 14 all depend on this. Do not let them each write their
   own check.

7. Implement `auth.session` and `auth.logout` in the router on top of that
   helper. Map better-auth's user to the contract's `User`
   (`{ id, mobile, name }`) — note `User.mobile` is a required 10-digit
   string in `src/api/schemas.ts` and an email/password user **has no
   mobile**. This is the bridge problem; resolve it explicitly in step 8.

8. Map better-auth's user to the contract's `User` (`{ id, mobile, name }`).
   `User.mobile` is a **required** 10-digit string in `src/api/schemas.ts`,
   and an email/password user who has not verified a phone has no mobile.

   This is a contract gap, not something to paper over. Either `User.mobile`
   becomes optional, or `auth.session` cannot return an email-only user.
   Raise it — do not emit an empty string or a placeholder to satisfy the
   validator. Note that `Session`/`User` are used by `agents.login` too, so
   the decision reaches task 10.

9. Build minimal sign-up / sign-in / sign-out UI using the existing
   primitives in `src/components/ui/`. Read `field.tsx`, `input.tsx` and
   `button.tsx` first; do not add new form primitives. Per `AGENTS.md`:
   labels on every input, and errors announced, not colour-only.

## Acceptance criteria

- [x] `bun run dev` starts with better-auth mounted; `/api/auth/*` responds.
- [x] A user can sign up with email + password, sign out, and sign back in.
- [x] Passwords are never stored in plaintext and never appear in any
      response body, error message, or log.
- [x] The session cookie is HttpOnly and SameSite.
- [x] `auth.session` returns the current user and throws `UNAUTHORIZED`
      without a cookie.
- [x] `auth.logout` ends the session; a subsequent `auth.session` throws
      `UNAUTHORIZED`.
- [x] There is exactly **one** session helper in the codebase.
- [x] `src/lib/auth.ts` is not reachable from the browser bundle.
- [x] `users` and `otp_codes` no longer exist in `src/db/schema.ts` or in
      `src/db/client.ts`'s schema object.
- [x] Both wallet FKs point at better-auth's user table and wallet still
      typechecks.
- [x] The user table has `phoneNumber` / `phoneNumberVerified` columns.
- [x] The destructive migration was reviewed before being run, and is
      committed.
- [x] No placeholder value is written to satisfy `User.mobile`; the gap is
      raised instead.
- [x] The `auth.login` contract gap is documented in `src/api/contract/auth.ts`.
- [x] `bun x ultracite check` and `bun run test` pass.

## Completion note

The frozen contract had a second incompatibility: its required `User.mobile`
could not represent a valid email/password account before task 14 verifies a
phone number. `User.mobile` is therefore optional; `auth.session` returns it
only after phone verification. No placeholder mobile value is generated.

## Out of scope

Mobile OTP (task 14). Social/OAuth providers. Email verification and password
reset — both need a real mail sender; add them when one exists. Agent login
(task 10). Bridging to GSRTC's real identity system. Role-based access.

## Reference

- Installation: <https://www.better-auth.com/docs/installation>
- TanStack Start integration: <https://www.better-auth.com/docs/integrations/tanstack>
- Database/schema: <https://www.better-auth.com/docs/concepts/database>
- Phone number plugin: <https://www.better-auth.com/docs/plugins/phone-number>

Verify these against the installed version before following them — this task
was written against the docs as of 2026-08-22 and better-auth moves quickly.
