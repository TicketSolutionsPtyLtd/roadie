---
title: The Version Packages PR mirrors main's CI result
date: 2026-10-20
category: best-practices
module: ci
tags: [github-actions, release, changesets, required-checks, commit-status]
problem_type: best_practice
---

## Symptom

Version Packages (#213) never got the required `CI result` check. Auto-merge
waited forever, and the maintainer merged it with an admin bypass.

## Cause

Two changes a day apart conflict:

- [#287](https://github.com/TicketSolutionsPtyLtd/roadie/pull/287) gives the
  version commit `[skip ci]`, because CI runs on a bot-pushed branch sat at
  "action required" waiting for approval.
- [#357](https://github.com/TicketSolutionsPtyLtd/roadie/pull/357) made the
  `CI result` job the one check the "Require CI result" ruleset asks for.

With `[skip ci]`, nothing reports `CI result` on the release branch.

## Fix

The release branch is one version commit (versions and changelogs) on top of
a main commit that CI has already tested, and main runs CI again on the
merge. So the PR's `CI result` is main's CI result for that commit, posted as
a commit status by `.github/workflows/release-ci-status.yml`:

| Main's CI run for the base commit   | `CI result` on the PR |
| ----------------------------------- | --------------------- |
| Concluded success                   | success               |
| Any other conclusion, cancelled too | failure               |
| Queued, running, or not started     | pending               |

It runs after Release's Version job pushes the branch, and again whenever
CI on main completes. Each run reads the current branch, so the status
follows the newest base, and the shared concurrency group stops an older
read posting after a newer one. A branch with anything beyond the version
commit is left alone, since a pushed commit runs CI itself.

The ruleset names no source app, so a commit status from `GITHUB_TOKEN`
satisfies it, and that status triggers no further runs.

## If it's stuck

- **Failure from a cancelled or flaky main run:** rerun that run
  (`gh run rerun <id>`, linked from the status). Its completion re-syncs.
- **Anything else:** run Release CI status by hand
  (`gh workflow run release-ci-status.yml`).
- **Check without posting:**
  `GITHUB_TOKEN=$(gh auth token) GITHUB_REPOSITORY=TicketSolutionsPtyLtd/roadie node scripts/sync-release-ci-status.mjs --dry-run`.

## Rejected

A GitHub App token for the version push would run real CI on the release
branch, but it brings back the approval-gated bot runs #287 removed and needs
an App and secrets to manage.
