---
name: review
description: Use before a PR is pushed or marked ready, to review a branch or PR in a fresh subagent on four axes (conventions, bug hunt, docs claims, and test quality) and commit the fixes. Works in any Oztix repo by reading that repo's AGENTS.md and CODING_STANDARDS.md; in an app on Roadie, it also reviews against the installed Roadie manifest, /roadie:build, and /roadie:audit. Triggers on "review this PR", "review my branch", "run the Roadie review", "pre-PR review".
---

# Roadie review

One adversarial pass over a diff, by a reviewer that didn't write it. It fixes
what is clearly wrong, commits the fixes, and comments only on judgement calls.

## Who runs it

- **Never the implementer.** If you wrote the change, start one fresh subagent
  with this skill, the PR number or branch, and the brief below. Don't pass
  your reasoning; the reviewer reads the code cold.
- **Guard the brief.** Include "You are the reviewer. Do not invoke review
  skills or spawn agents." A reviewer that starts more reviewers fans out
  without end.
- **One pass, no loops.** If the fixes add new logic, state, or API, the
  implementer may start one more fresh review of the fix commits only.

## 1. Gather

- The diff: `gh pr diff <n>` or `git diff origin/<base>...HEAD`, and the PR body
  or the branch's commit messages for intent.
- The host repo's rules: `AGENTS.md` (or `CLAUDE.md`), `CODING_STANDARDS.md`,
  and the PR workflow, wherever the repo keeps them:
  `git ls-files | grep -iE 'agents.md|claude.md|coding_standards|pr_workflow'`.
  Follow their links for the areas the diff touches. They win over anything
  here.
- Learnings the repo records (`docs/solutions/` or similar) for touched modules.
- Run the host repo's format and lint on the changed files. Hooks may have been
  skipped, so don't assume they ran. In a fresh worktree the first run installs
  every dependency, so check machine load first. Files no package lints, such
  as `skills/` and root `.md` and `.json` files, get Prettier, plus lint where a
  config covers them. Report only hits on added lines
  (`git diff origin/<base>...HEAD -U0`); a hit on an untouched line predates
  the diff.

## 2. Review on four axes

Read every changed line. Skip what lint, typecheck, or an existing guard test
already enforces. Each finding names its rule (file and section) or a concrete
input that fails. With neither, it isn't a finding.

**Conventions.** The added lines against the host repo's `AGENTS.md`,
`CODING_STANDARDS.md`, and workflow. In an app that uses Roadie, also review
it against Roadie, as the next section says.

**Bug hunt.** These are the classes that keep slipping past review to bots
and phones.
For a diff that touches only docs, skills, or config, hunt the last three
classes (checks, one setup, and docs that disagree), plus wrong commands,
instructions that would cause harm, and broken links.

- Controlled vs uncontrolled state and races: a controlled value changing
  mid-animation or mid-drag, `defaultValue` re-read on every render, `null`
  treated as uncontrolled, buffered writes dropped on unmount, stale closures,
  async parents that skip steps, effects without cleanup.
- SSR and hydration: `Date.now()`, time zone, locale, `window`, or
  `getBoundingClientRect` read during server render or differing on the client;
  `'use client'` missing or spread too wide.
- Edge-case data: empty, zero, negative, `NaN` from `parseFloat`, arrays
  where one value is expected, prototype keys (`constructor`, `__proto__`) read
  from plain objects, rounding of negative halves, off-by-one, DST, and layout
  that assumes a 16px root or a fixed row height. Check that an `as` or `!`
  isn't hiding one of these.
- Forms: hidden inputs submitting stale values, a missing `form` or `name`,
  parse errors that never reach native validation, `required` and `disabled`
  not reaching the control, IME composition.
- Interaction and access: focus lost or trapped, keyboard paths, accessible
  names and states, touch where hover is assumed.
- Mechanical slips: stray `console.log`, a fixed sleep in a test, a real
  venue or person in a fixture, a size budget far above measured, and docs,
  changeset, or PR body claiming something the diff doesn't do.
- Checks that miss what they claim: a lint rule, guard script, grep, or
  allow-list that skips a form (dynamic `import()`, an expression or
  template value, one of several breakpoints, a commented-out line), an
  exemption wider than the cases it names, or a build or test cache whose
  inputs miss a file the task reads. Feed each one an input it should catch.
- Works in one setup only, in a shipped skill or script: a hardcoded `main`,
  package manager, or port; a binary not on `PATH`; an API list read without
  pagination; a `git diff` that misses untracked files; a wait with no bound
  (`networkidle`); or a fallback to a file a consumer repo won't have.
- Docs and skills that disagree: with another doc, skill, or the workflow
  (step order, who approves, which door), or with what the code or a
  measurement shows; a case the steps don't cover; a copyable example that
  doesn't type-check; and a Markdown table with no delimiter row.

**Docs claims.** For a diff that adds or changes docs, a docs page, a
README, or a skill, check every technical claim against the code and specs:
props and their defaults, behaviour, token values, file paths, commands, and
links. Open the source each claim describes and run what you can. A claim
the code doesn't bear out is a finding, with the file and line that
disagree.

**Test quality.** Every test must be able to fail for a real defect.

- Tautological: asserts a constant equals itself or recomputes the
  expected value with the code under test. A compound's
  `expect(X).toBe(X.Root)` is not one; `COMPOUND_PATTERNS.md` section 3
  item 7 requires it.
