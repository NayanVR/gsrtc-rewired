# 08 — Wallet

**Status:** done
**Depends on:** 07
**Phase:** 2, 3
**Pain point:** 02

## Goal

Implement the three `wallet.*` operations behind a real session.

## Current state (verified)

- **No `wallet.*` handler exists.** All three are declared in
  `src/api/contract/wallet.ts` and absent from the `router` export.
- `wallet_accounts` and `wallet_transactions` tables exist and are unused.
- Both FK into the user table. Task 07 **deletes the old `users` table** and
  repoints those FKs at better-auth's user table — so read the current
  `src/db/schema.ts` rather than assuming, and never look a wallet up by
  mobile. Wallet is the one domain gated behind a real session.
- `src/components/wallet-panel.tsx` exists. Read it before building UI — it
  may already render against the contract types.
- `wallet.topUp`'s `method` is `v.picklist(["upi", "card", "netbanking"])`.
  `mock-payment.ts` declares `PaymentMethod` as
  `"upi" | "card" | "netbanking" | "wallet"` — **these already disagree.**
  Reconcile them in this task; the contract wins.

## Contract (frozen)

```
wallet.account   out: { balance, kycStatus, linkedMobile }
wallet.passbook  in: PageInput  out: { balance, transactions: Transaction[] }
wallet.topUp     in: { amount >= 10, method }  out: { balance, transactionId }
```

Note `wallet.account` and `wallet.passbook` take no mobile input — they read
the session. Every one of these three is session-gated.

## Steps

1. Use task 07's session helper on all three handlers. No mobile parameter
   anywhere.
2. Implement `wallet.account` — create the account row lazily on first read
   if absent, with zero balance and `kycStatus: "none"`.
3. Implement `wallet.passbook` with the `PageInput` pagination the contract
   declares (`page`, `pageSize`, defaults 1 and 20). Newest first.
4. Implement `wallet.topUp`: call `mockCharge()`, then insert the credit
   transaction and update the balance **in one transaction**. Same rule as
   task 04 — no window where the charge succeeded and the balance didn't move.
5. `Transaction.amount` is documented as signed (credit +, debit −) but
   `wallet_transactions` stores an unsigned `amount` plus a `type` column.
   Handle the conversion at the boundary and make the direction explicit; a
   sign error here is a money bug.
6. Reconcile `PaymentMethod` in `mock-payment.ts` with the contract picklist.

## Acceptance criteria

- [x] All three operations appear in the `router` export.
- [x] All three throw `UNAUTHORIZED` without a session.
- [x] A top-up increases the balance by exactly the amount, and the passbook
      shows a matching credit.
- [x] Debits render negative in `Transaction.amount` and credits positive.
- [x] A failing charge leaves the balance unchanged and writes no transaction.
- [x] `wallet.topUp` with amount 9 is rejected by contract validation.
- [x] Pagination returns disjoint pages and respects `pageSize`.
- [x] `PaymentMethod` and the contract picklist agree.

## Completion note

An authenticated email/password user may not yet have a verified mobile number
until task 14. `WalletAccount.linkedMobile` is therefore optional and the UI
shows the unlinked state instead of fabricating a number. Wallet ownership
continues to use the Better Auth user id only.

## Out of scope

Real payment gateway. KYC verification flow. Wallet as a booking payment
source — that would change `booking.create`'s contract and is a separate
decision. Withdrawals.
