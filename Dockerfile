FROM oven/bun:1 AS build

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .

# Vite exposes VITE_* values while building. This DSN is intentionally a build
# argument because setting it on the runtime container has no effect.
ARG VITE_SENTRY_DSN
RUN VITE_SENTRY_DSN="$VITE_SENTRY_DSN" bun run build

FROM oven/bun:1 AS runtime

WORKDIR /app

ENV NODE_ENV=production

COPY --from=build /app/.output ./.output

EXPOSE 3000

CMD ["bun", ".output/server/index.mjs"]
