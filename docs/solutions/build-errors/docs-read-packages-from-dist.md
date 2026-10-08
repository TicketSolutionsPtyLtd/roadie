---
title: The docs site reads packages from `dist`, not source
date: 2026-09-11
category: build-errors
problem_type: stale_build_output
components:
  - docs
  - packages/components
  - packages/widgets
keywords:
  - next dev
  - module not found
  - dist
  - exports
severity: low
---

# The docs site reads packages from `dist`, not source

## Symptom

A source edit doesn't show on the docs dev server. Or, after a rebuild, every
`@oztix/roadie-widgets/*` import throws "Module not found".

## Root cause

`docs` resolves Roadie packages through each package's `exports` map, which
points at the built `dist`. There is no source alias; `next.config.mjs` only
lists the packages in `transpilePackages`. Rebuilding `dist` while `next dev`
runs breaks its module resolution until the server restarts.

## Fix

1. Edit the source.
2. Build the package: `pnpm --filter @oztix/roadie-components build`, or
   `build:quiet` for widgets (JS and types, no attw checks).
3. Start or restart the docs dev server.

If the server still serves a stale copy, `pnpm --filter docs build` and a
static server on another port give a clean read without touching anyone
else's server.
