---
title: A pathname is not a route key, and a static export is where that bites
date: 2026-09-17
category: best-practices
problem_type: environment_difference
components:
  - docs
  - navigator
keywords:
  - next.js
  - static export
  - trailing slash
  - github pages
  - usePathname
  - navigator
  - route key
severity: medium
related_files:
  - docs/src/lib/route.ts
  - docs/next.config.mjs
  - packages/components/src/components/Navigator/NavigatorContext.ts
---

# A pathname is not a route key

## Symptom

The docs looked right under `next dev` and wrong when built with
`output: 'export'` and served from `out/`: the page title above the content
disappeared, and a top-level page like `/components` grew the Back affordance
that belongs to a nested page.

Only some loads showed it, which is what made it look intermittent. The URLs
that showed it were the ones with a trailing slash.

## Root cause

Every route lookup in the docs keyed off `usePathname()` verbatim. `next dev`
308-redirects `/components/` to `/components` before anything renders, so the
slashed form never reaches the app. A static export has no server to do that:
it ships files, and the host decides. `npx serve out` — the server Next's own
export message recommends — answers `/components/` with the `/components` page,
slash intact.

Keyed raw, that one URL breaks two things at once:

- `pageTitles['/components/']` is `undefined`, so `Pane.BodyTitle` renders
  nothing.
- Navigator's `isBranchActive` matches an item exactly, **or** through
  `activeValue.startsWith(value + '/')` for the pages under it. `/components/`
  misses the exact test and hits the prefix one, so the section reads as a page
  _below_ Components rather than Components itself, and the depth-1 Back
  affordance appears.

One mismatch, two symptoms that look unrelated. The second is the more valuable
half of the lesson: an exact-match rule with a prefix fallback does not fail
loudly on a near-miss, it silently answers the other branch.

## Fix

Normalise once, where the pathname becomes a key, and let every lookup share it
— `docs/src/lib/route.ts`:

```ts
export const toRoute = (pathname: string) => pathname.replace(/\/+$/, '') || '/'
export const useRoute = () => toRoute(usePathname())
```

The title map, the `Navigator` `value`, the prev/next links, the nav query flags
and the debug canaries all call `useRoute()`. Normalising only the title lookup
would have fixed the visible symptom and left the Back button wrong.

Roadie itself does **not** normalise. Navigator's `value` is an opaque consumer
token, not necessarily a URL, so a trailing-slash opinion doesn't belong in the
component — the app owns the conversion from URL to key.

## GitHub Pages

Pages serves a static tree by its own rules, measured against the live site:

| Emitted file            | Request        | Result                |
| ----------------------- | -------------- | --------------------- |
| `components.html`       | `/components`  | 200                   |
| `components.html`       | `/components/` | 404                   |
| `components/index.html` | `/components/` | 200                   |
| `components/index.html` | `/components`  | 301 to `/components/` |

So `trailingSlash: true` in `docs/next.config.mjs` is what makes both URL forms
work: the export emits `index.html` per directory, Pages serves the slashed form
and redirects the bare one into it. Clean URLs serve only the bare form and 404
the slash.

That switch also makes `usePathname()` return a trailing slash on _every_ page,
which turns the normalisation above from an edge-case guard into load-bearing
code. Anything comparing a pathname to a literal has to be found and fixed at
the same time; in this repo that was the `/debug` canaries, where
`pathname === '/debug/stack/evt'` had gone quietly false and left the canary
asserting nothing.

## Prevention

- Convert a pathname to a route key at one seam, and compare keys everywhere
  else. `usePathname()` inside a comparison is the smell.
- When a matching rule has an exact case and a prefix case, a near-miss input
  doesn't fail — it takes the other branch. Test the near-miss.
- `next dev` normalises URLs that a static export doesn't. A routing assumption
  is unverified until it has been checked against the built `out/` served over
  HTTP, under the host's rules rather than a forgiving dev server's.
