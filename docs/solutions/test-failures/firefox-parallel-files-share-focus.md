---
title: Firefox browser tests that depend on focus flake when files run in parallel
date: 2026-09-27
category: test-failures
module: components
tags: [vitest, browser-mode, firefox, playwright, focus, focus-visible, flaky]
problem_type: test_failure
---

## Symptom

Keyboard tests pass alone and fail now and then in the full Firefox run. Enter
stops activating buttons, arrow keys do nothing, and `:focus-visible` stops
matching. The Menu test "still highlight the row a keyboard moves to" failed
about one run in three.

## Root cause

Vitest runs browser test files in parallel pages. In Firefox those pages share
one active window, so a file that focuses its page blurs the files running
beside it.

## Fix

Run Firefox's files one at a time and leave the other engines parallel (#198):

```ts
instances: browsers.map((browser) => ({
  browser,
  fileParallelism: browser !== 'firefox'
}))
```

Copy this into any package whose browser tests move focus.

## One file at a time still leaves the window unfocused

With files run one after another, a file can still start in a window an
earlier file left unfocused. Since roadie#568 added test files and moved the
shard's order, the ToggleGroup edge-fade test failed every Firefox CI run
(roadie#579). Two things went wrong there:

- **No focus events.** `End` moved focus to the last item, but Firefox fires
  no `focus` event in an unfocused window, and the group scrolls an item
  clear of the fade in its focus handler.
- **Late scroll events.** Once the group scrolled, its `scroll` event was held
  back, so the fades, which update on that event, still read the start.

Fix the test and the component separately:

- In a test that relies on focus events, focus the page first with the
  `focusPage` browser command (`page.bringToFront()`, in
  `packages/components/vitest.config.ts`), then wait for it:

  ```ts
  await commands.focusPage()
  await expect.poll(() => document.hasFocus()).toBe(true)
  ```

- In a component, update state that follows a scroll you caused yourself
  synchronously, rather than waiting for the `scroll` event. ToggleGroup's
  `revealItem` calls `markScrollEdges` right after it sets `scrollLeft`.

Reproduce with CI's exact shard, since the order decides which file inherits
the unfocused window. It runs a third of the suite, so check `uptime` first:

```bash
ROADIE_BROWSERS=firefox ROADIE_SHARD=1/3 pnpm --filter @oztix/roadie-components test:browser
```
