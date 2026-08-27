# Implementation plan — task board

Task specs for building out `gsrtc-rewired`. **These are plans, not code.**
Each file is one self-contained unit of work with its own acceptance criteria.

Read [`00-conventions.md`](./00-conventions.md) first. It contains the rules
that apply to every task; individual task files do not repeat them.

## How to use this board

1. Pick the lowest-numbered task whose dependencies are all `done`.
2. Read that task file end to end before writing code.
3. Implement it. Do not start a second task in the same change.
4. Tick the acceptance criteria in the task file, set `Status: done` in its
   header, and update the row below in the same commit.

## Board

| #   | Task                                                             | Status | Depends on | Phase | Pain point |
| --- | ---------------------------------------------------------------- | ------ | ---------- | ----- | ---------- |
| 01  | [Test harness](./01-test-harness.md)                             | done   | —          | 0     | —          |
| 02  | [Wire the database](./02-db-wiring.md)                           | done   | 01         | 0     | 01, 02     |
| 03  | [Seat inventory & holds](./03-seat-inventory.md)                 | done   | 02         | 3     | 01         |
| 04  | [Booking create & payment idempotency](./04-booking-payment.md)  | done   | 03         | 3     | 02         |
| 05  | [Tickets](./05-tickets.md)                                       | done   | 04         | 3     | 03, 05     |
| 06  | [Refunds](./06-refunds.md)                                       | done   | 05         | 2, 3  | 03         |
| 07  | [better-auth: email/password & sessions](./07-better-auth.md)    | done   | 02         | 2     | —          |
| 08  | [Wallet](./08-wallet.md)                                         | done   | 07         | 2, 3  | 02         |
| 09  | [Passes](./09-passes.md)                                         | done   | 02         | 3     | —          |
| 10  | [Agents](./10-agents.md)                                         | done   | 07         | 4     | —          |
| 11  | [Search time-window filtering](./11-search-time-window.md)       | done   | —          | 1     | 01         |
| 12  | [Tracking degradation & staleness](./12-tracking-degradation.md) | done   | —          | 1     | 04         |
| 13  | [OpenAPI spec](./13-openapi.md)                                  | done   | —          | 4     | 06         |
| 14  | [Mobile OTP (phone-number plugin)](./14-mobile-otp.md)           | done   | 07         | 2     | —          |
| 15  | [Self-host on a VPS](./15-vps-self-host.md)                      | done   | 02         | 0     | —          |
| 16  | [Dodo Payments (test mode)](./16-dodo-payments.md)               | done   | 04, 08, 15 | 3     | 02         |
| 17  | [Wide events & error handling](./17-wide-events.md)              | done   | 16         | 0     | 05, 06     |
| 18  | [UI components & error states](./18-ui-components.md)            | done   | 17         | 0     | 05         |

Status values: `todo` / `in progress` / `done` / `blocked`.
Phase numbers refer to [`../migration-plan.md`](../migration-plan.md) §6.
Pain point numbers refer to [`../pain-points/`](../pain-points/).

## Suggested order

Tasks 01 and 02 unblock everything else and should be done first.
Tasks 11, 12 and 13 have no dependencies and can be done at any point.
Task 15 is deployment-only and can be done at any point after 02.
The transaction chain 03 → 04 → 05 → 06 is strictly ordered.
Task 16 replaces the simulated charge on both paying surfaces (booking and
wallet) and must come after that chain is green. It needs a public HTTPS URL
for webhooks, which task 15's Dokploy deployment already provides.

Task 18 is front-end only and depends on task 17 for `AppError` and the
reason vocabulary it renders. It can be done at any point after 17.

Task 07 (better-auth) is the single session layer **and the single identity
store**. It deletes the `users` and `otp_codes` tables; better-auth's user
table replaces both, with `phoneNumber` from the phone-number plugin carrying
what `users.mobile` used to. Tasks 08, 10 and 14 build on the session helper
it produces — there must never be a second session implementation, or a
second user table, in this codebase.

Domain tables (`bookings`, `passes`, `refunds`) stay keyed by a plain
`mobile` text column with **no** foreign key to the user table. That is
deliberate: booking without an account must keep working.

## What is deliberately not here

- Real _money_. Task 16 integrates Dodo Payments but is locked to test mode;
  `mockCharge()` stays as the default provider for local development and CI.
- Real OPRS adapters. Every handler reads this project's own storage or
  synthetic data; see `00-conventions.md`.
- Anything requiring GSRTC credentials or infrastructure access.
