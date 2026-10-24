---
title: Chart label tests read the plot before Roadie has measured it
date: 2026-10-23
category: test-failures
module: charts
tags: [vitest, browser-mode, firefox, resize-observer, labels, flaky, load]
problem_type: test_failure
---

## Symptom

The StackedArea and LineChart "keeps the today and annotation labels apart"
browser tests failed at 280px and 320px with `text 0 overlaps 1`. They failed
in Firefox CI on roadie#629 (all three retries, then passed on a rerun) and
locally under load on roadie#625. Wider cards always passed.

## Root cause

Two things size a chart, and they don't settle at the same time:

- The engine (`@tanstack/react-charts`) sizes its SVG to its box itself, so
  the `viewBox` is the real width from the first paint.
- Roadie's `usePlotBox` measures the same box with a ResizeObserver and sets
  the width band in React state. Until that commits, the frame keeps
  `INITIAL_WIDTH` (640px), so labels are 12px and placed for the default band.
  ChartPlot hides the plot (`opacity-0`) until then.

`afterResize` waited a fixed two frames. Under load React committed the band a
few frames later, so the test measured a 246px drawing whose labels were
still 12px and placed for 640px. They really did overlap; nobody saw it,
because the plot was still hidden.

Forcing it confirmed this: a ResizeObserver that delivers 150ms late fails the
same five tests in StackedArea and LineChart every run.

## Fix

`afterResize` (`packages/charts/src/plot/browserTesting.tsx`) still waits two
frames, then polls until no plot host is hidden, which is ChartPlot's sign
that `usePlotBox` has measured. With the 150ms delay all 41 tests in both
files pass.

Wait for that state, not a number of frames, in any chart test that reads
layout. An SVG `viewBox` that matches its box isn't the signal, since the
engine sets it before Roadie measures.
