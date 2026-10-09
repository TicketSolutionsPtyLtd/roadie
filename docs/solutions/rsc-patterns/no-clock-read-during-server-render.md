---
title: A clock read during render fails a Next `cacheComponents` prerender
date: 2026-10-09
category: rsc-patterns
module: components
problem_type: build_error
component: DateTime, RecordTable
severity: high
symptoms:
  - '`next build` fails with "Next.js encountered the unstable value `new Date()` in a Client Component"'
  - The page renders `DateTime` or `RecordTable` outside `Suspense`, or as a `Suspense` fallback
root_cause: clock_read_in_render
resolution_type: code_fix
related_components:
  - DateTime
  - RecordTable
  - useRecords
tags:
  - now
  - time
  - clock
  - ssr
  - hydration
  - prerender
  - cacheComponents
  - next.js
related_files:
  - packages/core/src/datetime/format.ts
  - packages/components/src/components/DateTime/index.tsx
  - packages/components/src/components/Records/useRecords.ts
  - packages/components/src/utils/testUtils.ts
---

# A clock read during render fails a Next `cacheComponents` prerender

## Problem

Next 16 turns `cacheComponents` on in new apps. Its prerender rejects
`new Date()` and `Date.now()` in a client component's render outside
`Suspense`, because the value would freeze at build time. Three reads hit it:

- `resolve()` in the core formatters defaulted `now` to `new Date()` on every
  call, though only the standalone year rule and `formatRelative` use it. So
  every `DateTime` read the clock, and so did every date cell in a table.
- `useRecords` kept its mount time in `useState(() => new Date())`, which runs
  on the server even when `now` is passed.
- A `Suspense` fallback is prerendered too, so a `RecordTable` skeleton there
  failed the same way.

## Fix

Roadie reads no clock on the server. What depends on today is filled in after
hydration, like `useToday` in Calendar and the relative text in `DateTime`.

- The formatters read the clock only when the words depend on it (`nowOf`).
- `DateTime` with `context='standalone'` renders the year on the server and
  during hydration, then drops it for the current year after mount. Keeping
  the year is the rule's own fallback: verbose, never ambiguous.
- `useRecords` reads the clock through `useSyncExternalStore`, null on the
  server, unless `now` is given. Until the browser knows the date, a
  browser-mode list with a relative (`within`) filter shows its loading
  state, since the server can't know which rows match. Other lists render
  their rows as before.

No new prop or provider option. A `now` on `RoadieProvider` wouldn't help:
the app would have to read the clock on its server to fill it, which hits the
same rule.

## Testing

`withoutClock` in `packages/components/src/utils/testUtils.ts` swaps `Date`
for one that throws on a clock read, as the prerender does, and
`hydrateWithoutClock` server-renders through it and then hydrates. A test
fails on any clock read in render and on any hydration mismatch.
