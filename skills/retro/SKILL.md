---
name: retro
description: Use after a session, a PR, or a week of PRs, in any Oztix repo, to turn what went wrong into durable fixes. Gathers review findings, Copilot and other bot threads, CI failures, reruns, flakes, and rule slips, tallies them by category, maps each pattern to the cheapest durable fix (a deletion, a lint rule or check, a skill edit, a standards or workflow line, an AGENTS.md pointer, a docs/solutions entry, or a decision), and lands each as its own small PR. Reads the host repo's AGENTS.md and CODING_STANDARDS.md. Triggers on "run a retro", "retro this PR", "retro the week", "what did Copilot catch", "never write the same correction twice".
---

# Roadie retro

Never write the same correction twice. A retro reads what reviewers, bots,
CI, and people had to correct, and changes the system so the next change
doesn't need it. Adapted from Matt Pocock's retro skill (MIT). The host repo's
`AGENTS.md` (or `CLAUDE.md`), `CODING_STANDARDS.md`, and PR workflow win over
anything here.

## 1. Scope and gather

Pick one scope: this session, one PR, or a set of PRs (a week, or a branch
prefix). Then collect every correction in it, with its source.

- The host rules, to know what already exists:
  `git ls-files | grep -iE 'agents.md|claude.md|coding_standards|pr_workflow'`,
  plus the lint config, the decision register (`docs/decisions/` or similar),
  learnings (`docs/solutions/` or similar), and the skills in use.
- The PRs:
  `gh pr list --state merged --search "merged:>=<date>" --limit 100 --json number,title,headRefName,body`
  (or `head:<prefix>` for a branch prefix). Bodies hold the review's "Fixed"
  and "Previously missed" lists and each bot's precision line, such as
  "Copilot: N of M findings real".
- Bot and reviewer threads for each PR, with the replies that say whether a
  finding was real: the paginated `reviewThreads` query in
  `/roadie:shepherd` step 5, plus each review's body for findings with no
  thread.
- CI: `gh run list --branch <branch> --json conclusion,attempt,databaseId`
  per PR. Failures (`gh run view <id> --log-failed`), reruns (`attempt` over
  1), flakes (passed on retry, or on the quarantine list), and cancelled runs
  from extra pushes.
- Rule slips: a person correcting the agent, lint warnings added, a hook
  skipped, a step done out of order, and, for a session, commands that failed
  or ran far more often than needed.

## 2. Tally

One row per finding: PR, source (our review, Copilot, another bot, CI, a
person), real or not, and a category named for the mistake, not the file
("a check that misses a form it claims", not "eslint"). Then group:

| Category | Real | Not real | Caught by | Example |
| -------- | ---- | -------- | --------- | ------- |

Real means fixed or filed; not real means it stood. Count noise too: a
category that is mostly not real is a reason to tune or drop that source.
For each category, note whether a step we already run should have caught it.

## 3. Map each pattern to the cheapest durable fix

A pattern is two or more findings in one category, or one Critical. A
one-off fixed in its own PR needs nothing more. Take the first rung that
would have stopped it:

1. **Delete.** A rule, doc, skill step, or config that is unused, duplicated
   elsewhere, or contradicts another. Two copies of a list will drift; keep
   one and point at it.
2. **Automate.** A lint rule (Roadie: `eslint/roadie-plugin.js`, with a test
   for each form it must catch), a guard test, a CI check, or a script. A
   check beats prose every time it can catch the thing.
3. **Skill edit.** A step, or a class in `/roadie:review`'s bug hunt, in the
   skill that ran when it slipped. What bots still catch belongs in the
   bug hunt.
4. **Standard or workflow line.** A reviewer's judgement call goes in
   `CODING_STANDARDS.md`; process goes in the PR workflow. Replace or cut a
   line when you add one.
5. **Pointer.** One line in `AGENTS.md` naming the doc an implementer
   needed and didn't find. Never copy the rule itself.
6. **Learning.** A `docs/solutions/` entry (symptom, cause, and fix, with a
   sibling's frontmatter) when no check can catch it.
7. **Decision.** A register entry when the same call keeps being re-argued.

Prefer deletion and automation over prose. A finding whose fix would touch
CI config, rulesets, or files another team owns becomes a ticket for its
owner.

## 4. Act

- Each fix is its own small PR on its own branch, grouped by area: one for
  the skill, one for a lint rule, one for a deletion. Each follows the host
  workflow (`/roadie:pr`, then `/roadie:shepherd`).
- The tally and the mapped actions go in the retro's PR body, or in the
  first fix's body when the retro has no PR of its own. Not in a repo file,
  and never in agent memory.
- Anything not done now becomes a ticket under the host's follow-up rule.

## 5. Report

The scope, the tally table, each action with its rung and PR link, and what
you left alone and why. A retro that finds no pattern says so; otherwise it
is done when its first action has merged.
