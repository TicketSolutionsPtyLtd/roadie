---
title: Work in the docs root layout runs once per page in the build
date: 2026-10-20
category: best-practices
module: docs
tags: [nextjs, docs, build, performance, static-generation, layout, memoise]
problem_type: best_practice
---

## Symptom

After roadie#572, the docs build's "Generating static pages" step took about
6 minutes in CI instead of 75s, which pushed "build and docs e2e" past its
timeout and cancelled docs-touching PRs.

## Cause

The root layout renders once for every page the build generates, about 900
of them. For each page's metadata card it asked `getPageRelease` for all 96
status pages, and each call re-derived the release from the whole history
(about 1.2s a page). `getPageUpdatedDates` re-ran its `git log` on every
page too. Anything uncached in the layout, or in a component every page
renders, costs that work times the page count.

## Fix

Keep each result at module level for the build (roadie#587,
`docs/src/lib/releases.ts`): a `Map` keyed by route for `getPageRelease`,
one stored value for `getPageUpdatedDates`, as `getReleaseHistory` already
did. Each build worker then pays once. Static generation went from 3.9 min
to 31s locally.

In `next dev` a module-level cache keeps its values until the server
restarts, which is fine for build-time data such as releases and git dates.

## Check

Before adding work to `docs/src/app/layout.tsx` or anything it renders, time
the call once and multiply by the page count. Compare `next build`'s static
generation time with `main`'s on the same machine.
