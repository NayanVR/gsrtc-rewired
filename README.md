# GSRTC Rewired

An independent concept for a faster, clearer and more accessible GSRTC
passenger experience.

The project demonstrates a modern booking journey, reusable user-interface
components and a typed API boundary that could be connected to GSRTC's existing
systems gradually. It is intended for design and engineering evaluation; it is
not an official GSRTC service and must not be used to buy or manage real
tickets.

## What you can review

- Responsive home, trip search, seat selection and booking journeys
- Ticket tracking, profile, wallet, passes, refunds and agent-facing API domains
- English, Hindi and Gujarati interface support
- Accessible form fields, validation messages and recoverable error states
- Phone-based sign-in flow with a development-only OTP delivery seam
- Postgres-backed seat holds, bookings, tickets, wallet, passes and refunds
- A Dodo Payments hosted-checkout integration locked to test mode
- One typed oRPC contract that also generates an OpenAPI document
- Docker Compose deployment for the application, migrations and Postgres
- A shadcn-compatible, GSRTC-themed component foundation

The application uses synthetic timetable and tracking data. Transactional data
is stored in this project's own database. No live GSRTC OPRS, GPS, SMS, identity
or payment-production system is connected.

## Run it locally

You need [Bun](https://bun.sh/) and Postgres. Docker is optional, but it is the
quickest way to start a local database.

```bash
git clone https://github.com/NayanVR/gsrtc-rewired.git
cd gsrtc-rewired
bun install
cp .env.example .env
```

Start Postgres:

```bash
docker run --name gsrtc-rewired-db \
  -e POSTGRES_DB=gsrtc_rewired \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_USER=postgres \
  -p 5432:5432 \
  -d postgres:17
```

Apply the schema and start the development server:

```bash
bun run db:migrate
bun run dev
```

Open `http://localhost:3000`. With the default development configuration:

- OTP delivery is mocked and the code is shown only for the local flow.
- Payments use the local mock provider.
- Dodo Payments can be enabled only with test-dashboard credentials; the code
  rejects non-test checkout URLs.

See [.env.example](./.env.example) for every setting and
[src/db/README.md](./src/db/README.md) for database notes.

## Useful commands

| Command                    | Purpose                                              |
| -------------------------- | ---------------------------------------------------- |
| `bun run dev`              | Start the development server on port 3000            |
| `bun run test`             | Run the Vitest suite once                            |
| `bun run check`            | Run Ultracite/Biome checks                           |
| `bun run fix`              | Apply Ultracite's safe formatting and lint fixes     |
| `bun run build`            | Create the production Nitro build in `.output`       |
| `bun run db:generate`      | Generate a Drizzle migration after a schema change   |
| `bun run db:migrate`       | Apply pending database migrations                    |
| `bun run openapi:generate` | Regenerate `docs/openapi.json` from the API contract |

Before committing code, run:

```bash
bun run fix
bun run test
bun run build
```

## How the project is organised

```text
src/routes/             TanStack Router pages and server routes
src/components/         Shared application components
src/components/ui/      Reusable UI primitives
src/api/contract/       Validated API inputs, outputs and errors
src/api/handlers/       Concept implementations of those operations
src/api/services/       Seat-hold and payment orchestration
src/db/                 Drizzle schema and Postgres client
src/data/               Synthetic trips and migrated public-page content
docs/openapi.json        Generated OpenAPI description
docs/migration-plan.md   Proposed GSRTC adoption and rollout plan
docs/pain-points/        Problem statements behind the concept
docs/implementation/    Engineering task records and acceptance criteria
```

The important architectural seam is the API contract. The UI consumes a client
derived from that contract, while OpenAPI clients can use the generated REST
description. In a GSRTC-led implementation, adapters behind the same contract
would translate between these stable operations and the authorised OPRS,
tracking, identity, SMS and payment interfaces.

## UI components and shadcn

This repository follows shadcn's source-code model: components are copied into
the application and remain owned by the project. `components.json` points the
CLI at `src/components/ui`, `src/styles.css` and the `#/` import aliases.

The customized components are defined as a source registry in `registry.json`.
The `gsrtc-ui` item installs 12 component and utility files, four package
dependencies, the semantic theme variables and the GSRTC surface utilities.
Because the registry is published from this repository's default branch,
consumers can inspect and install the complete bundle with:

```bash
bunx shadcn@latest view NayanVR/gsrtc-rewired/gsrtc-ui
bunx shadcn@latest add NayanVR/gsrtc-rewired/gsrtc-ui --dry-run
bunx shadcn@latest add NayanVR/gsrtc-rewired/gsrtc-ui
```

Individual items are available under their `gsrtc-` names:

```bash
bunx shadcn@latest add NayanVR/gsrtc-rewired/gsrtc-button
bunx shadcn@latest add NayanVR/gsrtc-rewired/gsrtc-field
```

Registry maintainers can validate all item definitions and source paths with:

```bash
bunx shadcn@latest registry validate NayanVR/gsrtc-rewired
```

See the official [shadcn GitHub registry
guide](https://ui.shadcn.com/docs/registry/github) for the distribution and
version-pinning flow. Review third-party registry code before installing it and
prefer a release tag or commit SHA for reproducible production use.

## Production-shaped deployment

The included Compose stack runs Postgres privately, applies migrations before
starting the app and exposes only the application to the hosting proxy. Copy the
production examples from `.env.example` into your deployment platform's secret
store, then run:

```bash
docker compose up -d --build
docker compose ps
```

The `migrate` service must complete successfully before `app` starts. The server
entry point produced by a direct build is `.output/server/index.mjs`:

```bash
bun run build
bun .output/server/index.mjs
```

This setup is suitable for evaluating deployment mechanics. A real launch still
requires GSRTC-approved infrastructure, secrets management, monitoring,
security review, load testing, backup/restore procedures and live-system
adapters.

## For GSRTC reviewers

Start with the [migration plan](./docs/migration-plan.md). Its proposal keeps
existing services available while new journeys are introduced behind feature
flags, measured and rolled back independently. The most useful next step would
be a jointly scoped, read-only pilot using a staging timetable or tracking feed.

Feedback from GSRTC's passenger-service, operations, accessibility, security
and engineering teams is welcome. This concept deliberately avoids assuming
that public URLs reveal the constraints of the internal systems.

## Project status

This is a concept build, not a production replacement. The codebase can be run,
tested and reviewed today, but production adoption depends on authorised system
access and GSRTC ownership of requirements, security, operations and rollout.

No licence file is currently included, so normal copyright restrictions apply
until the repository owner adds one.
