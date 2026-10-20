---
title: A restored row stops short when a pane header publishes its height late
date: 2026-10-20
category: test-failures
module: components
tags: [webkit, ci, resize-observer, records, row-restore, pane, flaky, tracing]
problem_type: test_failure
---

## Symptom

CI's Linux WebKit failed "restores the row under the header in a pane, and
again on remount" (`RecordTable.range.browser.test.tsx`) on its first
attempt: the restored row landed 25 to 26px below the table's sticky header.
A retry usually passed, so `main` stayed green. Local macOS WebKit never
failed, even under CPU load.

## Cause

The pane header compacts once the table scrolls. On a loaded runner the
pane's ResizeObserver published `--pane-header-height` about 700ms late.
When the table's sticky head finally moved up, nothing in the table
rendered, and `useRowWindow` re-measured its stuck inset only on render, so
the restore never re-pinned the row.

## Fix

`useRowWindow` (`Records/rowWindow.ts`) observes the header of the pane it
sits in and re-measures the inset inside the ResizeObserver callback
(roadie#581). The pane's own observer is created first, so the new height is
already published when the table's callback runs. A first attempt measured
a frame later; on the loaded runner that frame came 535ms late, after the
restore's one-second hold had let go, and it failed one run in two.

When a measurement races a timer, measure in the observer callback, not in
a `requestAnimationFrame` after it.

## Tracing a failure only CI shows

1. Turn retries off for the one test, so every run shows the failure:
   `it('…', { retry: 0 }, async () => …)`.
2. Sample what matters each frame with `requestAnimationFrame` (time, scroll
   position, the boxes involved) and rethrow a failed check with the
   timeline in its message, under a tag you can search the log for:

   ```ts
   try {
     await check
   } catch (error) {
     throw new Error(`RESTORE-TRACE ${JSON.stringify(timeline)}\n${error}`)
   }
   ```

3. Run CI: push to a PR labelled `full-browsers`, or dispatch it on the
   branch (`gh workflow run ci.yml --ref <branch>`), which runs every engine
   on every package. Read the failed job's log and push the next probe. Drop the tracing and the `retry: 0` before
   review.

Two CI runs passing first time with retries off is the evidence a fix holds.
