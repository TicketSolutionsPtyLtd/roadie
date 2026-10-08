---
title: WebKit lays out a running animation at the moment it's read
date: 2026-10-09
category: test-failures
module: components
tags:
  [
    vitest,
    browser-mode,
    webkit,
    web-animations,
    requestAnimationFrame,
    getBoundingClientRect,
    flaky
  ]
problem_type: test_failure
---

## Symptom

A frame-by-frame motion test passes alone and fails now and then in WebKit
under load: one frame moves a day much further than the easing allows for
the time since the last frame. The Calendar frames test "stacked months"
failed this way (`frame 17 jumped 141px`, INNO-1191).

## Cause

The test read each day's `getBoundingClientRect()` in a
`requestAnimationFrame` callback and bounded its move by the frame
timestamps. Chromium and Firefox lay out a running Web Animations transform
at the frame's time, however late the callback runs. WebKit lays it out at
the moment of the read, while the frame timestamp, `document.timeline`, and
the animation's `currentTime` all still say the frame's time. A callback that
runs late, because the page or the machine is busy, sees the days further on
than its timestamp allows.

Measured by stalling one frame's callback for 60ms before its read: WebKit
read a day at 69px with `currentTime` at 132ms, the position the next frame
showed at 193ms. Chromium and Firefox, with `currentTime` at 183ms, read the
position for 183ms.

## Fix

Bound a frame's move by the longest time it could cover: from the previous
frame's timestamp to when this frame's read ends (`performance.now()` after
the reads). On time, that's a frame plus a millisecond; read late, it covers
the lateness. A real jump, such as a landing in the wrong place or a slide
that runs too fast, still fails. `Calendar/testUtils.ts` does this for both
`recordFrames` and `recordShapes`.

Don't use `performance.now()` alone: in Chromium and Firefox a late read
still shows the frame's time, so it would undercount the time a frame
covers.

## Reproduce locally

Busy-wait 60ms at the start of one recording callback mid-turn and run the
file in WebKit: the frame-time bound fails on that frame.
