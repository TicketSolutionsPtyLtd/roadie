---
title: A warm Vite dependency cache reloads browser tests mid-run with a second React
date: 2026-09-27
category: test-failures
module: components, charts
tags: [vitest, vite, optimizeDeps, browser-mode, react, cache]
problem_type: test_failure
---

## Symptom

After a merge, browser tests fail with "Invalid hook call" and
`Cannot read properties of null (reading 'useMemo')`. They pass after deleting
`node_modules/.vite`, and pass on CI.

## Root cause

Vite reuses a warm dependency cache without rescanning the source. When the
tests reach a package that isn't in the cache, such as a Base UI part a merge
started importing, Vite optimises it mid-run and reloads the page. Modules
loaded before the reload and after it end up with two copies of React.

The cache is keyed on `optimizeDeps.include`, among other things. A hand-kept
list doesn't change when an import does, so the stale cache stays valid.

## Fix

Generate `optimizeDeps.include` from the imports in `vitest.config.ts`. A new
import changes the list, which changes the cache key, so Vite rebuilds the
cache before any test runs.

- **Components (#198):** every bare import in `src`, skipping jsdom-only tests.
- **Charts (#201):** the same for its own `src`, plus the imports of the built
  Roadie packages it reaches. Charts gets Base UI through the components
  `dist`, so the config follows each `@oztix/*` import into that package's
  `dist` and lists what it finds as a nested entry, such as
  `@oztix/roadie-components > @base-ui/react/tabs`, since charts can't resolve
  Base UI itself.

To reproduce, warm the cache, then import a component that uses a Base UI
part nothing imported before and run the browser suite again.
