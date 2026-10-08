---
name: spec
description: Use before writing code for a ticket or feature, in any Oztix repo. Writes the PR body (or a gitignored series spec for multi-PR work) with the test seams, the demo, Evidence, and Merge danger, checks the repo's decision register first, and records new cross-cutting decisions. Reads the host repo's AGENTS.md and CODING_STANDARDS.md. Triggers on "spec this", "write the spec", "plan this ticket", "how should we build", "turn this into a PR plan".
---

# Roadie spec

Turn a ticket or conversation into the plan an implementer can start from:
what changes, where the tests go, how it's shown, and how risky it is. The
host repo's `AGENTS.md` (or `CLAUDE.md`), `CODING_STANDARDS.md`, PR workflow,
and PR template win over anything here.

## 1. Gather

- The ticket, its comments and links, and the conversation so far. Answer
  facts yourself by reading; don't ask the user what the code or docs say.
- The host repo's rules and template:
  `git ls-files | grep -iE 'agents.md|claude.md|coding_standards|pr_workflow|pull_request_template'`.
  Note where specs live, the one-way door list, the merge rule, the demo
  rule, and the writing rules. With no workflow, use Roadie's section 1:
  `https://raw.githubusercontent.com/TicketSolutionsPtyLtd/roadie/main/docs/contributing/PR_WORKFLOW.md`.
- The decision register (`docs/decisions/` or wherever `AGENTS.md` points):
  its "how we decide" rules and every entry the work touches. Cite an entry
  instead of re-arguing it.
- Prior art: recorded learnings (`docs/solutions/` or similar), the docs pages
  for the area, and existing code that already does part of the job. Show
  that what exists can't do it before you add a mechanism.

## 2. One PR or a series

- **One PR** when a teammate can review it in one sitting. The spec is the PR
  body. Save it to a gitignored file (`.scratch/<ticket>.md` in Roadie), or
  post it on the ticket if the repo ignores no scratch path, until there's a
  commit to open the draft PR with; `/roadie:pr` keeps it and fills in the
  results.
- **A series** otherwise. Write a working spec in the gitignored scratch
  directory (`.scratch/<slug>/spec.md`): the goal, shared decisions, and
  PR-sized slices in merge order, each leaving `main` working and each with
  the sections below. As a slice lands, its lasting decisions move to the
  maintained docs or the register, and leave the spec.
- Never commit a spec or plan file. Check with `git check-ignore <path>`.

## 3. Write it

Follow the host template's headings in order, and add any of these it lacks
after "What changes". With no template, use these in order. Write to the host's content rules and keep it short:
behaviour and boundaries, not a step-by-step plan.

**Why.** The problem in one or two sentences, with the ticket key.

**What changes.** The behaviour and the public surface (props, exports,
commands, files a user reads). A small table beats a paragraph.

**Test seams.** The public boundaries where tests go, using `/roadie:test`'s
boundary table: one line per behaviour, naming the boundary and the test
type. Never an internal function or a class string. Skills, docs, and config
have no unit seam; name the trial, check, or CI run that proves them instead.

**Demo.** What to show and how. For UI, the page or story, the states to
show, and the preview the host workflow asks for (Roadie's section 5). For
anything else, the run that shows it working (a trial on a real ticket or PR,
a command and its output), even where the host workflow skips the demo gate.
Pick a trial that can finish before the PR is marked ready, so its result
lands in Evidence, and name its target exactly. A skill that acts on PRs is
trialled on another PR, not its own.

**Evidence.** The proof the finished PR will carry: which commands, which
before and after, and what you expect not to verify. `/roadie:pr` fills in
the results.

**Merge danger.** "One-way door" or "Two-way door", why, and the blast
radius, written as `/roadie:pr` writes it.

**Decisions.** Each open call with the option you picked and why, so the
maintainer can veto it. **Out of scope** names follow-ups with ticket keys.

## 4. Decide and carry on

- An open call takes the recommended option, goes under Decisions, and work
  continues. Stop and ask only where the host workflow says to (Roadie's
  section 1).
- A call that will outlast the PR and isn't obvious from the code gets a
  register entry in the same PR, in the register's own format, or a line in
  the entry it extends. If it's a
  one-way door or reverses an entry, propose it under Decisions instead and
  leave the entry for the maintainer's OK. A repo with no register keeps it
  under Decisions.
- Where the host workflow wants intent agreed before code (in Roadie, new
  components and system-level APIs), post the spec where the maintainer will
  see it (the ticket or the session) and work on something else until they
  reply.

## 5. Hand off

Post or save the spec where the implementer starts: the ticket comment, the
scratch file, or the draft PR body. The implementer builds test-first at the
named seams with `/roadie:test`, runs the demo, and opens the PR with
`/roadie:pr`. A spec that turns out wrong is updated where it was posted,
with the change under Decisions, not worked around.
