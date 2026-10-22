---
title: Oxlint's no-restricted-imports drops boundaries that ESLint's config kept
date: 2026-10-22
category: best-practices
module: repo
tags:
  [oxlint, eslint, lint, no-restricted-imports, import-boundaries, overrides]
problem_type: best_practice
---

## Problem

Ported as written, the import boundaries in `oxlint.config.ts` stop catching
imports that ESLint caught, with no error:

- **The last matching override wins.** `no-restricted-imports` and
  `typescript/no-restricted-imports` are one rule in oxlint, and an override
  replaces its options rather than adding to them. A block for
  `Records/rowWindow.ts` that only lifts the TanStack ban also drops
  `next/link` and Atlaskit there. ESLint kept them apart by using the
  typescript-eslint copy for some boundaries.
- **A group's `*` stops at a slash.** ESLint matches `patterns.group` like
  `.gitignore`, so `@atlaskit/*` also bans
  `@atlaskit/pragmatic-drag-and-drop/element/adapter`. Oxlint's `*` matches
  one segment only, so that import passes.
- **`ignores` inside an override has no equivalent in `files`.** A negated
  glob (`!b/**`) in `files` is ignored without an error. Use
  `excludeFiles`, which works, brace globs included, though it isn't
  documented.
- **`settings` inside an override fails to parse.** Put them at the root.

Oxlint also reports a dynamic `import('next/link')` under
`no-restricted-imports`, which ESLint doesn't, and reports an import that is
also re-exported twice. Neither drops a check.

## Fix

- Build every `no-restricted-imports` block from the one `IMPORT_BOUNDARIES`
  list in `oxlint.config.ts`, so each block restates every boundary its files
  sit in, ordered from the widest glob to the narrowest.
- Write groups as `@scope/**`, which matches `@scope/name` and anything
  deeper.
- `eslint/oxlint-config.test.js` lints a seeded import at each boundary and
  at each exception, and a seed at each `excludeFiles` path, with the root
  config. The rule reports nothing on a clean repo, so a clean `pnpm lint`
  proves nothing. Add a case there when you add a boundary or an exception.
