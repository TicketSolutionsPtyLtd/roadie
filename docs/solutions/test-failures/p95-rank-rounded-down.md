---
title: Frame tests failed at exactly 5% of frames slow, as p95 rounded its rank down
date: 2026-11-27
category: test-failures
module: testing/frames
tags: [perf, frames, ci, flaky, budget, p95, calibration]
problem_type: test_failure
---

## Symptom

Perf jobs failed on scenarios the PR didn't touch, about one job in nine:
RecordGrid, Card, Combobox, PhoneField, Collapsible, Accordion, and
Pane scrolls and transitions. The failing run looked like a slow runner: p95
33.3ms, 3.3% of frames dropped, no long task, and a passing rerun.

## Cause

`summariseFrames` read p95 as `sorted[floor(0.95 * n)]`. For 60 frames that's
the 58th of 60, the third-slowest, so 3 slow frames (exactly 5%) failed p95,
while the dropped-share check, which sets the worst frame aside, passed them.
Nearest rank (`sorted[ceil(0.95 * n) - 1]`) reads the 57th, so p95 is slow
only when more than 5% of frames are.

Each `perf (components)` job uploads one frame report, a line per scenario.
Replaying 850 of them (19 to 27 Nov) with nearest rank, after checking that
the replay reproduced every p95 verdict the old rule recorded:

- Jobs failing an unexcused budget: 91 of 850 to 46. From 25 Nov noon,
  leaving out the eight-runner sampling branches: 23 of 305 to 6.
- The backdrop-blur misses still missed: DateRangePicker's drawer in 674 of
  676 runs, and Dialog, Drawer, CommandPalette and the rest in every run.
- The 2,000-item Combobox without `virtualized`, an accepted miss on the 5%
  line, now passes about half its runs; its exception stays.

Ruled out:

- **The calibrated CPU rate under-measuring slow runners.** Failing jobs
  averaged 2.05x against 1.98x for passing ones.
- **A whole job running slow, worth a retry.** Across the scenarios a
  failing job passed, the mean dropped share was 0.12%, against 0.11% in
  jobs that passed.
- **Excusing steady drops with no long task.** A miss from drawing alone is
  a real miss (`testing/frames/README.md`, "What the numbers mean").

## What's left

RecordGrid's scrolls drop 4 to 16% of frames on some runners, with no long
task. It happened only at calibrated rates of 2.2x and over: 14 of 191
runs, against 0 of 490 below. It wasn't the calibration: the first scroll
in the browser was compiling code inside the measured frames
([the first scroll compiled in the measured frames](first-scroll-compiles-in-measured-frames.md)).

## Fix

- Percentiles read by nearest rank (`testing/frames/src/stats.ts`), with
  table tests at 3 and 4 slow frames of 60, and 6 and 7 of 120.
- Before calling a frame failure noise, replay it: download the
  `frames-components` artifacts, recompute the verdict, and group failures
  by what tripped them (p95 only, dropped share, long task) and by
  calibrated rate. A cluster on one threshold is a rule to fix, not a
  runner.
