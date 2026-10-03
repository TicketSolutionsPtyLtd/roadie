---
title: Headless WebKit on Linux runs no frames while a test sits idle
date: 2026-09-27
category: test-failures
module: components
tags:
  [
    vitest,
    browser-mode,
    webkit,
    playwright,
    resize-observer,
    requestAnimationFrame,
    css-animations,
    ci
  ]
problem_type: test_failure
---

## Symptom

A browser test that changes a style and waits for a `ResizeObserver` to react
passes on macOS in every engine and fails every time in CI's WebKit job. The
poll times out with the old DOM.

## Cause

Headless WebKit on Linux doesn't run the rendering step while the page is
idle. No `requestAnimationFrame` callback fires and no `ResizeObserver` reports
until an input event arrives. Measured in the Playwright Linux image: 0 frames
in 300ms of idle, 18 frames after one `userEvent.hover`.

The stall can also start mid-test, straight after an input, and last for
seconds. A CI trace of the Sortable Move menu test caught it: frames ran
through the first click, stopped around the second `mousedown` and came
back 5.7s later. The press's `mouseup` and `click` arrived during the stall
and didn't restart them; nothing moved the pointer until the test ended. The
fixes below rely on pointer moves waking frames, as the hover measurement
above shows, and keep the moves coming. Anything that waits on a
frame stalls with it: Base UI's menu closes in a `requestAnimationFrame`, a
chart's width band comes from a `ResizeObserver`, and a CSS animation's
clock only advances when a frame runs, so a toast's JS timer can run out
while its progress bar is still frozen.

`ResizeObserver loop completed with undelivered notifications` lines in the
same CI log come from other tests (ToastHeight) and are a red herring here.

## Fix

After a change that only an observer or a frame will pick up, nudge rendering
with an input event before polling:

```ts
let nudges = 0
async function nudgeFrames() {
  const { width } = document.body.getBoundingClientRect()
  await userEvent.hover(document.body, {
    position: { x: width - 2 - (nudges++ % 2), y: 1 }
  })
  await new Promise(requestAnimationFrame)
  await new Promise(requestAnimationFrame)
}
```

Each call hovers a pixel away from the last, because hovering the same point
again may not count as a move.

To check that an observer (not its first report) did the work, nudge once
before the change as well, so the initial report has already been delivered.

When a poll waits on a frame, nudge on every check. The charts package
exports this helper as `nudgeFrames` from
`packages/charts/src/plot/browserTesting.tsx`, hovering the top right corner,
clear of the charts; the Funnel test calls it inside its poll.

When the pointer has to stay put (on a menu trigger, or on or off a toast),
use `keepFramesRunning(() => point)` from
`packages/components/src/css/testUtils.ts`. It wiggles the pointer a pixel at
that point about once a frame until stopped or the test finishes, so frames
keep coming without changing what is hovered. A pixel is under every engine's
drag threshold, so it is safe with a button held. Point it somewhere else to
hover something else, rather than mixing it with `userEvent.hover`.

The components package has the same nudge as `nudgeFrames()` in
`packages/components/src/css/testUtils.ts`, moving the pointer in the frame's
top left corner. For a single wait that only frames can end, wrap it:
`await withFrames(() => expect.poll(...))` runs `keepFramesRunning` from the
corner until the wait settles.

## Waits that look safe but aren't

One input event buys only about 300ms of frames. Measured in the Playwright
Linux image right after the click that opens a drawer: 1 frame by 100ms, 2 by
400ms, then steady frames only from 800ms. So:

- **A transition as long as the wake-up.** Roadie drawers slide for
  `--duration-slow` (300ms), and a transition only advances in a rendering
  update. A poll for the drawer's bottom edge can stop with the drawer short
  of it (`expected 864 to be 844`). Wait with `withFrames`.
- **A popup's exit.** Base UI unmounts a popup when its exit animation
  finishes, which takes frames too, so a poll for `queryByRole('dialog')` to
  be null has the same problem.
- **A programmatic scroll.** `element.scrollTop = n` updates layout at once,
  so a poll on geometry passes straight away, but the `scroll` event only
  fires in the next rendering update. A component that follows scrolling (the
  scrolling Calendar reports the month at the top a frame after the event)
  hasn't seen it yet, and typing next races it. That failed every time in the
  Linux image (`expected -1158 to be 342`) until the test called
  `nudgeFrames()` after the scroll.

## Reproduce locally

Run the file in the Playwright Linux image, e.g.
`mcr.microsoft.com/playwright:v<version>-noble`, with the repo copied in
without `node_modules`, then `pnpm install`, build core and run
`ROADIE_BROWSERS=webkit pnpm exec vitest run --project 'browser (*)' <file>`.
macOS WebKit keeps rendering while idle and won't show the failure.
