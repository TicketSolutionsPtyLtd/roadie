---
title: An inherited value that changes restyles everything below it
date: 2026-11-25
category: best-practices
module: components
tags:
  [
    css,
    custom-properties,
    property,
    performance,
    chromium,
    style-recalc,
    pane,
    navigator,
    toast
  ]
problem_type: best_practice
---

## Problem

A Navigator pane push on a phone cost about 35ms of style recalculation with
empty panes and about 180ms with 100 list rows in each pane (locally, at
3.6x CPU; 218 to 259ms in CI). Layout was about 1ms. The cost grew with what
the panes held, though nothing in the rows changed.

## Cause

When an element's computed value for an inherited property changes, Chromium
restyles every element below it. Custom properties inherit unless an
`@property` rule says `inherits: false`, so a `--x` that changes on an
ancestor restyles the whole subtree, whether or not anything reads it. A
subtree restyles once per frame however many inherited values change on its
root, so removing one cause saves nothing while another changes the same
root in the same frame.

A push changed inherited values on four roots, over three frames. One push
restyled about 8,000 elements on a page of 1,875:

| What changed                                                                                                                                                        | Where                               | Restyled             |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- | -------------------- |
| `--toast-viewport-clear-top`, from `Navigator/headerClearance.ts` (the header grows when its back button shows, so the clearance moves)                             | `<html>`, twice                     | The whole page       |
| `--pane-header-height`, from `Pane/PaneHeader.tsx`'s ResizeObserver, a frame after the push                                                                         | The pushed pane                     | That pane's subtree  |
| The stack state: `:has()` rules flip `--pane-top`, `--pane-last` and the values derived from them, and `[data-pushing]` flips `--pane-pushing` (`pane-columns.css`) | `navigator-panes`, above every pane | Both panes' subtrees |
| Each pane's own math (`--pane-off`, `--pane-behind`, `--pane-fill` and so on), `visibility`, `pointer-events` and `--pane-back`                                     | Each pane                           | That pane's subtree  |

The `:has()` invalidation itself was not the cost: removing the List row
rules that put classes in the shared `:has()` set moved it by less than the
noise.

## How it was traced

1. **Diff a row's computed style.** Read every property of
   `getComputedStyle()` on a row in each pane before the push, one and two
   frames after, and once it settles. Each difference is an inherited value
   that restyled the row. This found every cause in one run.
2. **Count what restyles.** A trace with `devtools.timeline` and
   `disabled-by-default-devtools.timeline.invalidationTracking` gives each
   `UpdateLayoutTree` an element count. Under tracing, durations are inflated
   and one recalculation of 0 elements took about 40ms, so take times from
   untraced runs.
3. **Delete and measure.** On the live page, change one cause at a time and
   read `RecalcStyleDuration` from `Performance.getMetrics` around the push:
   re-register an `@property` with `inherits: false` (delete the
   `CSSPropertyRule`, then `insertRule` its text), block a runtime write by
   wrapping `CSSStyleDeclaration.prototype.setProperty`, or insert a rule.
   Check that the push still lands, since deleting the `:has()` rules
   looks cheap only because the pane never arrives.

Style per push, 100 rows, median of two untraced runs:

| Change                                                                                          | Style ms |
| ----------------------------------------------------------------------------------------------- | -------- |
| None                                                                                            | 177      |
| Toast clearance not written                                                                     | 136      |
| `--pane-header-height` not written                                                              | 151      |
| Neither runtime write                                                                           | 113      |
| Stack state and pane math `inherits: false`, each pane inheriting it explicitly                 | 143      |
| Neither runtime write, and the stack state scoped                                               | 80       |
| That, with the panes' `visibility`, `pointer-events` and `--pane-back` held still (what's left) | 53       |
| Empty panes                                                                                     | 35       |

## Fix

Change an inherited value only on the element that reads it, or stop it
inheriting:

1. **Write a runtime value on its reader.** A value one component reads,
   such as a toast clearance, goes on that component's element, not on
   `<html>` or `<body>`.
2. **Keep shared state from inheriting past its readers.** Register it with
   `inherits: false` and inherit it explicitly one level down, where it's
   read: `[data-slot='navigator-panes'] > [data-slot='pane'] { --pane-top: inherit; }`.
   An unregistered value derived from it needs an
   `@property { syntax: '*'; inherits: false; }` registration too, or it
   still inherits.
3. **Move a JS-measured value into CSS when CSS knows it.** A value CSS can
   compute changes in the same frame as the state that causes it, so its
   subtree restyles once. A ResizeObserver write lands a frame later and
   restyles the subtree again.
4. **Change an inherited value on a large subtree only when it must change.**
   `visibility` on an off-screen pane is one such value. Count it as a
   restyle of that whole pane.

## Guard

`packages/components/src/components/Pane/Pane.perf.browser.test.tsx` times
the style recalculation for a push with empty panes, with 100 list rows and
with a RecordTable. Chromium caps it for empty panes. The other two scenarios
are known misses until the fix lands (INNO-1678).
