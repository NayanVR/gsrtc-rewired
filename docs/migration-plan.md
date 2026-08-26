# A low-risk path to a modern GSRTC passenger platform

| | |
| --- | --- |
| Audience | GSRTC passenger services, operations, IT, security and leadership |
| Document status | Discussion proposal supported by an independent concept build |
| Decision requested | Whether to explore a jointly governed, read-only pilot |

## Executive summary

GSRTC does not need to replace its booking estate in one large programme to
improve the passenger experience.

This proposal introduces a modern web experience in small, reversible steps.
Existing OPRS and operational systems remain the systems of record. A managed
integration layer presents a stable interface to a new website and, where
approved, mobile apps and partners. Each passenger journey moves only after it
has passed security, accessibility, performance and operational checks.

The accompanying concept demonstrates the proposed user experience, software
boundaries, local transaction handling and automated tests. It is not connected
to GSRTC production systems and makes no claim to be production-ready.

The recommended first commitment is deliberately small: validate one read-only
journey, such as timetable search or vehicle tracking, against an authorised
staging feed. This would test the cooperation model and the integration boundary
without changing bookings, payments or passenger records.

## What the concept proves—and what it does not

### Available for review now

- A responsive passenger interface for search, booking, tracking and account
  journeys
- English and Gujarati interface support
- Accessible controls, validation and error-recovery patterns
- A single validated API contract covering search, booking, tickets, refunds,
  wallet, passes, agents, tracking, authentication and content
- An OpenAPI description for standards-based integrations
- Local Postgres models for seat holds, bookings and related account services
- Automated tests for important contract and transaction behaviour
- Test-only OTP and payment paths, including Dodo hosted checkout in test mode
- A container-based deployment reference with migrations and a private database
- A reusable, source-owned component registry for reviewing and transferring
  the interface foundation

### Still required for any GSRTC pilot or launch

- Authorised OPRS, timetable, fare, inventory and ticket-lifecycle interfaces
- An approved GPS or tracking feed and its freshness expectations
- GSRTC identity, OTP/SMS and session requirements
- The approved production payment gateway and reconciliation rules
- Exact functional rules for concessions, passes, cancellations, refunds,
  rescheduling, agents and exceptional operations
- Data classification, retention, audit, privacy and hosting decisions
- Security assessment, accessibility audit, load test and disaster-recovery test
- Support ownership, service levels, incident handling and change governance

Today, trip and tracking data are synthetic; transaction records belong only to
the concept database; OTP delivery is mocked; and payments are mock or test
mode. These boundaries are intentional so that the project can be reviewed
without touching GSRTC systems or real passenger data.

## Outcomes to target

GSRTC should set the measures, but a pilot can be judged against outcomes such
as:

- Fewer passengers abandoning search and booking journeys
- Faster useful content on low-cost phones and constrained networks
- Fewer payment and booking states that require manual clarification
- Clear status and next steps for cancellations and refunds
- Tracking that states when data is stale or unavailable instead of appearing
  current
- Keyboard and screen-reader access across critical journeys
- Consistent English and Gujarati service information
- Faster, safer changes through one documented integration contract
- Better operational diagnosis through request correlation and auditable events

Baseline values should be measured before rollout. Targets should not be chosen
from the concept build alone.

## Proposed service shape

```text
Passengers on web or mobile          Agents and approved partners
              |                                  |
              +-------------+--------------------+
                            |
                   Managed API boundary
          validation | policy | audit | observability
                            |
               GSRTC-approved adapters
                            |
       +--------------------+--------------------+
       |                    |                    |
  OPRS / inventory     Payments and SMS     Tracking / content
       |
  Existing system of record during migration
```

The new boundary is not a second source of truth. It validates requests,
applies agreed policy, translates between stable passenger-facing operations
and GSRTC-approved interfaces, and records enough context to support operations.
For example, the website asks for “available trips” or “hold these seats”; an
adapter performs the authorised operation in the existing system and maps the
result into a documented response.

One contract drives both the web client and the OpenAPI description. This
reduces accidental disagreement between screens and services while keeping the
integration standards-based.

### Reusable interface foundation

The concept's accessible controls, validation patterns and GSRTC theme are
published as source code through a shadcn-compatible GitHub registry. This is a
handover mechanism, not a hosted UI dependency: the receiving team downloads
the component source, reviews it and owns subsequent changes in its codebase.

Engineering teams can inspect the complete bundle before installing it:

```bash
bunx shadcn@latest view NayanVR/gsrtc/gsrtc-ui
bunx shadcn@latest add NayanVR/gsrtc/gsrtc-ui --dry-run
```

