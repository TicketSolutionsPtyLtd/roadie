---
title: A nested `&:is(&)` stops matching once Tailwind's optimizer lowers it under a complex selector
date: 2026-10-20
category: build-errors
module: core
tags: [css, tailwind, lightningcss, nesting, apply, specificity, prose, links]
problem_type: build_error
---

## Symptom

Link utilities doubled their selector to outrank `is-interactive`'s
transition:

```css
@utility link-normal {
  &:is(&) {
    transition: …;
  }
}
```

`.prose a` takes the utility with `@apply link-normal`. In a production
build, prose links lost their transition, though the browser tests, the docs
dev server and a bare `.link-normal` all had it (INNO-1357).

## Cause

Production builds run the CSS through Tailwind's optimizer
(`@tailwindcss/node`'s `optimize`, which uses Lightning CSS), and it lowers
nesting. It lowers `&:is(&)` by joining the parent selector to itself. For a
class that is harmless, but under `@apply` in `.prose a` the parent is a
complex selector, and the joined result describes an element that can't
exist, so the rule never matches. Vite's dev pipeline, which the Vitest
browser tests use, leaves nesting to the browser, which reads `&:is(&)`
correctly.

## Fix

Don't double a selector to win specificity in a utility that may be
`@apply`'d under a complex selector. Set the property in the utility's own
rule and, where another utility would compete, `@apply` that one inside
this utility so this rule comes later. The INNO-1357 fix has the link
utilities `@apply is-focusable` and set their transition in the same rule.

## Check

Assert on the CSS apps ship, not the dev pipeline's: in a browser test, pass
the stylesheet through `optimize` from `@tailwindcss/node` (from Node, as a
Vitest browser command), inject the result, and check the computed style.
Or run a real `next build` of the docs and check the page there.
