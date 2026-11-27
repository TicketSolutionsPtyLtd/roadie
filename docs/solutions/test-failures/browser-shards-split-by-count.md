---
title: One Firefox shard timed out because Vitest splits shards by file count
date: 2026-11-24
category: test-failures
module: repo
tags: [ci, vitest, shard, sequencer, firefox, timeout, turbo]
problem_type: test_failure
---

## Symptom

On PRs that change `@oztix/roadie-components`, `browser (firefox 1/3)` was
cancelled at its 12-minute `timeout-minutes`. Every test that ran passed. The
other two Firefox shards finished in 8 and 10.5 minutes on the same run
(#967, run 45389822819).

Turbo prints a task's log group when the task ends, so the group timestamps
in the job log mark when each task finished. From them, the builds took about
40 s in all and the tests took the rest:

| Package    | Shard 1/3 | Shard 2/3 | Shard 3/3 |
| ---------- | --------- | --------- | --------- |
| components | 313 s     | 162 s     | 212 s     |
| editor     | 202 s     | 162 s     | 214 s     |
| blocks     | 54 s      | 42 s      | 59 s      |
| charts     | 40 s      | 23 s      | 29 s      |

## Cause

`vitest --shard` sorts files by a SHA-1 of their path and gives each shard
the same number of files. It ignores how long a file takes. Firefox runs
files one at a time (`fileParallelism: false`), so a shard's time is the sum
of its files. Shard 1 drew the slowest components files: `paneColumns` (30 s),
`interactionMatrix` (28 s), `DateRangePicker` (24 s), and `Calendar` (17 s).

A simulation of Vitest's split, run on the real per-file times from the
three job logs, matched shard 1's files exactly. It showed that a fourth
hash-split shard would still leave the slowest at about 10 minutes, since
the heavy files still cluster.

## Fix

- Each package with browser tests sets
  `sequence: { sequencer: sizeBalanced(BaseSequencer) }`. The sequencer's
  `shard()` deals files heaviest first onto the lightest shard
  (`scripts/lib/balance-shards.mjs`), weighed by file size. Vitest's own sort
  uses file size to guess a file's duration when it has no results yet. Size
  is the same on every runner, so the shards agree on the split without a
  timings file to keep up to date.
- The package passes its own `BaseSequencer`, because `vitest` is a
  dependency of each package, not of the repo root.
  `vitest.browsers.config.ts` only imports types from `vitest/node`. A value
  import there logs `UNRESOLVED_IMPORT` and works only because the config
  bundler leaves the import for Node to resolve from the package.
- Firefox runs on four shards, not three.

Simulated on the same times, with about 2 s of overhead per file, the slowest
Firefox shard's tests drop from 606 s to about 413 s. That is roughly 8.7
minutes of job time, where it was 12.

## Check

`node --test scripts/lib/balance-shards.test.mjs` fails if shards go back to
an even split by count. If a shard nears its limit again, read each
package's `Duration` per shard in the job log before you add a runner. If one
shard is far slower than the others, the split is the problem, not the
runner count. A file much slower than its size suggests (such as
`interactionMatrix`, with 832 tests) is the first thing to split.
