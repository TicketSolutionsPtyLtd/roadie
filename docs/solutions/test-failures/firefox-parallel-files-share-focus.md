---
title: Firefox browser tests that depend on focus flake when files run in parallel
date: 2026-09-27
category: test-failures
module: components
tags: [vitest, browser-mode, firefox, playwright, focus, focus-visible, flaky]
problem_type: test_failure
---

## Symptom

Keyboard tests pass alone and fail now and then in the full Firefox run. Enter
stops activating buttons, arrow keys do nothing, and `:focus-visible` stops
matching. The Menu test "still highlight the row a keyboard moves to" failed
about one run in three.

## Root cause

Vitest runs browser test files in parallel pages. In Firefox those pages share
one active window, so a file that focuses its page blurs the files running
beside it.

## Fix

Run Firefox's files one at a time and leave the other engines parallel (#198):

```ts
instances: browsers.map((browser) => ({
  browser,
  fileParallelism: browser !== 'firefox'
}))
```

Copy this into any package whose browser tests move focus.
