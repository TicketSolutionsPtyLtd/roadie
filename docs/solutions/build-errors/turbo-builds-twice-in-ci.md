---
title: Every CI job built every package twice, because turbo's hashes changed between steps
date: 2026-10-20
category: build-errors
module: repo
tags: [turbo, ci, cache, prepare, pnpm, framework-inference]
problem_type: build_error
---

## Symptom

Each CI job's log shows the packages building in `pnpm install` (the root
`prepare` script runs `turbo run prepare`, which depends on `^build`), then
building again with `cache miss` in the job's next turbo step. Same commit,
same job, about 70 to 90s lost per job.

## Cause

Three things changed the build hashes between the two runs:

- `packages/core` builds `src/tokens/tokens.json`. It is gitignored, but turbo
  still hashes it because the build's `src/**/*.json` input matches it. Before
  the first build it doesn't exist, after it does, so core's hash, and every
  package that depends on core, changed.
- The CI steps passed `--framework-inference=false` and `prepare` didn't. The
  flag changes every task's hash.
- The browser shards passed `-- --shard=1/2`. Turbo hashes `--` arguments into
  every task in the run, dependencies included, though it passes them only to
  the tasks named.

`NEXT_PUBLIC_BASE_PATH` on every package's build did the same in the build
job, though only the docs read it.

## Fix

- `!src/tokens/tokens.json` in the core build's inputs.
- CI's turbo steps use turbo's default flags.
- The shard reaches vitest through `ROADIE_SHARD`, which the `test:browser`
  scripts expand and turbo declares as that task's env.
- `NEXT_PUBLIC_BASE_PATH` is the docs build's env only.

## Check

Compare hashes with a dry run, before and after building:

```bash
npx turbo run prepare --dry=json | jq -r '.tasks[] | select(.task=="build") | "\(.taskId) \(.hash)"'
ROADIE_SHARD=1/2 npx turbo run test:browser --dry=json | jq -r '.tasks[] | select(.task=="build") | "\(.taskId) \(.hash)"'
```

Every build should print the same hash in both, and a CI step after
`pnpm install` should show `cache hit, replaying logs` for each build.
