---
title: A frame cap set from two CI runs fails about one Perf run in four
date: 2026-11-25
category: test-failures
module: testing/frames
tags: [perf, frames, ci, flaky, budget, style, pane, navigator]
problem_type: test_failure
---

## Symptom

The Perf workflow failed 9 of about 30 runs on `main` over 24 and 25 Nov and
passed on rerun. Pull requests failed `perf (components)` on scenarios their
diffs don't touch. Navigator's "phone, into a show" failed in every one of
those runs, sometimes with RecordGrid, RecordTable, DataTable, or FileUpload
beside it. Once Navigator stopped failing, Pane's push style cap and its
100-row pop failed instead, in 5 of 16 jobs.

## Cause

Two things, and neither was the harness's CPU calibration.

- **Real work split over two frames.** Before #1030, a phone push did its
  restyle twice: once on commit and again a frame later, when Pane.Header's
  ResizeObserver wrote the header height. Whether the second pass landed in
  the push's frame or the next one varied from run to run. In 78 CI runs,
  the push failed in 11 of 24 runs with two long tasks and 2 of 54 with one.
  The budget sets the worst frame aside, so one long frame passes and two
  fail. #1030 made the push one long task: Navigator's push failed in 0 of 16
  jobs after it, against 2 of 8 on the commit before.
- **Caps set from two runs.** #1030 set Pane's style cap 10% over the higher
  of two CI runs (119ms, cap 131ms). Over 17 jobs on the same commit the
  push's style ran 83 to 144ms, and the pop's 75 to 123ms. A cap inside that
  spread fails whenever a job lands high.

Ruled out:

- **The calibrated CPU rate.** Rates ran 1.4x to 2.9x over 78 runs, and failing jobs
  averaged 1.86x against 1.95x for passing ones.
- **Runner speed at style work.** A fixed style recalc, timed at the
  calibrated rate in each of eight jobs, ran within 17 to 25ms in all of
  them, while the push's style ran 83 to 144ms in the same jobs.

## Fix

- Measure the spread before setting a cap, a `knownMiss`, or taking one off:
  run the Perf job on eight runners at once (`testing/frames/README.md`,
  "Setting a cap from CI"), and set the cap 10% over the highest job.
- Pane's content style cap is now 158ms, 10% over 144ms. It still fails the
  218 to 259ms that pushes cost before INNO-1678. The empty-panes cap comes
  down from 53 to 44ms, 10% over 40ms.
- Pane's 100-row pop goes back to a known miss under INNO-1706, the
  whole-subtree restyle that also drives its style time.
- A transition that's sometimes two long frames is real work to fix, not
  noise. Look at `longTasks` in the frame report: two where one is usual
  means work arriving a frame late.
