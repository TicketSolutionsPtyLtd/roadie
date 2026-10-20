---
title: A release waiting on approval stalls every later Release run
date: 2026-10-20
category: best-practices
module: ci
tags: [github-actions, release, changesets, concurrency, environments]
problem_type: bug
---

## Symptom

The Version Packages PR stopped updating and went stale with merge
conflicts. Every Release run after 15 October 2026 sat "pending" with no jobs,
then showed "cancelled" once the next push to `main` arrived. Only the
newest run was ever pending.

## Cause

Release used one workflow-wide concurrency group. A run started at #549
waited on the `production` environment's approval, which held the group
(seen in the runs; GitHub's docs don't say whether a job waiting on approval
holds its group). By default (`queue: single`) a group has one running and at
most one pending run, and a new run cancels the pending one
([concurrency](https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions#concurrency)),
so each new push replaced the last pending run and none of them could start. #553 moved the approval
to a Publish job that only runs at release, but a Publish left waiting would
stall the group the same way.

## Fix

Cancel the run waiting on approval (`gh run list --workflow release.yml --status waiting`). Approving it instead runs that commit's old workflow
with publish rights. The pending run then starts and rebuilds the Version
Packages PR.

To stop it returning, each job in `release.yml` has its own concurrency
group, so a Publish waiting on approval holds only the publish group, and
Version still runs on every Release run. Publish checks out its own run's commit, not
the tip of `main`, so one approved late publishes that commit's versions, and
the next Publish publishes only what is still missing from npm.
