# 0007 Docs pages are MDX by default

## Context

Foundations pages are React while component pages are MDX, so docs prose is
styled in two places and most pages hand-build layout.

## Decision

New docs pages are MDX. React is kept for pages that need it, and the
foundations pages convert to MDX.

## Consequences

Prose gets one stylesheet and one set of page conventions, and a check can
enforce them.

## Links

- [PR workflow, section 4](../contributing/PR_WORKFLOW.md#4-docs-blocking-for-new-components)
- INNO-1158 and INNO-1159
