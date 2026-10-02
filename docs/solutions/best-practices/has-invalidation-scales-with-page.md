---
title: A selector after :has() restyles the whole page
date: 2026-10-02
category: best-practices
module: components
tags: [css, has, performance, chromium, style-invalidation, navigator, pane]
problem_type: best_practice
---

## Problem

Opening RecordTable's Configure table took about a second at 4x CPU on the
docs page, though the same table on an empty page opened in 40ms. Ticking a
row, hovering a list row, typing in search and even hydration were slow in
the same way. The cost grew with the size of the page, not the table.

## Cause

Chromium invalidates `:has()` like this:

- Everything any rule selects **after** a `:has()` goes into one shared
  invalidation set for the whole stylesheet.
- Each compound adds one feature to that set: its class or id, else its
  **first** attribute **name** (the value is ignored), else its tag. A `*`
  marks the whole subtree.
- When anything a `:has()` argument could see changes, such as an inserted
  node, `:hover`, `:focus-visible` or `aria-expanded`, every anchor above the
  change restyles each element in its subtree that has a feature from the set.

Navigator's root and Pane are `:has()` anchors above the whole page. One
rule like `.list:has(> [data-slot=group]) > li > [data-slot=list-item]` puts
`data-slot` in the set, and nearly every Roadie element has a `data-slot`. So
any small change restyled 9,000 to 30,000 elements.

A second form: a `:has(~ …)` with nothing else in its compound, such as
`> :not([data-priority]):not(:has(~ :not([data-priority])))` or
`> :is(:has(~ .footer), …)`. Chromium tries it on every element and flags
them all, so a change beside many siblings re-checks every one of them. A
menu next to 2,000 siblings took 950ms.

## How it was traced

- **CDP metrics:** `Performance.getMetrics` gives running `RecalcStyleDuration`
  and `LayoutDuration` totals. The perf project exposes them as
  `commands.renderMetrics()` (`packages/components/vitest.config.ts`).
- **Traces:** a trace with `devtools.timeline` and
  `disabled-by-default-devtools.timeline.invalidationTracking` shows
  `UpdateLayoutTree` element counts, `ScheduleStyleInvalidationTracking` with
  `changedPseudo: has` on the anchors, and "Invalidation set matched
  attribute" against the shared set, which lists its attributes, classes and
  tags.
- **Delete and measure:** remove `:has()` rules from `document.styleSheets`
  on the live page, then delta-debug the set against the restyled count.
- **Render counts:** count production React renders through the DevTools
  hook. This ruled React out: no row re-rendered.

## Rewrites

End every selector that runs past a `:has()` on something narrow:

1. **A variable the anchor sets.** Put the `:has()` on the subject, set a
   custom property there, and let the descendant read it:
   `[&>li:has(+li:hover)]:[--list-divider:transparent]` with
   `after:bg-[var(--list-divider,var(--intent-border-subtle))]`. Reset the
   variable on the anchor's own element type so nested copies don't inherit
   it. For a declaration that should fall away when the variable is unset,
   use `var(--x, revert-layer)`.
2. **A class.** `[li:has(+li)>&]:rounded-b-none` or
   `in-[[data-slot=x]:has(…)]:…` both end on the generated class. Prefer
   `in-[…:has()]` to `group-has-*`, which compiles to `:is(… *)`, and to
   `has-[…]:[&_…]` descendants, which end on whatever they select.
3. **A rare attribute, named first.** `[data-level='0'][data-slot='panes']`,
   not `[data-slot='panes'][data-level='0']`.
4. **No unkeyed `:has(~ …)`.** Give the compound a tag, class or attribute,
   or compute the state in React: mark the last shown cell rather than
   finding it with a sibling selector.
5. **No `:has()` on a frequently changing attribute** when React can set a
   data attribute on the root instead (DataTable's `data-show-all`).

Even a class added to every row (a per-row class) restyles every row when
an anchor fires, so a variable is better there.

## Guard

`packages/components/src/css/hasInvalidation.browser.test.ts` fails on a
broad subject after a `:has()` and on an unkeyed `:has(~ …)`. Perf
scenarios that time a click, a tick and a hover on a 30,000-element page
under Navigator and Pane land with RecordTable.
