---
title: A scroll helper's real timers fire after jsdom closes and fail the run
date: 2026-10-29
category: test-failures
module: docs
tags: [vitest, jsdom, timers, teardown, landOn, scroll, flaky, unhandled-error]
problem_type: test_failure
---

## Symptom

Every docs test passes, but Vitest fails the run with one unhandled error:

```
TypeError: target.removeEventListener is not a function
 ❯ Timeout.end src/components/landOn.ts:31:12
This error originated in "src/components/changelog/ChangelogTimeline.test.tsx" test file.
```

It happens now and then on CI and passes on a rerun. CI run 40801883725 hit
it on a push that only changed docs text.

## Cause

`landOn` (`docs/src/components/landOn.ts`) waits for a scroll to end with real
timers: a 150ms quiet spell and a 3s cap, then a `requestAnimationFrame` loop
for up to 1.5s. A test that clicks a rail month or a heading link calls it and
never waits for those timers or cancels them.

Vitest doesn't swap Node's `setTimeout` for jsdom's, so the timer survives
the environment's teardown. Teardown deletes the window's keys from
`globalThis`, and `landOn`'s scroll target is `window`, which is `globalThis`
there. When the file ends within 150ms of the click, the timer fires after
teardown, `removeEventListener` is gone, and the throw reaches Vitest's
uncaught-exception handler. Vitest reports it only while the run is still
open, so it shows when other files are still running on a slow runner, and
almost never when you run the file alone.

`OnThisPage.test.tsx` leaked the same way, four times per run.

## Fix

Don't leave a scroll helper's timers running at the end of a jsdom test.

- When the test is about the landing, use fake timers and run them out:
  `vi.useFakeTimers()` before the click, `act(() => vi.runAllTimers())` after
  the assertions, `expect(vi.getTimerCount()).toBe(0)`, and
  `vi.useRealTimers()` in `afterEach`. Fake timers also fake `performance` and
  `requestAnimationFrame`, so the settle loop ends.
- When the file also uses `waitFor` on a hook's result, fake timers only
  around the call that starts the landing, as `OnThisPage.test.tsx`'s
  `landing()` does. File-wide, they fake `waitFor`'s polling interval and
  nothing else wakes it. Don't mock the helper instead, since
  `CODING_STANDARDS.md` rules out mocking the repo's own modules.
- Reset the URL hash in `afterEach`. A hash left by one test makes the next
  mount land on it with real timers.

Never wait for the timers with a sleep.

## Reproducing it

A local run of the file alone passes, because the run ends before the late
throw is reported. To force it, run the file in an environment that keeps the
worker alive after teardown, beside a slower file that keeps the run open:

```ts
// slow-teardown-env.ts, a temporary file in docs/
import type { Environment } from 'vitest/runtime'
import { builtinEnvironments } from 'vitest/runtime'

const jsdom = builtinEnvironments.jsdom
export default <Environment>{
  ...jsdom,
  async setup(global, options) {
    const env = await jsdom.setup(global, options)
    return {
      async teardown(g) {
        await env.teardown(g)
        await new Promise((r) => setTimeout(r, 500))
      }
    }
  }
}
```

Swap the test file's `@vitest-environment jsdom` line for a plain comment,
since the docblock beats the CLI flag, add a node-environment test that waits
2s, and run both with `--environment=./slow-teardown-env.ts`. Before the fix it
reports the error above; after it, none.
