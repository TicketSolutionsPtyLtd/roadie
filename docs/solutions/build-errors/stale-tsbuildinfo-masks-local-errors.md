---
title: Stale `tsconfig.tsbuildinfo` masks type errors locally that CI surfaces immediately
date: 2026-04-14
category: build-errors
problem_type: tooling_cache_divergence
components:
  - packages/components
  - packages/core
  - docs
keywords:
  - typescript
  - incremental
  - tsbuildinfo
  - tsc --noEmit
  - turbo
  - ci mismatch
  - noUncheckedIndexedAccess
severity: low
related_files:
  - tsconfig.base.json
  - packages/components/tsconfig.json
  - packages/core/tsconfig.json
---

# Stale `tsconfig.tsbuildinfo` masks type errors locally

## Symptom

A PR lands in CI with a typecheck failure that didn't exist locally:

```
src/components/Accordion/Accordion.test.tsx(121,12): error TS2532: Object is possibly 'undefined'.
src/components/Accordion/Accordion.test.tsx(122,7): error TS2532: Object is possibly 'undefined'.
```

The lines were committed weeks ago by someone else (`git blame` confirms), and `pnpm typecheck` on your machine is clean. You didn't touch Accordion. No rebase, no lockfile change, no tsconfig edit — the errors appear to have materialised out of thin air the moment your branch hit the CI runner.

## Root cause

TypeScript's incremental mode (`"incremental": true` in `tsconfig.json`, which the Roadie component packages enable) writes a `tsconfig.tsbuildinfo` file next to the config on every successful `tsc --noEmit`. That file stores the dependency graph and prior diagnostics for every file in the project. On the next run, tsc reuses cached results for files that haven't changed since the last build — including their "no errors" verdict.

If a file was added to the project **before** the repo-wide strict flag was tightened, or before a new type rule surfaced, and nobody has touched that file since, the `.tsbuildinfo` cache will keep reporting it as clean. Your local tsc never re-checks it, so the error is invisible. CI runs with no cache, so it re-checks every file from scratch and the latent error immediately surfaces.

In the Roadie case, the repo uses `noUncheckedIndexedAccess: true` in `tsconfig.base.json`:

```ts
// Accordion.test.tsx
const details = container.querySelectorAll('details')
expect(details[0]).toHaveAttribute('name')         // <- runtime guard
expect(details[1]).toHaveAttribute('name')
expect(details[0].getAttribute('name')).toBe(...)  // <- TS2532: possibly undefined
expect(details[1].getAttribute('name')).toBe(...)
```

`querySelectorAll('details')[0]` is typed as `Element | undefined` under that flag. The earlier `expect(...).toHaveAttribute('name')` proves existence at runtime but TypeScript doesn't carry that narrowing through to the next statement. The lines had been wrong since they were added in commit `0645262`, but local `tsbuildinfo` cached them as "no errors" and nobody noticed until an unrelated PR forced a full re-typecheck on a fresh runner.

## Fix

Two pieces. Fix the immediate error, and add a workflow tip to catch this class of divergence early.

### 1. Fix the latent type error

Non-null assert on the indexed access since the existence was already verified:

```ts
expect(details[0]).toHaveAttribute('name')
expect(details[1]).toHaveAttribute('name')
expect(details[0]!.getAttribute('name')).toBe(
  details[1]!.getAttribute('name')
)
```

`!` is the right tool here because the runtime check is right above it. A full `if (details[0] && details[1])` guard would be fine but noisier for a test body.

### 2. Reproduce CI-style typecheck locally when needed

When a CI typecheck fails on code you didn't touch, delete every `tsbuildinfo` in the repo and re-run:

```bash
find . -name "*.tsbuildinfo" -not -path "*/node_modules/*" -delete
pnpm typecheck
```

Or, if you want a one-shot fresh check that also bypasses Turbo's own task cache:

```bash
find . -name "*.tsbuildinfo" -not -path "*/node_modules/*" -delete
pnpm turbo typecheck --force
```

`--force` tells Turbo to ignore its task-level cache hashes, and deleting the tsbuildinfo files strips TypeScript's file-level cache. The result is byte-for-byte what CI will run, which is what you want when diagnosing CI-only failures.

## Prevention

- **Before pushing a finishing commit on a branch, run a fresh typecheck at least once**: delete the `.tsbuildinfo` files and re-run `pnpm typecheck`. It takes ~10 seconds and surfaces exactly the class of latent errors that CI will fail on. This is especially worth doing when your branch has landed a lot of unrelated file edits, widened a tsconfig flag, or bumped a TypeScript version.
- **If you see an unexplained CI-only typecheck failure in a file you didn't touch, `git blame` the failing line before assuming the PR is the cause.** Latent errors pre-dating the branch are common once a repo is on `noUncheckedIndexedAccess` / `exactOptionalPropertyTypes` / `strictNullChecks` — TS's incremental cache hides them until something forces a cold rebuild.
- **Don't rely on Turbo's remote cache to catch this class of bug either.** Turbo's cache is task-level; even a cache hit still re-reads tsc's incremental file cache for the task it re-runs. Only `tsbuildinfo` deletion forces TypeScript itself to re-analyse the file.
- **Latent errors surfaced this way aren't "CI's fault" — they're evidence that local was lying to you for days or weeks.** Fix the error in place (non-null assertion, narrowing, whatever the right call is) rather than reverting to hide it again. The next cold build would just unmask it.

## Related files

- `tsconfig.base.json` — the root config with `noUncheckedIndexedAccess: true` + `strict: true` + `incremental: true`.
- `packages/components/tsconfig.json` / `packages/core/tsconfig.json` — extend the base; both write `packages/*/tsconfig.tsbuildinfo` on every `pnpm typecheck`.
- `packages/components/src/components/Accordion/Accordion.test.tsx:121` — the original latent error and its non-null-assertion fix.
