## Why

<!-- One or two sentences: the problem or goal. -->

## What changes

-

## Evidence

<!-- Proof it works: each command run and its result, CI links, and for UI the preview link and screenshots at phone and desktop widths in light and dark. Before and after for a fix or visual change. Say what you didn't verify. -->

## Merge danger

<!-- One-way or two-way door, and why, as PR_WORKFLOW.md section 7 says. Then the blast radius: what breaks if this is wrong, and how it's undone. -->

## Decisions

<!-- Anything a reviewer or future reader might question, and why. Delete if none. -->

## Out of scope and follow-ups

<!-- Jira keys (INNO, Roadie component). Delete if none. -->

## Checks

- [ ] `pnpm build && pnpm typecheck && pnpm lint && pnpm test`
- [ ] Browser tests for touched files (`full-browsers` label for CSS, layout, or iOS-sensitive changes)
- [ ] `size` for touched packages that have one
- [ ] Roadie conventions audit and both pre-PR reviews clean
- [ ] Changeset, or why none
