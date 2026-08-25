# 15 — Self-host on a VPS (app + Postgres, one compose file)

**Status:** done
**Depends on:** 02
**Phase:** 0
**Pain point:** —

## Goal

Collapse `browser → Vercel → Supabase` into `browser → VPS → Postgres on the
same box`. The application does not move tiers and no handler is rewritten:
only the deployment target and two environment values change.

## Current state (verified)

There is **no separate backend tier to migrate.** The chain is one process:

- `src/api/fns.ts` calls `api.*` from `src/api/server.ts`, which is a
  `createRouterClient` — an *in-process* oRPC client. The router runs inside
  the SSR process, not behind HTTP.
- The only real network hop is `getDb()` → Supabase, cross-region, per query.

Nitro already emits a standalone Node server:

- `.output/nitro.json` → `"preset": "node-server"`.
- `.output/server/index.mjs:669` → `serve({ port, hostname, fetch: nitroApp.fetch })`,
  port from `NITRO_PORT ?? PORT ?? 3000`.
- The Vercel preset wraps that same `nitroApp.fetch` in a serverless function.
  Same handler, different socket.
- The client bundle posts server functions to `/_serverFn/<id>` on its own
  origin. `/api/auth/*` is `src/routes/api/auth/$.ts`. Static files come from
  `.output/public`. One Nitro handler owns all four.

Host-specific facts that shape the Dockerfile:

- `src/db/client.ts:44` sets `prepare: false` — a Supavisor pooler workaround,
  not needed against direct Postgres. `:52` caches the pool at module scope,
  which only pays off in a long-lived process.
- `src/lib/auth.ts:14` reads `BETTER_AUTH_URL` for the cookie/callback origin.
- `src/start.ts:12` reads `VITE_SENTRY_DSN` via `import.meta.env` — **build
  time**, not runtime.
- `.output/server/node_modules` holds Nitro-traced Sentry deps (see the
  comment in `vite.config.ts`). Those use `require-in-the-middle` /
  `import-in-the-middle`, so the runtime must be Node, not Bun.
- Nothing under `src/` references Vercel.

## Scope

New files only, plus one flag flip:

- `Dockerfile`
- `compose.yaml`
- `Caddyfile`
- `.env.example` — document the production values
- `src/db/client.ts` — `prepare: false` → `true`
- `README.md` — the deploy section is wrong today (says `dist/`; it is `.output/`)
- `scripts/backup.sh`

## Steps

1. **Dockerfile, two stages.** Build on `oven/bun`
   (`bun install --frozen-lockfile`, `ARG VITE_SENTRY_DSN`, `bun run build`),
   run on `node:22-slim` with `COPY --from=build /app/.output ./.output` and
   `CMD ["node", ".output/server/index.mjs"]`. Do not set `VERCEL` in the
   build environment — preset auto-detection then resolves to `node-server`,
   which is what `.output/nitro.json` already shows locally.

2. **compose.yaml, four services.**
   - `db`: `postgres:17`, named volume, `pg_isready` healthcheck, **no
     published port** — reachable only on the compose network.
   - `migrate`: the build-stage image running `bun run db:migrate`,
     `depends_on: db (service_healthy)`, `restart: "no"`. Drizzle's
     `__drizzle_migrations` table makes this idempotent.
   - `app`: `depends_on: migrate (service_completed_successfully)`,
     `PORT=3000`, no published port.
   - `caddy`: binds 80/443, volumes for cert and config state.

3. **Caddyfile:** one site block, `reverse_proxy app:3000`. Caddy does not
   buffer responses, so SSR streaming survives. (If nginx is used instead,
   `proxy_buffering off` is mandatory — reason enough to prefer Caddy.)

4. **Environment.** `DATABASE_URL=postgres://…@db:5432/gsrtc_rewired`,
   `BETTER_AUTH_URL=https://<public-origin>`, `BETTER_AUTH_SECRET`, and the
   Postgres password all come from an uncommitted `env_file` (`.env` is
   already gitignored). `VITE_SENTRY_DSN` is a **build arg**, not a runtime
   variable — passing it in `environment:` silently does nothing.

5. **Flip `prepare` to `true`** in `src/db/client.ts` and update the comment.
   Prepared statements were only disabled for the pooler.

6. **Backups — not optional.** Leaving Supabase gives up PITR and managed
   snapshots. Add a nightly `pg_dump` to off-box storage and **rehearse one
   restore** before cutover. This is the single thing in this task that must
   not be simplified away.

7. **Cutover.** `pg_dump` Supabase → restore into the compose volume before
   the app's first start → point DNS at the VPS → leave the Vercel deployment
   running until DNS has propagated, then remove it.

## Acceptance criteria

- [ ] `docker compose up -d --build` on a clean VPS serves the app over HTTPS.
- [ ] View-source on a route shows server-rendered markup, not an empty root.
- [ ] A loader's server function (`POST /_serverFn/…`) returns 200 with data
      read from the compose Postgres.
- [ ] Login sets a session cookie on the public origin and it survives a reload.
- [ ] Only Caddy binds host ports; `docker compose ps` shows no published
      Postgres port.
- [ ] No secret is baked into the image (`docker history` shows no
      `DATABASE_URL` or `BETTER_AUTH_SECRET`).
- [ ] The `migrate` service exits 0 and is a no-op on the second `up`.
- [ ] A nightly dump lands off-box and one restore has been performed end to end.
- [ ] `bun run test` and `bun run check` still pass — no handler changed.

## Out of scope

- **Splitting the oRPC router into its own container.** It is a function call
  today; making it HTTP adds a hop that does not currently exist. Revisit only
  if a non-browser client needs the API — and then mount an `OpenAPIHandler`
  at `src/routes/api/rpc.$.ts` inside the same process; task 13 already
  generates the spec.
- Zero-downtime deploys. `compose up` costs a few seconds. Add a second `app`
  replica behind Caddy when that becomes unacceptable.
- pgbouncer. Direct connections are fine until roughly 100 concurrent.
- A CDN. Caddy serves `.output/public` from the same origin.
- Multi-node, orchestration, autoscaling.

## Risk accepted

One box is one point of failure, and Postgres upgrades become manual. The
mitigation is step 6 and nothing else; if that trade is not acceptable, keep
Supabase and only move the app.
