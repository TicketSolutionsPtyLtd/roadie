# 0002 Copilot is a last resort and PRs stay draft until clean

## Context

PRs averaged about four Copilot rounds, and one took 27. Copilot kept finding
what a local review could have found first.

## Decision

Our own two reviews run before the PR exists. PRs open as drafts, which
Copilot skips, and are marked ready only when clean, so Copilot gets at most
one pass. Each real Copilot finding is a gap in the local reviews.

## Consequences

PRs need fewer review rounds and commits. A Claude Code hook blocks PRs opened
without the draft flag.
Each PR Copilot reviews records its precision in the body's Evidence
("Copilot: N of M findings real"), so we can tell whether the one pass still
finds anything.
Copilot no longer reviews automatically, because each review is billed to the
PR author, so it's requested at ready only for the risky changes PR workflow
section 7 lists (INNO-1203).

## Links

- [PR workflow, sections 6 and 7](../contributing/PR_WORKFLOW.md#6-review-before-the-pr-exists)
- [`.claude/hooks/require-draft-pr.mjs`](../../.claude/hooks/require-draft-pr.mjs)
