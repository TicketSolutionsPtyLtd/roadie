---
title: A map that waits for MapLibre's load event can hang when its page stops painting
date: 2026-11-08
category: test-failures
module: maps
tags:
  [vitest, browser-mode, webkit, chromium, maplibre, requestAnimationFrame, map]
problem_type: test_failure
---

## Symptom

The Map engine test "still loads when its tiles fail" passed alone in about
300ms and, now and then, timed out at 15s when the whole Map folder ran in
Chromium and WebKit together under load. Every other engine test passed in
the same runs.

## Cause

`maplibreEngine` resolved its mount on MapLibre's `load` event. `load` fires
from the render loop, after the style and every first tile have settled, so
it needs a rendered frame after the last tile answers. In that test the tiles
fail asynchronously, from MapLibre's worker, after the page's first frames.
A page that stops painting while idle, as headless browsers do under load
(see `linux-webkit-no-frames-while-idle.md`), never sends that frame, and the
mount waits forever. The other tests' maps settled during the first frames, so
they didn't hit it.

It wasn't only a test problem: an app's map wasn't usable until all of its
first tiles had drawn, and one slow tile held it back.

## Fix

The engine resolves on `style.load` instead, once the style is fetched and
parsed. The map can be driven, projected and marked from then on, and tiles
arrive as they arrive. A style given as an object still takes one frame
before `style.load`, since MapLibre parses it in `frameAsync`; a style given
by address takes none.

The guard is "is ready once its style loads, before any tile arrives" in
`maplibreEngine.browser.test.tsx`. It serves tiles from a protocol that never
answers (`addProtocol('never', () => new Promise(() => {}))`), so it times out
on any engine that waits for tiles, without depending on timing.

## Ruled out

- Load alone: each engine passed the full Map folder on its own, and pairs of
  Map files passed together.
- Slow tile errors: Chromium and WebKit both block port 1 at once, and the
  test took 200–330ms when it passed.
