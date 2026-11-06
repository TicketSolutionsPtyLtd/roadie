---
title: 'A dependency that brings `terser` splits Vitest into two copies'
date: 2026-11-06
category: test-failures
problem_type: duplicate_dependency
module: tooling
tags:
  - pnpm
  - vitest
  - vite
  - terser
  - snapshots
---

# A dependency that brings `terser` splits Vitest into two copies

## Symptom

Every file snapshot in `@oztix/roadie-charts` fails with
`The snapshot state for '…/static.test.ts' is not found. Did you call
'SnapshotClient.setup()'?`, locally and in CI's `check` job. The PR that
breaks it doesn't touch charts.

## Cause

`terser` is an optional peer of `vite`. pnpm resolves an optional peer only
where it can find it. When one workspace package gains a dependency that
brings `terser` (here `mjml-browser` in `docs`, through
`html-minifier-terser`), some importers get `vite(…)(terser@…)` and others
plain `vite`. Vitest, which peers on `vite`, then installs twice. A test
file loads one Vitest and its snapshot client from the other, so the client
has no state for the file.

Count the copies: `grep -c "^  vitest@" pnpm-lock.yaml`. A new entry means
a split.

## Fix

Make the optional peer resolvable everywhere: add `terser` to the root
`devDependencies` at the version the lockfile already holds, then run
`pnpm install`. Every importer gets the same `vite`, and Vitest dedupes.