- Structure-sensitive: reads source text, asserts class strings, CVA
  output, or internal call order instead of behaviour, roles, and states at
  the public interface. Roadie's public vocabulary (`intent-*`, `emphasis-*`,
  `is-interactive*`) is part of that interface and may be asserted.
- Cannot fail: mocks the thing under test or stubs a browser API so its
  real failure never happens, awaits nothing, or asserts in jsdom what only a
  browser decides (layout, `calc()`, container queries), or asserts inside a
  callback or loop that never runs, or checks only the final state, so a
  brief jump or flash on the way passes.
- Missing: a bug-hunt fix or new branch of behaviour with no test that
  fails without it.

Mutation-check every place a new prop or branch acts, not just one (both
Start and End, every click of a pager): break it
and run the tests. If they still pass, that place is untested. A test that
passes under every mutation you try is a cannot-fail finding: find why (such
as an interaction started during a settle that's always ignored), then fix or
delete it. A gap that existed before the diff gets a follow-up ticket, not a
fix in this PR.

## In an app that uses Roadie

The repo is an app on Roadie when a `package.json` in it (the root or a
workspace app's) depends on an `@oztix/roadie-*` package and no workspace
package has that name. In Roadie
itself, its own `AGENTS.md` covers this, so skip the section.

- **Read the installed manifests.** From the app's folder, list what each
  installed package ships, so every claim matches the app's version, not the
  latest:

  ```bash
  node -e '
  for (const p of ["core", "components", "charts", "widgets"]) {
    let m
    try { m = require(`@oztix/roadie-${p}/roadie.manifest.json`) }
    catch (e) { console.log(`no manifest: @oztix/roadie-${p} (${e.code})`); continue }
    console.log(m.package, m.version, m.components.map((c) => c.name).join(", "))
    for (const d of m.deprecations)
      console.log("deprecated:", d.import, d.export, d.prop ?? "", d.reason)
  }'
  ```

  Each component entry has its import, props, and, where a page exists, a
  `docs` link. Without `node_modules`, install first (check machine load).
  `MODULE_NOT_FOUND` means Node can't resolve the package from this folder:
  if `package.json` doesn't list it, the app doesn't use it; if it does, the
  version is too old to have `exports`. Either that or
  `ERR_PACKAGE_PATH_NOT_EXPORTED` means the version predates the manifest:
  read the package's `exports`, its
  `dist` types and defaults, and
  `grep -rn "@deprecated" node_modules/@oztix/roadie-*/dist --include='*.d.ts'`,
  plus the docs index at
  `https://ticketsolutionsptyltd.github.io/roadie/llms.txt`, whose `.md`
  links give each component's props. Docs describe the latest release, so
  check a prop against the installed types before citing it.

- **Review the added lines against `/roadie:build`.** Read that skill; it
  holds the rules, so don't restate them. Check every section from 1 to 13,
  above all: a component the manifest has rebuilt from `div`s and classes
  (1), records outside `RecordTable` or `RecordGrid` (2), layout (3), intent
  and emphasis (4), headings and text (5), icons (6), controls outside
  `Field` (7), links without `href` (8), empty and error states without
  `EmptyState` (9), and copy (13). Shape and elevation (10) has no audit
  check, so read for it. Charts and dashboards go to `/roadie:charts`, and setup gaps
  to `/roadie:setup`.
- **Run the `/roadie:audit` checks** on the changed files. Keep only hits on
  added lines, as with lint and format. Fixes follow section 3 here, not the
  audit's own loop, with audit Critical as Critical, Warning as Important,
  and Info as Minor.
- **Hand deprecations to `/roadie:migrate`.** A use of a manifest
  `deprecations` entry, or of a row in that skill's step 3 table (some
  deprecations aren't in the manifest), is a finding. Fix it with that skill's codemod or its
  hand steps; on a PR you can't push to, name the codemod in the comment.
- **Cite the source.** Each finding names the rule it breaks, so the author
  can check it: a `/roadie:build` section, an audit check ID, a manifest
  entry (package, version, and `import`, plus the prop or deprecation
  `reason`), or a docs page. The app's own `AGENTS.md` still wins where it
  differs.

## 3. Act

- **Fix** each clear finding on the PR branch. Where behaviour changes, go test
  first: write the failing test, watch it fail, fix, then run the affected
  tests the way the host repo's workflow says (check machine load first).
  Commit with a message naming the finding.
- **Refactor** once the tests are green: simplify obvious duplication or
  naming in the diff, keeping behaviour unchanged, in its own commit.
- **Comment** only on judgement calls (API shape, naming, scope, a trade-off the
  author may have chosen on purpose) and one-way doors, with the rule or
  failing input and your recommendation. When the PR's author started this
  review, add them to the body's Decisions section. On someone else's PR, post
  them as review comments. With no PR yet, put them in the report.
- **Triage** by the host workflow's severity rules. Without them, fix Critical
  and Important always; fix a Minor only if a real user would hit it, and list
  the rest as follow-ups.
- **Can't push** to the branch (someone else's PR)? Post every finding as a
  comment instead, with the fix you would make.

## 4. Report

End with `Open findings: None`, or the findings still open, grouped by axis:
severity, file and line, the rule or failing input, and where you raised it.
List what you fixed separately under "Fixed", each with its commit. On a
review of fix commits, list under "Previously missed" anything the first pass
should have caught. Note anything you couldn't check, such as
browser tests you couldn't run.
