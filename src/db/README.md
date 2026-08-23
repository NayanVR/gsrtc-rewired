# Local database setup

The application uses any wire-compatible Postgres instance. To start a local
database with Docker:

```sh
docker run --name gsrtc-postgres \
  -e POSTGRES_DB=gsrtc_rewired \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  -d postgres:17
```

Copy the `DATABASE_URL` value from `.env.example` into `.env`, then apply the
checked-in schema migrations:

```sh
bun run db:migrate
```

`getDb()` deliberately throws a descriptive error when `DATABASE_URL` is
missing. This prevents persistence-backed features from silently running
without a database.
