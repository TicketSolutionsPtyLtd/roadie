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

List the copies: `grep "^  vitest@" pnpm-lock.yaml`. The bare `vitest@<version>:`
line is the package, and each line with peers after it is a copy. Compare
the list before and after a dependency change: a new line means a split.

The lockfile already holds two copies, which differ only in `yaml`:
components, core, and widgets resolve `vite` with `yaml@2.9.0`, and the root,
blocks, charts, editor, lint-plugin, docs, and `testing/frames` with
`yaml@2.9.1`. Each package's tests load their own package's copy, so this
split hasn't broken a suite yet. A test that loads Vitest through another
package across that line can hit the same error.

## Fix

Make the optional peer resolvable everywhere: add `terser` to the root
`devDependencies` at the version the lockfile already holds, then run
`pnpm install`. Every importer gets the same `vite`, and Vitest dedupes.
