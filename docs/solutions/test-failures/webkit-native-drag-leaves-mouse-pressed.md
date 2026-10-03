---
title: A native drag in WebKit leaves the mouse pressed for the next test file
date: 2026-10-04
category: test-failures
module: components
tags:
  [
    vitest,
    browser-mode,
    webkit,
    playwright,
    drag-and-drop,
    pointer-events,
    flaky
  ]
problem_type: test_failure
---

## Symptom

In CI's WebKit job a test whose first step is a mouse press does nothing, then
passes on a rerun. The press reports no error; the value just doesn't change:

- Slider "reaches min and max when pressed at the ends of the control":
  `aria-valuenow` stays `50`.
- NumberField "hides the ring after a mouse press on a stepper": the value
  stays `2`.

Both components act on `pointerdown`. Run alone, the file passes every time.

## Root cause

After a native drag (`commands.pointer` down, move and up over a draggable, or
`userEvent.dragAndDrop`), Linux WebKit under Playwright still counts the mouse
as pressed. The state belongs to the page, not the test's iframe, so it
outlives the file. The next press is then sent as a `pointermove` with
`buttons: 1` instead of a `pointerdown`, and the `mousedown`, `pointerup` and
`click` that follow clear the state. So only the first press-driven test in
the next file on the same page fails, and which file that is depends on how
Vitest shares files out among its pages.

Sortable and Records.Options both drag natively. Running either file and then
Slider or NumberField with `--maxWorkers=1`, larger file first, fails every
time in the Playwright Linux image. macOS WebKit doesn't show it.

## Fix

A file that drags natively clears the state after each test with
`releaseDragPointer()` from `packages/components/src/css/testUtils.ts`: a
press and release in the frame's corner, after `cleanup()`.

```ts
afterEach(async () => {
  cleanup()
  await releaseDragPointer()
})
```

## Reproduce locally

In the Playwright Linux image (see
[linux-webkit-no-frames-while-idle.md](linux-webkit-no-frames-while-idle.md)),
delete `node_modules/.vite/vitest/*/results.json` so the sequencer runs the
larger file first, then:
`ROADIE_BROWSERS=webkit pnpm exec vitest run --project browser --maxWorkers=1 src/components/Sortable/Sortable.browser.test.tsx src/components/Slider/Slider.browser.test.tsx`.
