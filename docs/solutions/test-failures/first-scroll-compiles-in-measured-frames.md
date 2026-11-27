---
title: RecordGrid's first scroll dropped frames while the browser compiled its code
date: 2026-11-27
category: test-failures
module: testing/frames
tags: [perf, frames, ci, flaky, calibration, warmup, jit, RecordGrid]
problem_type: test_failure
---

## Symptom

RecordGrid's "2,000 cards, scroll" and "10,000 cards, scroll" frame tests
dropped 4 to 16% of frames on some Perf runners, with no long task. In CI's
frame reports from 19 to 27 Nov it happened only on runners calibrated at
2.2x or more: 14 of 191 runs, against 0 of 490 below.

## Cause

The first scroll in the browser pays one-time costs, such as compiling the
virtualiser's and the cards' code, and those landed in the measured frames:
main-thread time per frame ran 10 to 15ms on the first scroll, against 8 to
11ms on later ones at the same rate. The slowed CPU multiplies that cost.
In the full suite, earlier files had already warmed part of the code, so
what was left tipped over the budget only on the most throttled runners.

The calibration was the first suspect: its workload is plain JS, so a runner
that runs JS fast might be throttled too hard for Blink's style and layout
work. Probing 16 runners ruled it out:

- Every runner measured a style and layout workload at 2.9 to 3.4 times its
  JS workload's time, across all four CPU models (AMD EPYC 7763, 9V74, and
  9V45, and Intel Xeon 8370C). A runner's CPU model doesn't change how its
  rendering speed relates to its JS speed.
- Each runner scrolled RecordGrid ten times at its usual rate. The first
  scroll dropped 9 to 20% of frames on all 16, from 1.8x to 2.7x. The other
  nine dropped none on 15 runners, and 2.5% once on the other.

Then eight runners scrolled RecordGrid alone, as the first file in the
browser, and eight more did the same after 60 uncounted frames:

| First scroll    | Jobs failing | 2,000 cards, mean dropped | Worst |
| --------------- | ------------ | ------------------------- | ----- |
| Counted         | 3 of 8       | 4.5%                      | 10.5% |
| After a warm-up | 0 of 8       | 0.7%                      | 2.5%  |

## Fix

- `measureFrames(step, { warmup })` runs that many uncounted frames of the
  step first (`testing/frames/src/index.ts`). RecordGrid's scrolls warm up
  for 60 frames, then count 120.
- The warm-up is per test, not the default. Most scenarios don't pay a cold
  cost that shows, and a warm-up hides the first run of the step, so a test
  opts in when its first run is measurably slower than its later ones.
- A slowed card still fails: see the PR for INNO-1760 for eight runners
  with a busy loop in RecordGrid's card render.

## Before blaming the calibration

Repeat the scenario on one runner. If only the first run misses, it's a
cold start: warm up. If every run misses on some runners and not others,
compare what the calibration measures with what the scenario spends its
frames on.
