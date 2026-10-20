---
title: virtual-core 3.18 moves range cards while scrolling up in WebKit
date: 2026-10-20
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
    scroll-anchoring
  ]
problem_type: test_failure
---

## Symptom

After `@tanstack/react-virtual` went past 3.14.13, one WebKit browser test
failed every run: `RecordTable.cards.browser.test.tsx`, "starts a new range
query's cards from the estimate, not the last query's heights". A card jumped
about 32px while the list scrolled up (`expected 32.078125 to be less than or
equal to 2`). Chromium and Firefox passed, so a pull request's CI, which runs
Chromium only, stayed green.

## Cause

`@tanstack/react-virtual` 3.14.14 brings in `@tanstack/virtual-core` 3.18.0,
which changed how a `scrollToIndex` settles. The scroll now waits two or
three stable frames instead of one. A user scroll away from a target it has
already reached also cancels the scroll. Reverting both changes in a local
patch made the test pass four runs out of four. Reverting only the cancel
made it pass three runs out of five. The `node.isConnected` check added in
the same release made no difference. Range mode's row restore
(`Records/rowPosition.ts`) relies on `scrollToIndex`, so its new query's
cards are measured while that scroll is still settling.

## Fix

`@tanstack/react-virtual` stays at 3.14.13 until Roadie's row restore works
with virtual-core 3.18 or later. Before raising it, run the Records browser
tests in WebKit:

```bash
ROADIE_BROWSERS=webkit pnpm test:gated components \
  packages/components/src/components/RecordTable \
  packages/components/src/components/RecordGrid \
  packages/components/src/components/Records --project 'browser*'
```

On a Dependabot pull request that raises it, add the `full-browsers` label so
CI runs WebKit too.
