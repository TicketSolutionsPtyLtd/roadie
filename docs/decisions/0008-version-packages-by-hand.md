# 0008 Version Packages is merged by hand

## Context

Merging the Version Packages PR publishes to npm, and a release can't be
taken back.

## Decision

Agents never merge it. The maintainer merges releases by hand.

## Consequences

Release timing is a human call. Agents may merge other two-way-door PRs.

## Links

- [PR workflow, section 8](../contributing/PR_WORKFLOW.md#8-merge)
