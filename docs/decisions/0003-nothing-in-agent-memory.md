# 0003 Nothing lives in agent memory

## Context

Agent memory gathered a dozen corrections in one week. Only one person's
agent saw them, and they drifted from the repo's rules.

## Decision

Durable rules live in the repo, lean and stated once. Transient things live in
the PR description, Jira, or the gitignored `.scratch/`.

## Consequences

Every agent and person reads the same rules. A correction becomes a repo
change, so it gets reviewed.

## Links

- [PR workflow, section 1](../contributing/PR_WORKFLOW.md#1-before-you-start)
- INNO-1133
