---
title: virtual-core 3.18 moves range cards while scrolling up
date: 2026-10-29
category: test-failures
module: components
tags:
  [
    tanstack-virtual,
    react-virtual,
    virtual-core,
    dependabot,
    webkit,
    records,
    scroll-anchoring,
    placeholders
  ]
problem_type: test_failure
---

## Symptom

From `@tanstack/react-virtual` 3.14.14, one WebKit browser test failed every
run: `RecordTable.cards.browser.test.tsx`, "starts a new range query's cards
from the estimate, not the last query's heights". A card jumped about 32px
while the list scrolled up (`expected 32.078125 to be less than or equal to
2`). Chromium and Firefox passed, so a pull request's CI, which runs Chromium
only, stayed green. Dependabot raised the package to 3.14.22 in #664 and the
failure reached main.

## Cause

virtual-core, which react-virtual wraps, keeps a row still on screen by
correcting the scroll when a row above it changes size. From 3.18 it corrects
a row's first measurement in either direction, but a later one only while
scrolling down (`resizeItem`'s default predicate). It also caches a size only
when it differs from the estimate.

A range row's placeholder is measured under the record's key. A placeholder
off the estimate, such as a banner card's or WebKit's 159.9375px for a 160px
estimate, is cached. The record that replaces it is then a second measurement.
If it lands above the screen while the list scrolls up, nothing corrects it,
and the cards on screen move by the difference.

The test hit this in WebKit only: its ResizeObserver hadn't measured the new
query's first cards before the test jumped the scroll away. So the cached size
was still the placeholder's when those cards came back into view.

An earlier reading put this down to virtual-core 3.18's `scrollToIndex`
settling and held the package at 3.14.13. Logging every `resizeItem` call
showed the skipped correction instead.

## Fix

`useRowWindow` (`Records/rowWindow.ts`) sets the virtualiser's
`shouldAdjustScrollPositionOnItemSizeChange` to correct any row wholly above
the scroll offset, whichever way it scrolls, and keeps virtual-core's rule for
a first measurement. "keeps the cards still as ranges above load while
scrolling up" covers it in every engine. Its placeholders are shorter than the
estimate, so they're cached.

To read what virtual-core decides, wrap `resizeItem` on the instance in a
browser test and log the index, size, `itemSizeCache` entry, `scrollOffset`,
and `scrollDirection`. Before raising `@tanstack/react-virtual`, run the
Records browser tests in every engine:

```bash
pnpm test:gated components \
  packages/components/src/components/RecordTable \
  packages/components/src/components/RecordGrid \
  packages/components/src/components/Records --all-browsers
```

On a Dependabot pull request that raises it, add the `full-browsers` label so
CI runs WebKit too.
