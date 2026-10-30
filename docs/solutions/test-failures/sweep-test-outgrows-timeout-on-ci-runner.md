---
title: A sweep test that groups hundreds of layouts in one `it` outgrows the timeout on CI
date: 2026-10-31
category: test-failures
module: components
tags: [vitest, browser-mode, webkit, ci, timeout, layout, sweep, pane, flaky]
problem_type: test_failure
---

## Symptom

`paneFallback.browser.test.tsx` "shows the top pane, and the root beside it
once two fit: rooted, 4 levels" timed out at 15s in CI's WebKit job on PR
#737, which doesn't touch Pane, after two retries, and passed on rerun. The
same log has a `ResizeObserver loop completed with undelivered notifications`
line, from RecordTable.narrow earlier in the run, which is a red herring.

## Cause

The test is synchronous and does only forced layout: it groups every shape of
a family (`rooted, 4 levels` is 16 reached sets × 12 variants = 192 shapes),
re-parses the row's markup at each of 19 widths, and reads
`getBoundingClientRect`, `getComputedStyle` and a focus probe per pane. Its
siblings took 1.2s, 3.4s and 6.7s on the runner for 1, 2 and 3 levels, so 4
levels lands at 13 to 15s there against 2.1s locally. Nothing waits on a
frame or an observer; the test is just too big for one timeout on a runner
six to seven times slower than a laptop, and each retry repeats all of it.

CPU load on macOS doesn't reproduce it: the engine keeps its share and the
test grows by about 10%. Compare per-test CI times against the local run of
the same file instead; a steady ratio across the family's sizes shows a
budget problem, not a stall.

## Fix

Group a sweep so each `it` covers one shape family of about 16 cases, as
`paneColumns.browser.test.ts` already did (strip only `/ reached NNN` from the
name), and resize one mount per shape rather than re-parsing the markup at
every width. The slowest case went from 2.1s to 150ms locally, with the same
assertions and total coverage, and a failure names the shape and width.

## Prevention

Size an `it.each` case by the work it does, not the concept it covers: a
case over about 2s locally is at risk in CI. When a test's time scales with a
parameter (levels, rows, widths), split along that parameter before raising a
timeout. `it.each` already names each case, so splitting costs nothing in the
report.
