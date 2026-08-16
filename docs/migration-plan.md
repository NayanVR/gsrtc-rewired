# GSRTC Platform Modernisation — Migration Plan

**Prepared for:** GSRTC (Gujarat State Road Transport Corporation) team
**Prepared by:** GSRTC-rewired project
**Status:** Proposal · concept build available for review

---

## 1. Summary

This proposes modernising the GSRTC public web experience **without a risky big-bang
rewrite**. We keep every existing backend system (OPRS booking engine, payment
gateway, wallet, pass issuance, live-tracking feed) running as-is, and place a
**single, type-safe API layer** in front of them. A new, fast, accessible
front-end consumes that API. Existing agents and third parties get a documented
**OpenAPI** interface to the same endpoints.

The migration follows the **strangler-fig pattern**: new surface grows around the
old system feature by feature; nothing is switched off until its replacement is
proven in production.

## 2. Current state

- **Front-end:** jQuery + Bootstrap, ~23 render-blocking assets, server-rendered JSP pages.
- **Back-end:** OPRS (`/OPRSOnline`, `/OPRSWeb`, `/OPRSPass`, `/OPRSPhonepe`) — JSP/servlet endpoints for booking, cancellation, wallet, passes, agents, payments.
- **Other:** live GPS tracking apps, informational pages under `/site/downloads/innerPages/*.html`.

Pain points: dated UX, heavy pages on low-end/3G devices, no typed/documented API, tight coupling between UI and JSP.

## 3. Target architecture

```
        ┌─────────────────────────┐        ┌───────────────────────────┐
        │  New front-end (SSR)    │        │  Agents / 3rd-party / app │
        │  React + TanStack Start │        │  (OpenAPI / REST clients) │
        └───────────┬─────────────┘        └─────────────┬─────────────┘
                    │ typed oRPC client                  │ OpenAPI
                    ▼                                    ▼
        ┌────────────────────────────────────────────────────────────┐
        │        oRPC API layer  (one contract, one source of truth) │
        │   search · booking · tickets · refunds · wallet · passes   │
        │   agents · tracking · auth · content                       │
        └───────────┬────────────────────────────────────────────────┘
                    │ adapters (no rewrite of core systems)
        ┌───────────▼─────────────────────────────────────────────────┐
        │  Existing OPRS engine · Payment gateway · Wallet · Pass     │
        │  issuance · Live-tracking feed · Content                    │
        └─────────────────────────────────────────────────────────────┘
```

- **One contract** (`src/api/contract.ts`) defines every operation's input/output and errors. The server implements it; the browser client is _derived_ from it, so UI and API can never drift.
- The API layer **adapts** to existing OPRS endpoints — it calls them, maps their responses to the typed shapes, and shields the front-end from JSP quirks. Core systems are not rewritten.
- The same contract emits an **OpenAPI spec** so current integrators and the mobile apps get a stable, documented REST surface.

## 4. Why this approach

- **No downtime, no freeze.** OPRS keeps serving live traffic throughout.
- **Reversible per feature.** Each endpoint can fall back to the old page instantly.
- **Type safety end-to-end.** One schema change is caught at compile time across UI + API.
- **Light on the client** — valibot validation and a tiny RPC client keep 3G/low-end devices fast.
- **Vendor-neutral.** Standards-based (web `fetch`, OpenAPI, Standard Schema); no lock-in.

## 5. API contract (already drafted)

The full contract is defined in `src/api/` (10 domains, ~35 operations):

| Domain     | Operations                                                  |
| ---------- | ----------------------------------------------------------- |
| `search`   | trips, cities (autocomplete)                                |
| `booking`  | trip, seatMap, hold, create, get                            |
| `tickets`  | cancel, reschedule, print/SMS, waiting-list status, history |
| `refunds`  | status (enquiry), complaint                                 |
| `wallet`   | account, passbook, top-up                                   |
| `passes`   | apply, renew, status                                        |
| `agents`   | login, register, allotment, e-top status                    |
| `tracking` | vehicle, route                                              |
| `auth`     | OTP request/verify, login, session, logout                  |
| `content`  | page, FAQs                                                  |

Every operation has validated inputs, typed outputs, typed errors, and an OpenAPI method+path.

## 6. Phased rollout

**Phase 0 — Foundations (done in concept)**
Contract defined, front-end shell, design system, informational content migrated. _No production change._

**Phase 1 — Read-only, low-risk**
Implement `search`, `tracking`, `content` against existing feeds. Ship the new home + search-results + tracking + info pages behind a canary URL. Old site remains default.
_Risk: low (no writes, no payments)._

**Phase 2 — Authenticated read**
`auth` (OTP/login) + `tickets.history`, `wallet.account`/`passbook`, `refunds.status`, `passes.status`. Sessions bridged to existing user identity.
_Risk: low–medium (reads behind auth)._

**Phase 3 — Transactions**
`booking.hold`/`create`, `tickets.cancel`/`reschedule`/`print`, `wallet.topUp`, `passes.apply`/`renew`, `refunds.complaint`. Wired to OPRS + payment gateway. Rolled out to a small traffic % with instant fallback to OPRS pages.
_Risk: medium–high — staged canary, feature flags, reconciliation with OPRS._

**Phase 4 — Agents & OpenAPI GA**
`agents.*`, publish the OpenAPI spec, onboard integrators/mobile apps to the documented API. Begin deprecating direct JSP entry points.

**Phase 5 — Cutover & cleanup**
Once each feature's new path is proven, make it default and retire the corresponding legacy page. Old endpoints kept as fallback for one release cycle, then removed.

## 7. Cross-cutting concerns

- **Payments:** the API orchestrates existing gateway flows; no card/PII data added to the new layer. PCI scope unchanged.
- **Auth/session:** bridge to existing GSRTC identity; short-lived tokens; OTP via existing SMS provider.
- **Reliability:** every write is idempotent (hold → confirm), with reconciliation against OPRS as source of truth.
- **Observability:** structured typed errors + request logging at the API layer.
- **Accessibility & language:** English + Gujarati from day one; the accessibility toolbar preserved.
- **Security review** and load testing gate each phase before it goes default.

## 8. What we need from GSRTC

1. Documentation/access to OPRS endpoints (request/response formats) for the adapter layer.
2. A staging environment mirroring OPRS + payment sandbox.
3. Access to the live-tracking data feed.
4. Sign-off on the phased plan and a nominated technical point of contact.

## 9. Indicative timeline

| Phase                | Rough effort         |
| -------------------- | -------------------- |
| 1 — read-only        | 3–4 weeks            |
| 2 — auth read        | 3–4 weeks            |
| 3 — transactions     | 6–8 weeks (staged)   |
| 4 — agents + OpenAPI | 3–4 weeks            |
| 5 — cutover          | ongoing, per feature |

Estimates assume timely access to OPRS specs and a staging environment.

---

_The working concept (design, contract, informational pages) is available to review now. No existing GSRTC system is modified by it._
