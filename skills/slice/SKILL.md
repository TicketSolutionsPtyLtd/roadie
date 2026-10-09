---
name: slice
description: Use when a specced feature is too big for one PR, in any Oztix repo, after /roadie:spec and before /roadie:implement. Cuts it into PR-sized slices in merge order, each under the host's PR size threshold and shippable alone, names what each carries (changeset, docs page and tile, browser tests, and its door), creates a Jira task per slice under the right epic, linked in merge order, and records the plan where the series spec lives. Reads the host repo's AGENTS.md and PR workflow. Triggers on "slice this", "split this into PRs", "break this down", "plan the PR series", "too big for one PR", "ticket the slices".
---

# Roadie slice

Cut a feature into PRs a teammate can each review in one sitting, in the
order they merge, and ticket them. It runs after `/roadie:spec`, which decides
what the feature is, and before `/roadie:implement`, which builds one slice.
The host repo's `AGENTS.md` (or `CLAUDE.md`), `CODING_STANDARDS.md`, and PR
workflow win over anything here.

## 1. Gather

- The spec: the series spec (`.scratch/<slug>/spec.md` in Roadie, or the
  ticket or epic comment `/roadie:spec` posted), the ticket, its comments, and
  its links. With no spec, run `/roadie:spec` first, unless a grill record
  already settles the shape; then its recommendation and assumed answers are
  the shared decisions. A new prop, component, or token with no grill record
  gets `/roadie:grill`'s ruling-out step first, so no slice builds what
  already exists.
- The host rules:
  `git ls-files | grep -iE 'agents.md|claude.md|coding_standards|pr_workflow'`.
  Note the PR size threshold, the changeset rule, the docs rule for a new
  component, the browser test rule, the wiring list, the one-way door list,
  and the Jira rules (project, component, labels). With no workflow, use
  Roadie's sections 1, 2, 4, 5, 7, and 9:
  `https://raw.githubusercontent.com/TicketSolutionsPtyLtd/roadie/main/docs/contributing/PR_WORKFLOW.md`.
- The threshold, from the size check if there is one
  (`git ls-files | grep -i pr-size`). Roadie's is 400 changed lines; tests
  count, while the lockfile, snapshots, changesets, and changelogs don't.
- The code each part touches: the packages, exports, tests, and docs pages,
  so each slice's size is an estimate from real files.

## 2. Cut

- **Vertical.** Each slice is a behaviour someone can use or read, with its
  tests and docs, never a layer (all the types, then all the tests).
- **Under the threshold.** Estimate each slice's lines from the files it
  touches, tests included. One that might run over splits again.
- **Shippable alone.** Once it merges, `main` builds, passes, and documents
  what it ships: no flag nothing reads, no export no page shows, and no docs
  pointing at code `main` doesn't have.
- **Merge order follows dependencies.** Shared logic before the components
  that read it, and components before the views that compose them. Name the
  slices that don't depend on each other, so they can run in parallel
  worktrees.
- **Tied files ride together.** A test or check that holds two files equal
  (a type test between props and a schema, a snapshot, the docs check) puts
  both in one slice. Grep the tests for the export before cutting between
  them.
- **One-way doors alone.** A slice that hits the host's one-way door list
  carries nothing else, so the two-way slices merge without waiting for the
  maintainer.
- **As few as fit.** Two slices that fit under the threshold together and
  share a reviewer's context are one.

## 3. What each slice carries

Check each slice against the host rules, and write what applies into its
ticket. With no host rule, use Roadie's.

| Carries                         | When                                              | Roadie rule                                        |
| ------------------------------- | ------------------------------------------------- | -------------------------------------------------- |
| A changeset per package         | a published package's shipped output changes      | PR workflow section 2                              |
| A docs page and index tile      | it adds a component                               | section 4, which the component docs check enforces |
| An example on the existing page | it adds a prop or behaviour                       | the page's template                                |
| Browser tests                   | CSS or the browser decides the behaviour          | `/roadie:test` boundary table                      |
| Wiring                          | a new export, subpath, or utility                 | `AGENTS.md` "Wiring something new"                 |
| A demo                          | anyone can see the change                         | section 5                                          |
| A door                          | always, naming the item or why a revert undoes it | section 7                                          |

## 4. Ticket

- **Epic.** The source ticket's parent, or else the open epic that owns the
  area (search epics by component and area). With none, don't create one.
  Leave the tasks without a parent, link each to the source ticket, and say
  so in the record for the maintainer to place.
- **One task per slice** in the host's project and component (Roadie: INNO,
  component Roadie). The summary says what the slice does, in sentence case.
  The description:

  ```md
  Why: <the problem, with the source ticket key>
  What: <the behaviour and public surface>
  Carries: <changeset, docs, tests, wiring, demo>
  Door: <one-way or two-way, and why>
  Done when: <the merged PR and what it proves>
  Slice <n> of <m> for <source key>. After <every key it needs, or none>.
  ```

- **Linked in merge order.** Each slice blocks the slices that need it (a
  `Blocks` link with the earlier slice as the blocker), parallel slices block
  nothing between them, and each relates to the source ticket.
- Leave them in To Do. A slice moves to In Progress when its PR opens.

Use the Jira tool the session has (an Atlassian MCP server, `acli`, or `twg`).
With none, put the drafts in the record and say they aren't created.

## 5. Record the plan

Put it where `/roadie:spec` keeps the series spec: a Slices section in the
gitignored `.scratch/<slug>/spec.md` (check with `git check-ignore`), and a
comment on the source ticket headed "Slices (with /roadie:slice)", so the
plan outlives the session. Never commit it.

```md
Feature: <one line, with the source key>
Epic: <key, or none and why>

| #   | Ticket | Slice | Packages | Lines (est.) | Carries | Door | After |
| --- | ------ | ----- | -------- | ------------ | ------- | ---- | ----- |

Parallel: <slices that can run at once>
Decisions: <each call made while cutting, and why>
```

After names every slice it needs, or none, so it matches the Jira links.
When a slice lands or the plan changes, edit that comment rather than add one.

## 6. Hand off

Each slice goes to `/roadie:implement` in merge order, one PR each. A slice
that runs over the threshold while it's built comes back here to split, and
the plan and tickets change with it, rather than shipping as one big PR.
