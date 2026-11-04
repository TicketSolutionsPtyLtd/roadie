---
title: A turbo task a package doesn't define still runs that package's dependsOn
date: 2026-11-04
category: build-errors
problem_type: build_error
module: turbo
tags:
  - turbo
  - dependsOn
  - check:package
  - docs e2e
components:
  - turbo.json
  - .github/workflows/ci.yml
severity: high
related_files:
  - turbo.json
  - .github/workflows/ci.yml
---

# A turbo task a package doesn't define still runs that package's dependsOn

## Symptom

CI's docs e2e tests failed on nearly every page with React error #418, a
hydration mismatch. They passed locally right after the docs build, and failed
locally once `pnpm turbo check:package` had run.

## Cause

`check:package` has `"dependsOn": ["build"]`. Docs has no `check:package`
script, but turbo still puts `docs#check:package` in the graph as a no-op, and
runs its dependencies. So `pnpm turbo check:package` ran `docs#build`.

In CI that rebuild had no `NEXT_PUBLIC_BASE_PATH`, so it overwrote the export
the e2e tests read, between the docs build and the tests.

## Fix

Scope the run to the packages that define the task:

```bash
pnpm turbo check:package --filter='./packages/*'
```

CI's "Check packages" step and `pnpm release` both pass this filter.

## Check

`pnpm turbo <task> --dry=json` lists every task turbo will run, including a
missing task's dependencies. Look for a `docs#` task before adding a step that
runs a task with `dependsOn: ["build"]`.
