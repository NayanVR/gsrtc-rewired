# 14 — Mobile OTP (better-auth phone-number plugin)

**Status:** done
**Depends on:** 07
**Phase:** 2
**Pain point:** —

## Goal

Add mobile + OTP sign-in, satisfying `auth.otpRequest` and `auth.otpVerify`.

This task got substantially smaller than originally planned. It was going to
hand-roll OTP over an `otp_codes` table with its own session issuance. It no
longer does: task 07 established better-auth as the single identity and
session layer, and better-auth's **phone-number plugin** already does the
OTP work. Configure it; don't rebuild it.

## Current state

- `auth.otpRequest` and `auth.otpVerify` are declared in
  `src/api/contract/auth.ts` and absent from the `router` export.
- Task 07 deletes `otp_codes` and enables the phone-number plugin, so the
  user table already has `phoneNumber` and `phoneNumberVerified`.
- Domain tables key off a plain `mobile` text column with no FK to any user
  table. That stays — guest booking without an account must keep working.

## What the plugin gives you

Verified against the docs (re-check against the installed version):

| Config | Purpose |
|---|---|
| `sendOTP({ phoneNumber, code })` | Required. Your delivery callback. |
| `otpLength` | Default 6. The contract accepts 4–6. |
| `expiresIn` | Default 300s. |
| `allowedAttempts` | Default 3. Brute-force protection. |
| `phoneNumberValidator` | Enforce the 10-digit rule. |
| `signUpOnVerification` | Creates an account from a phone number alone. |
| `requireVerification` | Blocks sign-in until the phone is verified. |

Client methods: `authClient.phoneNumber.sendOtp({ phoneNumber })` and
`authClient.phoneNumber.verify({ phoneNumber, code })`.

So expiry, attempt capping, and session issuance are **already handled**.
Do not reimplement them, and do not add a rate-limit table — check whether
`allowedAttempts` plus better-auth's own rate limiting covers the requirement
before building anything.

## Steps

1. Configure the plugin in `src/lib/auth.ts`. Set `phoneNumberValidator` to
   match the contract's `Mobile` schema (`/^\d{10}$/` in
   `src/api/schemas.ts`) so validation cannot drift between the two.
2. Implement `sendOTP` as a stub behind one named function, the way
   `src/lib/mock-payment.ts` does. In development surface the code through
   that stub's return value — `AGENTS.md` forbids `console.log` in committed
   code, so do not log it.
3. **`signUpOnVerification` needs `getTempEmail`.** better-auth's
   `user.email` is notNull, so a phone-only signup gets a synthetic address.
   Accept this — it is the library's sanctioned mechanism and `email` is not
   a key any domain table joins on — but make the generated value obviously
   synthetic and never display it as the user's email in the UI.
4. Reconcile the contract with the plugin. `auth.otpRequest` returns
   `{ requestId }`; the plugin's flow is keyed by phone number, not a request
   id. Either:
   - implement the two operations as thin wrappers that carry a `requestId`
     of your own over the plugin's calls, or
   - leave both unimplemented and let the client SDK drive OTP directly,
     documenting that in `src/api/contract/auth.ts` the way task 07 did for
     `auth.login`.

   The second is better-auth's own recommendation (the client SDK should
   handle auth rather than server actions wrapping `auth.api`) and is less
   code. Prefer it unless something concrete needs the oRPC path. Record the
   choice and the reason.
5. Resolve `auth.login` (`{ mobile, password }`), left open by task 07. The
   plugin supports phone + password sign-in, so this is now implementable.
   Either implement it or confirm it stays out of scope — do not leave it
   ambiguous a second time.
6. Handle the collision case: a signed-in email/password user verifies a
   phone number **already attached to another account**. Decide the
   behaviour and test it. Silently reassigning a phone number between
   accounts would be a real security bug, and `phoneNumber` is the value
   every domain table keys off.

## Implementation decision

The browser uses Better Auth's `phoneNumber.sendOtp` and `phoneNumber.verify`
client SDK methods directly. `auth.otpRequest` and `auth.otpVerify` therefore
remain deliberately unimplemented: their `requestId` model cannot faithfully
represent Better Auth's phone-number-keyed verification flow, and wrapping the
library's session endpoints would add a second auth boundary. `auth.login`
also remains deliberately unimplemented because mobile OTP accounts do not
have credential-password records.

`sendMockOtp` is the single development delivery seam. It retains the latest
code for five minutes and the login screen displays it in the OTP-entry view.
It never logs the code. Production returns it only when the deployment
explicitly sets `OTP_DELIVERY_MODE=mock`; otherwise it returns no code. Replace
the mock with an SMS provider before enabling public passenger authentication.

## Acceptance criteria

- [x] A user can sign in with mobile + OTP and lands with a session
      indistinguishable from an email/password one.
- [x] That session works with task 07's session helper **with no changes to
      that helper**. This is the test proving there is still one session
      system.
- [x] An expired code is rejected.
- [x] Exceeding `allowedAttempts` stops accepting that code.
- [x] The OTP is never logged, and is returned in production only when the
      deployment explicitly enables mock OTP mode.
- [x] `phoneNumberValidator` and the contract's `Mobile` schema agree, tested.
- [x] Attaching a phone already owned by another account is rejected, tested.
- [x] A synthetic signup email is never displayed to the user as their email.
- [x] The status of `auth.otpRequest` / `auth.otpVerify` / `auth.login` is
      unambiguous in `src/api/contract/auth.ts` — implemented, or documented
      as deliberately not.
- [x] No `otp_codes` table was reintroduced.

## Out of scope

Real SMS delivery. WhatsApp OTP. Password reset over OTP. Bridging to
GSRTC's real identity system.

## Reference

- <https://www.better-auth.com/docs/plugins/phone-number>

Written against the docs as of 2026-08-22; verify against the installed
version.
