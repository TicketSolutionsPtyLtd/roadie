---
title: Emphasis presets declare values; only the shared rule sets state
date: 2026-11-25
category: best-practices
module: core
tags: [css, emphasis, interactions, cascade, tailwind, custom-properties]
problem_type: best_practice
---

## Problem

An interactive emphasis preset declares values (`--emphasis-fill-hover` and
the rest), and one shared rule on `is-interactive` and
`is-interactive-within` sets `--emphasis-fill-state` and
`--emphasis-shadow-state` from them. Three things break a preset that steps
outside that split.

## Cause

- **A preset that sets a state variable out-orders the shared rule.**
  `not-data-[pressed]:emphasis-normal` weighs 0,2,0, as `.is-interactive:hover`
  does, and Tailwind emits variants later, so its value beats the hover.
- **A value a preset leaves out leaks from one under it.** A contained List
  row carries `emphasis-subtler` and, by variant, `emphasis-subtle`. Without
  its own `--emphasis-fill-interactive`, subtle kept subtler's transparent rest.
- **Tailwind sorts a utility by its lowest known property**, and the `border`
  shorthand isn't one. Without nested state rules, strong and normal sorted
  after `border-*`, so their edge beat a caller's.

## Fix

- Only the shared rule writes `--emphasis-*-state`; a preset reads it with
  its rest as the fallback.
- A preset with a fill declares all four fill values.
- Presets write borders as longhands, which sort before `border-*`.

The guard is `packages/components/src/css/emphasisStates.browser.test.tsx`.
