---
name: implement
description: Use when building a specced ticket or slice in any Oztix repo, after /roadie:spec and before /roadie:demo. Works in its own worktree on a correctly named branch, builds test-first at the spec's seams with /roadie:test, runs load-gated tests, wires new exports, rebuilds dist where docs or consumers read it, adds a changeset when a published package changes, and stops at the demo. Reads the host repo's AGENTS.md and CODING_STANDARDS.md. Triggers on "implement this", "build this ticket", "build the spec", "start on INNO-", "make the change".
---

# Roadie implement

Turn a spec into committed, tested work, then hand it to the demo. It calls the
other skills rather than repeating them. Adapted from Matt Pocock's `implement`
skill (MIT). The host repo's `AGENTS.md` (or `CLAUDE.md`),
`CODING_STANDARDS.md`, and PR workflow win over anything here.

## 1. Start from the spec

- The spec: the ticket comment, the scratch file, or the draft PR body. With
  none, run `/roadie:spec` first. Where the host workflow wants intent agreed
  before code (in Roadie, new components and system-level APIs), wait for it.
- The host rules:
  `git ls-files | grep -iE 'agents.md|claude.md|coding_standards|pr_workflow'`.
  Note the branch and worktree rule, the wiring list, the load rule, and the
  changeset rule. With no workflow, use Roadie's sections 1, 2, and 5:
  `https://raw.githubusercontent.com/TicketSolutionsPtyLtd/roadie/main/docs/contributing/PR_WORKFLOW.md`.

## 2. Worktree and branch

Never edit, check out, or build in the main checkout. Make a worktree from the
latest base, on a branch named the way the host says, with the ticket key and
your session's branch prefix (Roadie: PR workflow sections 1 and 10, so a
phase 1 session uses `p1/inno-1234-short-slug`):

```bash
git fetch origin
git worktree add <path> -b <prefix>/<ticket>-<slug> origin/<base>
cd <path> && pnpm install --frozen-lockfile
```

Never touch another session's branches or worktrees. Already in a worktree on
the right branch? Carry on there. A session that can't create another worktree
(a sandbox confined to its own) works in the one it has: commit anything open
on the current branch, then `git switch -c <branch> origin/<base>` and install
again. Never `git stash`; the stash is shared by every worktree.

## 3. Build at the seams

- Each behaviour in the spec's test seams goes through `/roadie:test`: one
  failing test, just enough code, then the next.
- Skills, docs text, and config have no unit seam. Run the trial or check the
  spec names instead.
- A failure you can't explain goes to `/roadie:debug`, not a retry or a
  longer timeout.
- Make it work; leave polish and standards to `/roadie:review`.

## 4. Keep the machine cool

Check `uptime` before every install, build, test run, preview, and push (pushes
run the hooks), and wait while the 1-minute load is over the host's limit
(Roadie: PR workflow section 5). Run tests through the host's gated runner,
never `vitest` or the whole suite directly. In Roadie, `pnpm test:gated <package>
<file>` while iterating (`<package>` is the folder, such as `components`), then
the touched browser files once with `--all-browsers` before handing off.

## 5. Wire what's new

A new public export, utility, or component ships from every place the host's
wiring list names. Read the list each time rather than working from memory. In
Roadie it's `AGENTS.md` "Wiring something new" (exports, tsdown entries, the
safelist, and `cn()` groups), PR workflow section 2 (Size Limit budgets), and
section 4 (a new component's docs page and index tile).

## 6. Rebuild dist where it's read

Docs, browser tests, and other packages read built `dist`, not source. After
changing a package they read, check `uptime`, then rebuild it
(`pnpm --filter <package> build`) before running them. A "module not found" or
an old behaviour in the docs usually means stale `dist`.

## 7. Changeset

When a published package's shipped output changes, add a changeset per package
(`pnpm changeset`, or a file in `.changeset/`), written for consumers, with the
bump and held-release rules from the host workflow (Roadie: PR workflow
section 2). Tests, docs, and internal tooling need none; say why under the
PR's Checks.

## 8. Stop at the demo

Before handing off: typecheck and lint the touched packages, check the file
list (`git diff --name-only origin/<base>...HEAD`) for stray screenshots or
output, and commit with the ticket key. Don't push yet.

- A user-visible change goes to `/roadie:demo`, which previews it and waits for
  the OK before any push.
- Anything else ends with the spec's trial or check, and its result goes in
  Evidence.

Then `/roadie:review` in a fresh subagent, `/roadie:pr` for the draft, and
`/roadie:shepherd` to merge. Report the branch, the tests and what each
proves, the runs you made, and anything you decided under Decisions.
