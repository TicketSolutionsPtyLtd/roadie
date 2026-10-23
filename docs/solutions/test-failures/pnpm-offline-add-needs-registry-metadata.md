---
title: pnpm add --offline fails on CI when the store came from a frozen install
date: 2026-10-23
category: test-failures
module: lint-plugin
tags: [pnpm, offline, ci, consumer-test, cache, flaky]
problem_type: test_failure
---

## Symptom

`packages/lint-plugin/test/oxlint-consumer.test.js` passed locally and on its
PR, then failed on `main` straight after the merge (run 39881073360), and twice
on a later PR that changed the lockfile:

```
pnpm add -D --offline <tarball> oxlint@1.88.0
ERR_PNPM_NO_OFFLINE_META
```

## Cause

`pnpm install --frozen-lockfile` fills the store with package files but no
registry metadata, since the lockfile already says what to fetch. `pnpm add`
resolves a spec such as `oxlint@1.88.0`, and `--offline` can only do that from
cached metadata. The test passed on any runner whose restored pnpm cache came
from an install that had fetched metadata, and failed on a fresh cache, which
any lockfile change gives.

## Fix

Install consumer apps with `--prefer-offline`. It takes packages from the store
and fetches only the metadata the store lacks. Keep `--offline` out of tests
that CI runs, and check a new consumer test on a branch that changes the
lockfile, where the cache misses.
