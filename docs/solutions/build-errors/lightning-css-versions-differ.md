---
title: CSS that Tailwind's build accepts can fail Next's
date: 2026-10-20
category: build-errors
module: core
tags: [css, lightningcss, nextjs, tailwind, pseudo-elements, docs-build]
problem_type: build_error
---

## Symptom

A `::search-text:current` rule built cleanly in core's Tailwind build and
passed the browser tests, then failed the docs' `next build` with a CSS
parse error (INNO-1357).

## Cause

The two parse CSS with different Lightning CSS versions. Tailwind's
optimizer (`@tailwindcss/node`) was on 1.32, which passed the selector
through. The docs build's parser (1.33) rejected the pseudo-class after
`::search-text`. A new pseudo-element or at-rule can be accepted by one and
rejected by the other.

## Fix

The `::search-text:current` rule was dropped; the base `::search-text` rule
stays.

## Check

After adding a new or rarely used selector, pseudo-element or at-rule to a
package's CSS, run a real docs build, since Next parses it with its own Lightning CSS:

```bash
pnpm --filter docs build
```

`grep -n "lightningcss@" pnpm-lock.yaml` lists the versions in use.
