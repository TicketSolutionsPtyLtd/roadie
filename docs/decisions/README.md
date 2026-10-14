# Decisions

Calls that only matter to Roadie, and why we made them. Check here and in the
Oztix [Decision log](https://oztix.atlassian.net/wiki/spaces/ID/pages/361529382)
before re-arguing a question. Per-PR decisions stay in the PR description.

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

## Here or in the Decision log

Who needs to find it decides where it lives.

- **A code comment** for a quirk that only makes sense next to the code.
- **The PR description** for a call about this change only.
- **Here** for a call that outlasts its PR, only matters to people and agents
  working in Roadie, is easy to reverse, and would move with the code.
- **The Decision log** if it spans more than one repo, someone outside Roadie
  needs it, it is a one-way door, it is a compromise with a date to come back
  to, or it sets a principle for other teams.

Never keep one decision in both places. When a Decision log entry shapes
Roadie, link to it from the rule it shapes. When an entry here turns out to
matter more widely, move it to the Decision log and leave a pointer.

## Adding an entry

Add one when a call belongs here and isn't obvious from the code or docs.
Copy an existing file, take the next number, and keep it to context, decision,
consequences, and links. When the decision is also a rule, link to
the rule and keep only the why here.

## Register

| No.                                       | Decision                                                 |
| ----------------------------------------- | -------------------------------------------------------- |
| [0001](0001-own-our-skills.md)            | We own our skills, moved to the Decision log             |
| [0002](0002-copilot-last-resort.md)       | Our review replaces Copilot; PRs stay draft until clean  |
| [0003](0003-nothing-in-agent-memory.md)   | Nothing lives in agent memory, moved to the Decision log |
| [0004](0004-brand-colours-are-intents.md) | Brand colours are hue-named intents                      |
| [0005](0005-roadie-mostly-wins.md)        | Roadie mostly wins over brand, moved to the Decision log |
| [0006](0006-writing-rules.md)             | Writing rules, moved to the Decision log                 |
| [0007](0007-mdx-by-default.md)            | Docs pages are MDX by default                            |
| [0008](0008-version-packages-by-hand.md)  | Version Packages is merged by hand                       |
| [0009](0009-real-browsers-for-tests.md)   | Browser tests use real browsers                          |
| [0010](0010-apca-contrast.md)             | Contrast is measured with APCA                           |
| [0011](0011-fence-layout-options.md)      | Live examples take preview layout from fence options     |
| [0012](0012-base-ui-focus-guards.md)      | Base UI focus guards stay nameless buttons in WebKit     |
