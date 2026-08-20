# Legacy web architecture — heavy, fragmented, non-responsive

## The complaint

- General complaints about the web portal/app "quality" and development,
  independent of any specific transaction failure.
- Reviews describing the site as dated, non-responsive on mobile, and slow.

## Why this happens in the current architecture

This one is directly observable rather than inferred, and it's the root
cause underlying most of the other five documents:

- **Server-rendered JSP pages with jQuery + Bootstrap**, roughly 23
  render-blocking assets per page — every page load pays that cost before
  anything is interactive, which is felt worst on the low-end/3G devices a
  large share of GSRTC's actual ridership uses.
- **Functionality split across independently-evolved modules**
  (`/OPRSOnline`, `/OPRSWeb`, `/OPRSPass`, `/OPRSPhonepe`) rather than one
  application — which is *why* behavior is inconsistent between booking,
  passes, and payment (different code, different age, different assumptions),
  not a coincidence.
- **UI and backend are the same layer.** JSP templates render directly from
  server-side state with no API boundary in between, so there's no typed
  contract anything else (a future app, an integrator, even the web
  frontend itself) could rely on — every consumer re-implements its own
  understanding of what the backend returns, which is exactly how the
  gender-encoding mismatch and inconsistent field availability (Doc 01, 05)
  happen in the first place.

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
