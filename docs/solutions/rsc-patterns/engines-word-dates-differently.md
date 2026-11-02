---
title: Engines word dates differently, so a server-rendered date fails hydration in one engine
date: 2026-11-03
category: rsc-patterns
module: components
problem_type: runtime_error
component: DateTime
severity: medium
symptoms:
  - 'WebKit logs "Minified React error #418" with `args[]=text` on a static or server-rendered page; Chromium and Firefox do not'
  - Only pages showing a September date fail, so the trigger looks unrelated (it first showed as "pages with live examples")
root_cause: locale_data_differs_between_engines
resolution_type: code_fix
tags:
  - hydration
  - intl
  - cldr
  - icu
  - webkit
  - safari
  - datetime
  - e2e
related_files:
  - packages/components/src/components/DateTime/index.tsx
  - .github/workflows/ci.yml
---

# Engines word dates differently, so a server-rendered date fails hydration in one engine

## Problem

`Intl.DateTimeFormat` reads the engine's own CLDR data. Node, Chromium, and
Firefox abbreviate September in `en-AU` and `en-GB` as "Sept"; Playwright's
WebKit abbreviates it "Sep". A `DateTime` rendered on the server (Node) and
hydrated in WebKit had different text, so React threw #418 and client-rendered
the tree. Docs pages showed it only where a page meta date fell in September.

Other formats can drift the same way between engines and engine versions, so
don't fix it per word.

## Fix

Every element in `DateTime` that holds formatted text sets
`suppressHydrationWarning`. Hydration keeps the server's words; a later
render with new words (the standalone year, the relative text) still updates
them. Clock-dependent text stays on `useSyncExternalStore` with a server
snapshot, so it never mismatches in the first place.

To find which text differs, record each element's own text at
`DOMContentLoaded` and compare it after `networkidle`, in the engine that fails.

## Prevention

- The `DateTime` unit tests hydrate server HTML with the month respelled.
- CI runs docs e2e in WebKit and Firefox on `main` and with `full-browsers`.
