---
title: gh pr merge --auto merges at once when no required check is pending
date: 2026-10-20
category: best-practices
module: repo
tags: [github, auto-merge, ci, drafts, branch-protection, workflow]
problem_type: best_practice
---

## Problem

`gh pr merge --auto` reads as "merge after CI", but GitHub merges as soon as
the branch protection's required checks pass. When none is pending, it
merges straight away. On a draft, CI runs only the `check` job and skips the
browser jobs, so a PR marked ready with auto-merge on can merge before the
full run it just started has finished.

## Fix

Don't use auto-merge to wait for CI. Wait for the specific run, then merge:

```bash
gh run watch <run-id> --exit-status && gh pr merge <n> --squash --delete-branch
```

`gh run list --branch <branch> --limit 1 --json databaseId` gives the run
that `gh pr ready` started. PR_WORKFLOW section 8 says what that run must
show.
