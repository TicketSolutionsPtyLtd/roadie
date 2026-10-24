---
title: A rename shim is released again by every minor of the package it points at
date: 2026-10-23
category: best-practices
module: eslint-plugin-shim
tags: [changesets, npm, deprecation, shim, rename, release]
problem_type: best_practice
---

## Problem

`@oztix/roadie-eslint-plugin@0.1.2` re-exports `@oztix/roadie-lint-plugin`
through a `workspace:^` dependency, which publishes as `^0.2.0`. Changesets
bumps a dependent when its dependency's next version leaves the dependent's
range, so the next lint-plugin minor (0.3.0) also releases the shim as 0.1.3,
depending on `^0.3.0`. A lint-plugin patch stays in range and leaves the shim
alone.

Apps on `^0.1.x` of the old name install 0.1.3 by themselves. npm deprecation
is only a warning, so they get the new minor, such as a new `error` in
`recommended`, through a patch of a package that says it had its last release.

## Fix

- Release the rename, run `npm deprecate` on the old name, then remove
  `packages/eslint-plugin-shim` before any later minor of the new name merges.
- `packages/eslint-plugin-shim/test/last-release.test.js` reads the pending
  changesets and fails when the shim would release past 0.1.2. CI runs it on
  every PR, since a PR that only adds a changeset affects no package.
- `/roadie:release` fails a Version Packages PR that bumps a shim past its last
  release.
