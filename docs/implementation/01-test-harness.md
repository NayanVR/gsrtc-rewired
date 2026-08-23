# 01 — Test harness

**Status:** done
**Depends on:** —
**Phase:** 0
**Pain point:** —

## Goal

Make `bun run test` a real command. Every later task's definition of done
requires it.

## Current state (verified)

- `src/dummy.test.ts` imports `describe`, `expect`, `it` from `vitest`.
- `vitest` is **not** in `package.json` — neither dependency nor devDependency.
- There is **no `test` script** in `package.json`.

So the one test file in the repo cannot run.

## Scope

- `package.json` — add `vitest` devDependency and a `test` script.
- `vite.config.ts` — add test config if needed.
- `src/dummy.test.ts` — delete.

## Steps

1. Add `vitest` to `devDependencies`.
2. Add scripts: `"test": "vitest run"` and `"test:watch": "vitest"`.
3. Confirm vitest resolves the `#/*` import alias declared in
   `package.json` `imports`. If it does not, configure it in
   `vite.config.ts` under `test.alias` — the later tasks' tests all import
   via `#/`.
4. Delete `src/dummy.test.ts`. It asserts `1 + 1 === 2` and protects nothing.
   Task 02 adds the first test with actual value.

## Acceptance criteria

- [x] `bun run test` exits 0 and reports at least one passing test.
- [x] A test file importing `#/api/schemas` resolves without error.
- [x] `src/dummy.test.ts` no longer exists.
- [x] `bun x ultracite check` passes.

## Out of scope

Coverage thresholds, CI wiring, a component/E2E test runner. Add those when
something actually needs them.
