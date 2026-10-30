---
title: Focus in a column CSS hides is blurred before the resize observer that moves it
date: 2026-10-30
category: test-failures
module: components
tags:
  [vitest, browser-mode, chromium, focus, resize-observer, record-table, flaky]
problem_type: test_failure
---

## Symptom

`RecordTable.priority.browser.test.tsx` "keeps focus in the table when a
focused column hides" failed with `expected null to be
'record-table-scroller'` in large `pnpm test:gated components` batches under
heavy load (1-minute load 40 and up on 14 cores), and passed alone every time
(INNO-1437). `null` is `document.body`'s missing `data-slot`: focus had fallen
to the page.

## Cause

A priority tier hides a column with CSS, so the focused header button stays
mounted but stops rendering. `useKeepFocusShown` in
`RecordTable/RecordTableContent.tsx` moves focus to the table from a
`ResizeObserver` callback. Chromium also blurs a focused element that stops
rendering, on its own schedule. On an idle machine the observer runs first;
under load the blur can land first, so the observer found focus outside the
table and returned.

## Fix

The hook remembers an element inside the table that blurred to nothing
(`focusout` with no `relatedTarget`) until focus lands anywhere else, and the
observer restores from it when its column is hidden. The test "keeps focus in
the table when the hidden column blurs first" calls `blur()` itself before the
frames, which reproduces the batch failure on every run.

## Prevention

When code keeps focus by checking `document.activeElement` after a layout
change, don't assume the browser hasn't blurred it yet. Test the blur-first
order by blurring in the test, rather than relying on load to produce it.
