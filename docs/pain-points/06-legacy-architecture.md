# Legacy web architecture — heavy, fragmented, non-responsive

## The complaint

- General complaints about the web portal/app "quality" and development,
  independent of any specific transaction failure.
- Reviews describing the site as dated, non-responsive on mobile, and slow.

## Why this happens in the current architecture

This section has directly measurable claims, so it separates what was
measured from what is inferred. The first thing to note is that the public
site and the booking engine are *different systems*.

**The informational site** — `gsrtc.in/site/`, nginx-served (`www.gsrtc.in`
is a 199-byte `<meta http-equiv="refresh">` stub redirecting to it):

- **23 external assets, none deferred.** 12 scripts + 11 stylesheets, with
  zero `defer` or `async` attributes anywhere. About 10 are strictly
  render-blocking (9 head stylesheets plus one head script); the remaining
  11 sit at end-of-body and are parser-blocking. Every page load pays that
  cost, felt worst on the low-end/3G devices a large share of GSRTC's
  ridership uses.
- **jQuery 3.6.4 + jQuery UI 1.13.2 + Bootstrap 5**, with **jQuery and
  jQuery UI each loaded twice** — once from a local copy, once from
  `code.jquery.com`. Duplicated bytes, plus a third-party CDN in the
  critical path.
- It *is* responsive: `<meta name="viewport" content="width=device-width">`
  and a Bootstrap grid. Reviews describing the site as non-responsive are
  better explained by the booking flow below than by this site.
- Analytics is still a `UA-` Universal Analytics property, which stopped
  processing data in July 2023 — so none of the above is being measured.

**The booking engine** — `/OPRSOnline`, `/OPRSWeb`, `/OPRSPhonepe` — is a
different stack: Java web applications behind nginx, addressed as **Struts
actions** (`.do`), returning server-rendered pages. `prePrintTicket.do`
carries no viewport meta tag at all; these pages, not the marketing site,
are the non-responsive ones.

- **Functionality is split across independently-deployed modules.** Each of
  the three sets its own `JSESSIONID` scoped to its own path
  (`Path=/OPRSOnline/`, `Path=/OPRSWeb/`, `Path=/OPRSPhonepe/`) — they don't
  share session state. Passes are further out still: `pass.gsrtc.in` runs
  **IIS 8.5 / ASP.NET** (Windows Server 2012 R2, end-of-life since October
  2023), a different stack on a different host. That is *why* behaviour is
  inconsistent between booking, passes and payment — different code,
  different age, different runtime — not a coincidence.

Inferred rather than measured:

- **UI and backend are the same layer.** A per-action Struts/JSP model
  renders directly from server-side state with no API boundary in between,
  so there's no typed contract anything else (a future app, an integrator,
  even the web frontend itself) could rely on — every consumer
  re-implements its own understanding of what the backend returns, which is
  how the gender-encoding mismatch and inconsistent field availability
  (Doc 01, 05) become possible in the first place.

## Plan of action

This is the whole premise of `docs/migration-plan.md`: a
**strangler-fig migration**, not a rewrite —

- Keep every existing backend system (OPRS booking engine, payment gateway,
  wallet, pass issuance, live-tracking feed) running as-is.
- Put **one typed contract** (`src/api/contract/`, ~35 operations across 10
  domains) in front of them — the API layer adapts to OPRS's quirks once,
  centrally, instead of every client re-solving the same problems.
- A new SSR frontend (TanStack Start/React) consumes that contract directly
  — no duplicate assumptions between "what the API returns" and "what the
  page expects," because the browser client is *derived* from the same
  contract the server implements.
- The same contract emits an OpenAPI spec, so any future integrator (mobile
  app, agents, third parties) gets one documented, versioned surface instead
  of reverse-engineering JSP form submissions.
- Rollout is phased and reversible per feature (see `docs/migration-plan.md`
  §6) — nothing is cut over until its replacement is proven, so this fixes
  the architecture without repeating the "big rewrite that breaks things"
  risk that makes institutions avoid touching working legacy systems in the
  first place.

## Sources

Observable facts (Verified 2026-08-22. Asset counts from the served HTML of
`gsrtc.in/site/`; stack details from response headers.)

- <https://gsrtc.in/site/> — 12 external `<script src>` + 11
  `<link rel=stylesheet>` = 23, none with `defer`/`async`; 1 head script,
  11 end-of-body; jQuery 3.6.4 and jQuery UI 1.13.2 each loaded twice
  (local + `code.jquery.com`); `<meta name="viewport" content="width=device-width, initial-scale=1.0">`
  present; analytics tag `UA-53728148-2`.
- <https://www.gsrtc.in/> — 199-byte `<meta http-equiv="refresh">` stub.
- <https://www.gsrtc.in/OPRSOnline/prePrintTicket.do> — Struts `.do`,
  `JSESSIONID; Path=/OPRSOnline/`, no viewport meta tag.
- <https://www.gsrtc.in/OPRSWeb/>, <https://gsrtc.in/OPRSPhonepe/preGatewayTransactionStatus.do>
  — each with its own path-scoped `JSESSIONID`.
- <https://pass.gsrtc.in/> — `Server: Microsoft-IIS/8.5`, `ASP.NET_SessionId`.
