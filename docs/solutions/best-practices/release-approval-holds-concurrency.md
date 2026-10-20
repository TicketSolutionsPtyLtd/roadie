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
waited on the `production` environment's approval, which held the group.
GitHub keeps at most one pending run per group, so each new push replaced
the last pending run and none of them could start. #553 moved the approval
to a Publish job that only runs at release, but a Publish left waiting would
stall the group the same way.

## Fix

Cancel the run waiting on approval (`gh run list --workflow release.yml`
shows it as `waiting`). Approving it instead runs that commit's old workflow
with publish rights. The pending run then starts and rebuilds the Version
Packages PR.

To stop it returning, each job in `release.yml` has its own concurrency
group, so a Publish waiting on approval holds only the publish group, and
Version still runs on every push.
