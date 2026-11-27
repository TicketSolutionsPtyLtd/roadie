---
title: expect.poll advances fake timers between checks, so a timer starts early
date: 2026-11-27
category: test-failures
module: blocks
tags:
  [
    vitest,
    browser-mode,
    fake-timers,
    expect.poll,
    vi.waitFor,
    IntersectionObserver,
    Hero,
    ImageCycler
  ]
problem_type: test_failure
---

## Symptom

A browser test fakes `setInterval`, waits with
`expect.poll(() => vi.getTimerCount()).toBeGreaterThan(0)` for a component to
start its interval, then advances the clock by one tick less than the
interval. The interval has already fired: the Hero's photo moved on at 3,999ms
of a 4,000ms cycle (`expected null not to be null`). Later asserts in the same
test, and tests that advance whole cycles, pass, so it can look like only the
first test of a file is broken, or like the component's observer is late.

## Cause

`expect.poll` and `vi.waitFor` advance fake timers by their interval (50ms by
default) after every failed check: Vitest calls
`vi.advanceTimersByTime(interval)` whenever `vi.isFakeTimers()` is true. An
`IntersectionObserver` reports in a later rendering update, never before the
first check, so the first check always fails, and the interval the observer
starts has run 50ms by the time the poll passes. Measured on the Hero in
Chromium, WebKit and Firefox: every such wait took two or three checks.

## Fix

Wait for the signal without moving the clock: check once a frame, with frames
kept running for headless WebKit on Linux
([why](linux-webkit-no-frames-while-idle.md)).

```ts
const untilFrame = (done: () => boolean) =>
  withFrames(async () => {
    for (let frame = 0; !done(); frame++) {
      if (frame > 300) throw new Error(`Still waiting for ${done}`)
      await new Promise(requestAnimationFrame)
    }
  })

vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
render(<Hero {...bento(photo)} />)
await untilFrame(() => vi.getTimerCount() > 0)
act(() => vi.advanceTimersByTime(3999))
```

Fake only the timers the component uses, so frames and `withFrames` stay real.
`packages/blocks/src/Hero/cycling.browser.test.tsx` uses this.

## Prevention

- Under fake timers, use `expect.poll` or `vi.waitFor` only when the clock
  moving is harmless: a test that advances whole cycles, or asserts nothing
  about timing.
- A test that asserts a boundary (one millisecond before a tick, then the
  tick) must not poll between starting the timer and advancing it.
