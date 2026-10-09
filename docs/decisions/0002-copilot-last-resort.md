# 0002 Our review replaces Copilot; PRs stay draft until clean

## Context

PRs averaged about four Copilot rounds, and one took 27. Copilot kept finding
what a local review could have found first. Copilot review is now off for
Roadie, and our own review replaces it (INNO-1203).

## Decision

Our own two reviews run before the PR exists, and PRs open as drafts and are
marked ready only when clean. Agents never request Copilot; `/roadie:review`
replaces it, and `/roadie:retro` turns Copilot's past catches into review
classes. For a security-sensitive change or a high-risk one-way door, Merge
danger may recommend a Copilot review, and the maintainer decides.

This supersedes the earlier one-pass rule, where Copilot reviewed every
ready PR once.

## Consequences

PRs need fewer review rounds and commits, and Copilot reviews only when the
maintainer chooses it. A Claude Code hook blocks PRs opened without the
draft flag. With no outside reviewer, a gap in the local review reaches
`main`, so the retro feeds what slips into the review checklist.

## Links

- [PR workflow, sections 6 and 7](../contributing/PR_WORKFLOW.md#6-review-before-the-pr-exists)
- [`.claude/hooks/require-draft-pr.mjs`](../../.claude/hooks/require-draft-pr.mjs)
