---
title: A test's temp git repo writes to the real repo when a hook runs it
date: 2026-11-05
category: test-failures
problem_type: test_failure
module: repo
tags:
  - git
  - GIT_DIR
  - GIT_WORK_TREE
  - pre-push
  - husky
  - fixture
  - core.bare
severity: high
---

# A test's temp git repo writes to the real repo when a hook runs it

## Symptom

A script test that builds a throwaway repo passes when run by hand. In the
pre-push hook it fails with `fatal: this operation must be run in a work
tree`, and afterwards git fails in every worktree. The shared `.git/config`
has `core.bare = true`, a `[user]` section from the test, and a `hooksPath`
pointing at a temp folder.

## Root cause

Git runs hooks with `GIT_DIR` (and sometimes `GIT_WORK_TREE`,
`GIT_INDEX_FILE` or `GIT_COMMON_DIR`) set to the repo being pushed. A child
`git` inherits them and ignores its `cwd`, so the fixture's `git init` and
`git config` land on the real repo's shared config.

## Fix

Give every `git` a test spawns, and every script under test, an environment
without `GIT_` variables, and run `git -C <fixture>`. Check
`git rev-parse --absolute-git-dir` after `git init` and stop if it isn't the
fixture's. `scripts/cleanup.test.mjs` does all three, and its decoy test sets
`GIT_DIR` to a throwaway repo and fails if that repo's config changes.

To reproduce safely, set `GIT_DIR` to an empty folder in the scratchpad, never
to a real repo: `GIT_DIR=<empty folder> node --test <file>`.
