# Decisions

Durable, cross-cutting calls and why we made them. Check here before
re-arguing a question. Per-PR decisions stay in the PR description.

## How we decide

- **Undecided calls.** Pick the recommended option, record it, and carry on
  ([PR workflow, section 1](../contributing/PR_WORKFLOW.md#1-before-you-start)).
- **Reuse before adding.** Show the cascade, intent, emphasis, data attributes,
  or an existing component can't do it first
  ([PR workflow, section 1](../contributing/PR_WORKFLOW.md#1-before-you-start)).
- **CSS paradigms first, and fixes for every app.** See API design in
  [`CODING_STANDARDS.md`](../contributing/CODING_STANDARDS.md#api-design).
- **Roadie mostly wins** over outside guidelines
  ([0005](0005-roadie-mostly-wins.md)).
- **Doors.** A one-way door waits for the maintainer; a two-way door doesn't
  ([PR workflow, section 7](../contributing/PR_WORKFLOW.md#7-open-the-pr-and-see-it-through)).

## Adding an entry

Add one when a call will outlast its PR and isn't obvious from the code or
docs. Copy an existing file, take the next number, and keep it to context,
decision, consequences, and links. When the decision is also a rule, link to
the rule and keep only the why here.

## Register

| No.                                       | Decision                                                |
| ----------------------------------------- | ------------------------------------------------------- |
| [0001](0001-own-our-skills.md)            | We own our skills                                       |
| [0002](0002-copilot-last-resort.md)       | Our review replaces Copilot; PRs stay draft until clean |
| [0003](0003-nothing-in-agent-memory.md)   | Nothing lives in agent memory                           |
| [0004](0004-brand-colours-are-intents.md) | Brand colours are hue-named intents                     |
| [0005](0005-roadie-mostly-wins.md)        | Roadie mostly wins over brand                           |
| [0006](0006-writing-rules.md)             | Writing rules                                           |
| [0007](0007-mdx-by-default.md)            | Docs pages are MDX by default                           |
| [0008](0008-version-packages-by-hand.md)  | Version Packages is merged by hand                      |
| [0009](0009-real-browsers-for-tests.md)   | Browser tests use real browsers                         |
| [0010](0010-apca-contrast.md)             | Contrast is measured with APCA                          |
