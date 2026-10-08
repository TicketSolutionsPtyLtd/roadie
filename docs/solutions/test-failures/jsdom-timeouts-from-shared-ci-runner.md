---
title: jsdom tests time out on CI when every package's suite shares the runner
date: 2026-10-09
category: test-failures
module: components
tags: [vitest, jsdom, ci, turbo, timeout, userEvent, flaky]
problem_type: test_failure
---

## Symptom

A jsdom test passes locally in about 300ms and times out at 5s on CI, then
passes on rerun. DashboardPeriod's "keeps its period without calling itself
required" and "starts custom dates from the previous period and lets them
change" did this in runs 37551834854 and 37556712581. Raising the file's
timeout to 15s stopped the failures but not the slowness: the file still took
39s to 64s on CI against 3.3s locally.

## Cause

The check job ran `turbo lint typecheck test` in one step, so eslint, tsc and
every package's Vitest pool ran at once on a 4 vCPU runner. Each heavy jsdom
file ran 8 to 20 times slower than alone (DashboardPeriod 66s against 3.3s,
DateRangePicker 72s against 6.7s). A test that clicks through a popover about
ten times does about 300ms of work, which at 16 times slower is the 5.2s seen.

Nothing in DashboardPeriod was slow. Profiling the slowest test showed no step
over 90ms, a dialog of 159 nodes, and no gain from
`userEvent.setup({ delay: null })`.

## Fix

Run `test` in its own turbo step with `--concurrency=1`, after lint and
typecheck, as the browser job already does. Throughput is the same, since the
work is CPU bound either way, but each test gets the runner's cores and its
time is close to its local time.

Don't raise a timeout for a test that is fast alone. Compare the CI file time
in the log (`gh run view <id> --log-failed`) with a local run of the same file
before looking for a slow step.

## Waiting before a negative assertion

A test that sleeps and then asserts something didn't happen passes whenever
the work is slower than the sleep. Wait for a positive signal first, then
assert the absence:

- For a late write, count the writes sent and shown, and wait until they
  match (RecordsSearch's "drops a new filter cleared before a late parent
  shows it").
- For a list that must not offer something, type a prefix that shows a known
  option, wait for it, finish typing, and wait for that option to go before
  asserting (DateRangePicker's "suggests no ranges in the Start field").

To check such a test can fail, break the behaviour it guards and run it.
