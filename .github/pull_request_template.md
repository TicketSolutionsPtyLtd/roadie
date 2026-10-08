## Why

<!-- One or two sentences: the problem or goal. -->

## What changes

-

## Evidence

<!-- Proof it works: each command run and its result, CI links, and for UI the preview link and phone-width screenshots in light and dark. Before and after for a fix. Say what you didn't verify. -->

## Merge danger

<!-- One-way or two-way door, naming the item it hits on PR_WORKFLOW.md section 7's list. Then the blast radius: what breaks if this is wrong, and how it's undone. -->

## Decisions

<!-- Anything a reviewer or future reader might question, and why. Delete if none. -->

## Out of scope and follow-ups

<!-- Jira keys (INNO, Roadie component). Delete if none. -->

## Checks

- [ ] `pnpm build && pnpm typecheck && pnpm lint && pnpm test`
- [ ] Browser tests for touched files, in Chromium, WebKit and Firefox
- [ ] `size` for touched packages that have one
- [ ] Roadie conventions audit and both pre-PR reviews clean
- [ ] Changeset, or why none
