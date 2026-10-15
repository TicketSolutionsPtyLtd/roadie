---
title: Scrolling a live example's placeholder detaches it mid-action
date: 2026-10-15
category: test-failures
module: docs/e2e
tags: [playwright, e2e, live-examples, scroll, flaky, detached]
problem_type: test_failure
---

## Symptom

A docs e2e test fails now and then in CI with:

```
locator.scrollIntoViewIfNeeded: Element is not attached to the DOM
  - attempting scroll into view action
    - waiting for element to be stable
```

It passes on a re-run. The Navigation test "renders the panes the URL table
lists for each level" hit it on at least three unrelated PRs.

## Root cause

A live example starts as a placeholder, `[data-live-example=pending]`, and
`useNearViewport` swaps it for a new `[data-live-example=rendered]` node once
it comes within reach of the viewport. The test's locator matched either
state, so it resolved the placeholder, and the scroll it asked for is what
triggered the swap. If the swap commits while Playwright waits for the
element to be stable, the element it holds is gone, and
`scrollIntoViewIfNeeded` throws instead of re-resolving.

On a fast machine the swap lands after the stability check. Under CI's load
it lands inside it. With Chromium's CPU throttled 4x, the old test failed 30
of 30 runs; unthrottled, 0 of 30.

## Fix

Scroll the block around the example, which `CodePreview` keeps mounted
through the swap, then wait for the rendered node:

```ts
const after = `xpath=//*[@id="${headingId}"]/following::*`
await page
  .locator(`${after}[@data-live-example][1]/..`)
  .scrollIntoViewIfNeeded()
const example = page.locator(`${after}[@data-live-example="rendered"][1]`)
await example.waitFor()
```

Both states' parent is the same wrapper, so the scroll target never detaches.
With this, the test passed 30 of 30 at 4x throttle and 10 of 10 at 8x.

Never act on `[data-live-example=pending]`, or a locator that can match it,
with anything but a wait. `fence-layout.e2e.test.ts` and
`live-examples.e2e.test.ts` already scroll the wrapper.

To reproduce a flake like this locally, throttle the page's CPU:

```ts
const cdp = await context.newCDPSession(page)
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
```