The bundle includes form controls, fields, alerts, badges, cards, buttons,
shared utilities and additive design tokens. Its presence does not imply that
GSRTC has approved the visual design; GSRTC's accessibility, language and brand
review remains an adoption gate.

## Principles for the programme

1. **GSRTC remains the product and data owner.** GSRTC teams approve rules,
   language, accessibility, security, operations and release decisions.
2. **Existing services stay available during migration.** No legacy journey is
   retired merely because a new screen exists.
3. **Move one capability at a time.** Search, tracking, account reads and
   transactions have different risk and should not share one cutover date.
4. **Every rollout has a tested fallback.** Feature flags and routing controls
   can return affected traffic to the existing journey.
5. **Reconcile every financial or ticketing write.** A successful customer
   message must agree with the system of record, including after timeouts and
   repeated requests.
6. **Measure before expanding.** Reliability, support contacts, completion,
   latency and accessibility findings determine the next rollout step.
7. **Treat the concept as evidence, not specification.** GSRTC's actual rules
   and interfaces replace every assumption discovered during the pilot.

## Phased adoption plan

The calendar begins only after access, owners and acceptance criteria are
agreed. A phase may pause without preventing existing GSRTC services from
operating.

### Phase 0 — Joint discovery and controls

**Purpose:** establish facts and programme ownership before integration work.

Work includes:

- Map the current passenger journeys, source systems and operational owners.
- Confirm which interfaces are supported rather than inferring behaviour from
  public pages.
- Agree data classifications, network boundaries, environments and secret
  handling.
- Record baseline performance, completion, failure and support-contact metrics.
- Define accessibility and Gujarati-language review procedures.
- Agree feature-flag, rollback, incident and change-approval responsibilities.

**Exit evidence:** signed scope, system/interface inventory, threat model,
non-production access, acceptance measures and named decision makers.

### Phase 1 — Read-only pilot

**Purpose:** prove the adapter boundary without creating or changing passenger
records.

Candidate journeys are timetable/city search, public information or tracking.
The pilot should begin on an internal or allow-listed URL, then a small public
canary only if GSRTC approves it.

Checks include response correctness, data freshness, Gujarati content,
accessibility, low-bandwidth performance, monitoring and fallback behaviour.

**Fallback:** route users to the existing search, tracking or information page.

**Exit evidence:** agreed data parity, no critical security/accessibility
findings, service-level results within target and support readiness.

### Phase 2 — Authenticated read-only services

**Purpose:** validate identity and privacy controls before any account-changing
operation.

Candidate journeys include ticket history, wallet/passbook balance, pass status
and refund enquiry. Session bridging or a replacement identity path must be an
explicit GSRTC architecture decision; the concept's identity store is not a
default production choice.

**Fallback:** preserve the existing signed-in journey and invalidate new
sessions safely if the pilot is stopped.

**Exit evidence:** privacy review, access-control tests, audit evidence, session
revocation test and successful support exercises.

### Phase 3 — One controlled transaction

**Purpose:** prove end-to-end write safety with the smallest useful scope.

Select one transaction after risk review. A limited booking corridor is a
possible candidate, but GSRTC may prefer a lower-risk operation. Required
controls include:

- Authoritative availability and fare re-check before confirmation
- Time-limited seat holds with clear expiry behaviour
- Idempotency so retries cannot duplicate a booking or charge
- Signed payment callbacks and an independent reconciliation job
- A durable record of pending, successful, failed and uncertain states
- Customer messages that do not claim success before confirmation
- A staffed rollback and incident exercise before public traffic

**Fallback:** stop new entries to the journey while allowing in-flight payments
and bookings to be reconciled; route subsequent users to the existing service.

**Exit evidence:** finance and operations approve reconciliation, failure drills
pass, and the canary meets the agreed correctness and support thresholds.

### Phase 4 — Expand transactions and partner access

**Purpose:** reuse the proven controls for cancellation, rescheduling, wallet,
passes, refunds and agent functions.

Journeys should still move independently. The OpenAPI surface can be offered to
approved apps or partners with versioning, authentication, rate limits and an
onboarding policy. Direct access to legacy endpoints should not be removed until
consumers have migrated and an agreed notice period has passed.

**Exit evidence:** each capability has its own parity sign-off, reconciliation,
runbook, support owner and rollback result.

### Phase 5 — Default routing and selective retirement

**Purpose:** make proven journeys the default and reduce duplicated maintenance.

Retirement is a per-capability decision. Keep the previous route available for
an agreed observation period, review logs and partner usage, then disable it
through normal change control. Retain records and audit evidence according to
GSRTC policy.

**Exit evidence:** stable default traffic, no unresolved dependent consumer,
completed archive/retention work and formal service-owner approval.

