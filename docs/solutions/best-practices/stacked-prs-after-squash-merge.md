---
title: Updating a stacked PR after its base squash-merges
date: 2026-10-20
category: best-practices
module: repo
tags: [git, github, stacked-prs, squash-merge, merge-conflicts, workflow]
problem_type: best_practice
---

## Problem

PRs stacked on each other (the editor series roadie#573 to roadie#577, and
roadie#578 on roadie#575) each merge into `main` as one squash commit. The
squash commit shares no history with the base branch's commits, so merging
`main` into the next PR conflicts wherever the next PR changed lines the
base also changed, though `main` holds nothing the next PR lacks.

## Fix

Merge `main` into the next PR; never rebase it, which rewrites pushed
history and replays every base commit. For each conflicted file, check
whether `main` holds exactly the base PR's final version:

```bash
git diff --quiet <base-final-head> origin/main -- <file> && echo same
```

Where it does, the next PR's side already has the base's changes plus its
own, so take it: `git checkout --ours -- <file>`. Resolve any file that
differs by hand, since something else landed on `main` there.

`<base-final-head>` is the base PR's last commit, from
`gh pr view <base> --json headRefOid -q .headRefOid`.

## Check

After the merge, `git diff origin/main...HEAD --stat` lists only the next
PR's own files.
