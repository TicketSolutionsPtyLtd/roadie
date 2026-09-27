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

`ResizeObserver loop completed with undelivered notifications` lines in the
same CI log come from other tests (ToastHeight) and are a red herring here.

## Fix

After a change that only an observer or a frame will pick up, nudge rendering
with an input event before polling:

```ts
async function nudgeFrames() {
  await userEvent.hover(document.body)
  await new Promise(requestAnimationFrame)
  await new Promise(requestAnimationFrame)
}
```

To check that an observer (not its first report) did the work, nudge once
before the change as well, so the initial report has already been delivered.

## Reproduce locally

Run the file in the Playwright Linux image, e.g.
`mcr.microsoft.com/playwright:v<version>-noble`, with the repo copied in
without `node_modules`, then `pnpm install`, build core and run
`ROADIE_BROWSERS=webkit pnpm exec vitest run --project 'browser (*)' <file>`.
macOS WebKit keeps rendering while idle and won't show the failure.