## Safety and operational controls

### Booking and seat inventory

- OPRS remains authoritative unless GSRTC explicitly changes that architecture.
- Holds expire automatically and confirmation re-checks ownership and price.
- The same request key returns the same outcome instead of creating duplicates.
- Capacity and booking state are reconciled after partial failures.

### Payments and refunds

- Use only GSRTC-approved providers, accounts and callback domains.
- Do not store card details in the new service.
- Verify callbacks, record provider references and tolerate repeated delivery.
- Distinguish “payment received,” “booking confirmed” and “refund completed.”
- Give finance an exception queue and daily reconciliation evidence.

The concept's Dodo integration is test-only and is not a recommendation of a
production payment provider.

### Identity and passenger data

- Agree whether identity is bridged, migrated or replaced before Phase 2.
- Apply least privilege to passengers, agents, support and administrators.
- Define retention and deletion for contact, journey and audit data.
- Prevent secrets, OTPs and sensitive passenger details from entering logs.
- Test session expiry, revocation, account recovery and suspected compromise.

### Tracking

- Publish the observation time and an agreed freshness threshold.
- Clearly label stale or unavailable positions.
- Do not present estimated data as a live GPS observation.
- Measure feed outages separately from website outages.

### Accessibility and language

- Include keyboard, screen-reader, zoom, contrast and reduced-motion testing.
- Test on representative low-cost devices and constrained networks.
- Use GSRTC-reviewed Gujarati terminology; translation is a content workflow,
  not a one-time machine conversion.
- Ensure errors identify the affected field and explain the next action.

### Observability and support

- Correlate the browser request, API action and downstream call without exposing
  sensitive data.
- Define service-level indicators for latency, correctness, availability and
  stale data.
- Give support staff a safe lookup path for pending or uncertain outcomes.
- Maintain runbooks for dependency failure, payment mismatch, feed staleness,
  rollback and recovery.

## Governance and responsibilities

| Area | GSRTC ownership | Delivery-team responsibility |
| --- | --- | --- |
| Product | Priorities, passenger policy, service rules | Research, prototypes, implementation options |
| Operations | Source-of-truth rules, exception handling, runbooks | Instrumentation, tooling and drills |
| Security/privacy | Policy, risk acceptance, access approval | Threat modelling, controls and evidence |
| Finance | Gateway, settlement and reconciliation approval | Idempotent orchestration and exception reporting |
| Accessibility/language | Acceptance and reviewed terminology | Standards implementation and test remediation |
| Engineering | Interface and hosting decisions, change approval | Adapters, tests, documentation and support handover |

Named owners and deputies are required before Phase 1. A shared risk register
and decision log should travel with the programme.

## Information requested from GSRTC

For discovery—not production access—the project would need:

1. A nominated product owner and technical/operations contacts.
2. Supported interface documentation or supervised access to a representative
   non-production environment.
3. Authoritative rules for fares, holds, booking states, cancellation, refunds,
   passes, concessions and agent workflows.
4. Identity, OTP/SMS, payment and tracking integration constraints.
5. Expected volumes, peak patterns, service levels and planned maintenance
   behaviour.
6. Security, privacy, audit, retention, hosting and procurement requirements.
7. The devices, languages and accessibility needs to include in acceptance.

Real passenger data and production credentials are neither needed nor requested
for the initial design review.

## Indicative planning range

These ranges are for staffing discussion, not a delivery commitment. Discovery
may materially change them.

| Stage | Indicative range | Main dependency |
| --- | --- | --- |
| Discovery and controls | 3–5 weeks | Owners, documentation and staging access |
| Read-only pilot | 4–6 weeks | Stable supported feed |
| Authenticated reads | 4–6 weeks | Identity and privacy decisions |
| First transaction | 8–12 weeks | OPRS/payment sandbox and reconciliation rules |
| Further journeys | Planned per capability | Results of the first transaction |
| Default routing/retirement | Evidence-led | Operational acceptance and consumer migration |

Security remediation, procurement, infrastructure lead time and changes to
source systems are not included in these ranges.

## Proposed next meeting

A 60–90 minute review can answer three questions:

1. Does the concept address passenger and operational priorities worth testing?
2. Which read-only journey has a supported non-production feed and a clear
   owner?
3. What evidence would GSRTC require before even a small canary?

If the answers support further work, the output should be a short pilot charter:
one journey, one source system, named owners, no production writes, measurable
acceptance criteria and a tested fallback.

---

This proposal is offered respectfully for GSRTC review. It does not assume that
the public website reflects internal architecture, and it does not recommend
retiring any existing service before GSRTC has evidence that a replacement is
safer and better for passengers.
