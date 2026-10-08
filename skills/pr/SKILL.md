---
name: pr
description: Use when opening a PR or writing or updating its description, in any Oztix repo. Fills the host repo's PR template from the diff, with Evidence (proof the change works) and Merge danger (one-way or two-way door, plus blast radius), and keeps an existing body's content when updating. Triggers on "write the PR description", "open a PR", "update the PR body", "add Evidence and Merge danger".
---

# Roadie pr

Write the PR body a reviewer can trust without rerunning anything: what
changed, the proof it works, and how risky it is to merge. The host repo's
`AGENTS.md` (or `CLAUDE.md`), `CODING_STANDARDS.md`, PR workflow, and PR
template win over anything here.

## 1. Gather

- The host repo's rules and template:
  `git ls-files | grep -iE 'agents.md|coding_standards|pr_workflow|pull_request_template'`.
  Note its one-way door list, merge rule, and writing rules.
- The diff (`git diff origin/<base>...HEAD`, or `gh pr diff <n>`), the file
  list, the commit messages, and the ticket or spec.
- What you ran: test commands and their result, CI runs, the demo's preview
  link and screenshots, and the review report.
- Updating? The current body (`gh pr view <n> --json body -q .body`), saved
  to a file before you change anything.

## 2. Write each section

Follow the template's headings in its order. If it has no Evidence or Merge
danger section, add both after "What changes" (or its equivalent).

**What changes.** Only what the diff does. A body that claims more, or
describes another PR, is a review finding. Prefer a small table or pseudocode
to a long paragraph.

**Evidence.** Proof a reader can check, one line per claim:

- Each command you ran and its result (`pnpm --filter <pkg> test`: 412
  passed), with the engines for browser tests, or a CI run link.
- For UI, the preview link and screenshots at phone width, light and dark,
  from the demo the host workflow asks for.
- For a fix or behaviour change, before and after: the test failing without
  the change, then passing, or two screenshots.
- What you didn't verify, and why. "Tests pass" with no command isn't
  evidence.

If the body already holds the proof, such as a Trial or Checks section, sum
it up in a line and point at it rather than repeat it.

**Merge danger.** Start with "One-way door" or "Two-way door", then why,
then the blast radius.

- Judge the door against the host workflow's one-way door list and name the
  item it hits. Don't copy the list into the body. With no list, a one-way
  door is anything a revert can't undo: a published release, a removed or
  renamed public API, data or config others already depend on.
- Blast radius: which packages, consumers, repos, or pages change if this is
  wrong, how someone would notice, and how it's undone.
- A one-way door waits for the maintainer under the host's merge rule. Say so.

**Decisions** hold the open calls you made and why, so the maintainer can
veto them. **Out of scope** names follow-ups with ticket keys.

Write to the host repo's content rules, keep it short, and keep it true once
merged, because the squash commit carries it into `git log`.

## 3. Create or update

- New PR: open it as the host workflow says, usually as a draft with the
  ticket key in the title (`gh pr create --draft --body-file <file>`).
- Existing PR: never drop content. Keep every section, line, link, and
  trailer, add the missing sections in template order, and correct only what
  the diff now contradicts. Then `gh pr edit <n> --body-file <file>`.
- Check the result: `gh pr view <n> --json body -q .body | diff <old> -`
  shows only the lines you meant to add or change.
