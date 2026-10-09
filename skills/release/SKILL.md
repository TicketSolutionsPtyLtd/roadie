---
name: release
description: Use before the maintainer merges the Version Packages PR in a repo that releases with Changesets. Read-only. Summarises the pending changesets by package and bump, calls out majors, minors, and one-way doors with their PRs, and reports whether the release is ready (main CI, the Version Packages PR against main, missing changesets, open one-way doors, versions) as pass, fail, or attention. Never merges, approves, or pushes. Triggers on "is the release ready", "summarise the release", "what's in Version Packages", "release check".
---

# Roadie release

Prepare a release for the maintainer to merge by hand. The output is text in
the session and nothing else. The host repo's `AGENTS.md` (or `CLAUDE.md`),
`CODING_STANDARDS.md`, PR workflow, and decision register win over anything
here.

**Read-only.** Never merge, approve, review, comment on, edit, rebase, or
push to the Version Packages PR or its `changeset-release/<base>` branch, and
never run `changeset version` or `changeset publish`. Don't add or edit a
changeset here either; a gap becomes its own PR. Release timing is the
maintainer's call, so don't suggest a date or a cadence.

## 1. Gather

- The host rules:
  `git ls-files | grep -iE 'agents.md|claude.md|coding_standards|pr_workflow|docs/decisions/'`.
  Note the changeset rules, the one-way door list, and the release decision.
  With no list, use Roadie's PR workflow section 7:
  `https://raw.githubusercontent.com/TicketSolutionsPtyLtd/roadie/main/docs/contributing/PR_WORKFLOW.md`.
- The base branch: `baseBranch` in `.changeset/config.json`, or `main` when
  it's unset. Below, `main` means that branch.
- `git fetch origin`, then read everything from `origin/main`, never a local
  branch.
- The published packages: each `packages/*/package.json` that isn't
  `private`, less the `ignore` list in `.changeset/config.json`.
- The Version Packages PR:
  `gh pr list --head changeset-release/main --json number,headRefOid,url`,
  then `git diff --name-status origin/main...origin/changeset-release/main`
  for its files, since `gh pr view --json files` stops at 100.
- The pending changesets: every `.changeset/*.md` but `README.md`, with the
  bump per package from its frontmatter. Find the PR that added each one
  from `git log --diff-filter=A --format=%s -1 origin/main -- <file>` (the
  squash subject ends in `(#<n>)`). A commit with no PR number is a direct
  push; name its short sha.
- The last release: the newest `chore: version packages` commit on main.

## 2. Changeset summary

One table per package, in the order core, components, charts, then the rest:
current version, next version, and the bump. Under it, list each changeset as
one line with its PR link, majors first, then minors, then patches.

Then call out:

- **Majors**, each with what breaks and the PR.
- **Minors**, as the new public API they add.
- **One-way doors**, by the door list from step 1. Take the door from the
  PR's Merge danger. Older PRs may have none, so judge the changeset text against the
  door list and mark those "unmarked, judged one-way".

## 3. Readiness check

Report each line as **pass**, **fail**, or **attention**, with the evidence.
Fail blocks the merge; attention needs the maintainer to look.

1. **Main CI.** The latest CI run on main's head commit
   (`gh run list --workflow <ci> --commit <sha>`). Pass when it succeeded,
   attention while it runs or before it starts, fail when it failed.
2. **Version Packages is current.** Compare the PR's parent with
   `origin/main`. Pass when main hasn't moved. When it has, pass if no newer
   commit adds, edits, or removes a changeset and the changesets the PR
   deletes match the pending set exactly. Otherwise it's attention while a
   Release run on main is still pending, since that run rebuilds the PR, and
   fail once none is. Say how far behind it is. The PR's own CI is skipped by design; main's CI runs on
   merge.
3. **No changeset missing.** For each commit on main since the last release
   that touched `packages/` with no changeset, keep only what ships:
   source that isn't a test, test helper, story, or snapshot, CSS, `exports`,
   and runtime `dependencies` or `peerDependencies` ranges. Comments, dev
   dependencies, scripts, and build config don't ship. Fail when a package
   would ship a change and has no changeset at all. Attention when the
   package is bumped anyway but the change isn't named, such as a Dependabot
   major of a runtime dependency.
4. **No open one-way door it depends on.** List open PRs that add or edit a
   `.changeset/` file
   (`gh pr list --state open --limit 200 --json number,title,files`).
   Fail when one edits or deletes a pending changeset, or a pending changeset
   waits on it. Attention for any other open one-way door with a changeset,
   since it joins this release if it merges first.
5. **Versions look sane.** Main's versions match npm
   (`npm view <pkg> version`), each next version is the highest pending bump
   applied once, none is already on npm (`npm view <pkg>@<next> version`
   returns 404), and no major is unannounced. Attention for a `0.x` minor,
   which a `^0.y` range won't pick up.

## 4. Hand off

Post the summary and the readiness lines as text, with a one-line verdict:
**ready**, **ready with attention**, or **not ready**, naming each fail.
Follow the host's writing rules, and keep hosts, local paths, tokens, and
real names out (Roadie's PR workflow section 7). The maintainer decides when
to merge.
