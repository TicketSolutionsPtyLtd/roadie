# Roadie Skills

Claude Code skills for working with the [Roadie design system](https://ticketsolutionsptyltd.github.io/roadie/).

These skills ship as a Claude Code plugin. Installing the plugin makes them available in any repo you open.

## Available skills

| Skill             | Command                   | What it does                                                                                                                                                                                                                                                     |
| ----------------- | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `audit`           | `/roadie:audit`           | Scan a codebase for Roadie compliance (hardcoded colours, wrong layout, icon misuse, deprecated props, and missing setup), and optionally fix.                                                                                                                   |
| `build`           | `/roadie:build`           | Build a screen, form, dialog, or list with Roadie: a manifest component first, grid and gap, intent and emphasis, display headings, `Field`, `href`, `RecordTable`, `EmptyState`, and house copy.                                                                |
| `charts`          | `/roadie:charts`          | Build charts and dashboards with Roadie, not the generic dataviz skill: form and colour by job, specs checked with `validateDashboard`, app-owned actions and links, and house-style copy.                                                                       |
| `codebase-design` | `/roadie:codebase-design` | Find deepening opportunities in an area that's hard to test or spread across files, with one vocabulary (module, interface, depth, seam, locality, and leverage), and propose them ranked before any refactor.                                                   |
| `debug`           | `/roadie:debug`           | Debug a failing, flaky, or slow test or a bug: reproduce first, check the host repo's `docs/solutions`, test one hypothesis at a time, timebox, and end with a solution entry or a check.                                                                        |
| `demo`            | `/roadie:demo`            | Before pushing a UI change, start a long-lived preview, screenshot it at phone and desktop widths in light and dark, send the approver the link in the session, post the shots, and wait for their OK.                                                           |
| `grill`           | `/roadie:grill`           | Before a spec, check an idea against foundations, learnings, decisions, and prior art, prove the cascade or an existing component can't do it, then ask what's left one at a time and record what was ruled out.                                                 |
| `implement`       | `/roadie:implement`       | Build a specced ticket in its own worktree: test-first at the spec's seams with `/roadie:test`, load-gated tests, wiring, dist rebuilds, and a changeset, then stop at `/roadie:demo`.                                                                           |
| `migrate`         | `/roadie:migrate`         | Move an app off deprecated Roadie APIs: read the manifest's deprecations, run codemods for the mechanical rewrites (`LinkButton` to `Button href`, `as` to `render`), migrate the rest by hand from each reason, then typecheck and build.                       |
| `pr`              | `/roadie:pr`              | Write or update a PR description from the host repo's template, with Evidence and Merge danger (one-way or two-way door, plus blast radius). Keeps existing content.                                                                                             |
| `release`         | `/roadie:release`         | Before the maintainer merges Version Packages, summarise the pending changesets by package and bump, flag majors and one-way doors, and report readiness as pass, fail, or attention. Read-only; never merges.                                                   |
| `retro`           | `/roadie:retro`           | After a session, a PR, or a week, tally what reviews, bots, and CI caught, map each pattern to the cheapest durable fix (a deletion, a lint rule, a skill edit, a standards line, a pointer, a learning, or a decision), and land each as its own PR.            |
| `review`          | `/roadie:review`          | Review a branch or PR in a fresh subagent for conventions, bugs, docs claims, and test quality, using the host repo's `AGENTS.md` and `CODING_STANDARDS.md`, and in an app on Roadie its installed manifest. Commits fixes and comments only on judgement calls. |
| `setup`           | `/roadie:setup`           | Set Roadie up in an app: packages, CSS imports, `RoadieProvider` with the app's Link, Phosphor `/ssr` in server components, client-only compounds, and dev origins, then verify.                                                                                 |
| `shepherd`        | `/roadie:shepherd`        | Take a draft PR to merged: rebase, wait for CI, mark ready, triage and resolve every review thread, record each bot's precision, and merge a two-way door or hand a one-way door to the maintainer.                                                              |
| `slice`           | `/roadie:slice`           | After a series spec, cut a feature into PR-sized slices in merge order, each shippable alone with its changeset, docs, tests, and door, then create the Jira tasks and record the plan.                                                                          |
| `spec`            | `/roadie:spec`            | Write the PR body, or a gitignored series spec, before code: test seams, demo, Evidence, and Merge danger, checked against the host repo's decision register.                                                                                                    |
| `test`            | `/roadie:test`            | Write tests first, one at a time, at the public interface, using the host repo's `AGENTS.md` and `CODING_STANDARDS.md`. Avoids tests that can't fail.                                                                                                            |

## Install

The Roadie repo is also a plugin marketplace named `roadie`, so the plugin's
id is `roadie@roadie`.

**For everyone in a repo**, commit this to the repo's `.claude/settings.json`.
Claude Code adds the marketplace and installs the plugin once someone trusts
the folder:

```json
{
  "extraKnownMarketplaces": {
    "roadie": {
      "source": { "source": "github", "repo": "TicketSolutionsPtyLtd/roadie" }
    }
  },
  "enabledPlugins": {
    "roadie@roadie": true
  }
}
```

**For yourself**, in any repo:

```
/plugin install roadie --marketplace TicketSolutionsPtyLtd/roadie
```

On Claude Code before 2.1.275, run `/plugin marketplace add
TicketSolutionsPtyLtd/roadie` and then `/plugin install roadie@roadie`.

The skills are then available as `/roadie:<skill>`.

### Versions and updates

The plugin's version is `version` in
[`.claude-plugin/plugin.json`](.claude-plugin/plugin.json), kept equal to
the private `roadie-skills` package in [`package.json`](package.json), and
[`CHANGELOG.md`](CHANGELOG.md) says what each version changed. Claude Code
caches the plugin by version, so a repo only gets new skills when the version
goes up.

- `claude plugin list` in a shell, or `/plugin` in a session, shows the
  version you have.
- To update now, open **Marketplaces** in `/plugin`, select `roadie`, and
  choose **Update marketplace**, or run `claude plugin update roadie@roadie`
  in a shell. `/plugin marketplace update roadie` only refreshes the listing.
  Run `/reload-plugins` or start a new session to load the new skills.
- To update in the background, open **Marketplaces** in `/plugin`, select
  `roadie`, and turn on auto-update. It's off by default for marketplaces
  outside Anthropic's.

## Authoring (internal)

Plugin layout. The plugin's root is `skills/`, so an install caches only the
skills:

```
roadie/
├── .claude-plugin/
│   └── marketplace.json   ← lists the plugin, so the repo is its own marketplace
└── skills/
    ├── .claude-plugin/
    │   └── plugin.json    ← plugin manifest (name, version, skills: "./")
    ├── CHANGELOG.md       ← one entry per plugin version, written by Changesets
    ├── package.json       ← private roadie-skills package that carries the version
    ├── README.md          ← this file
    └── <name>/
        └── SKILL.md       ← skill frontmatter + body, auto-discovered
```

**Every Roadie skill**, in this plugin or in `.claude/skills/`:

- **One folder per skill** with a `SKILL.md` inside. A flat `.md` file is never loaded.
- **Used automatically.** Don't set `disable-model-invocation`. The `description` says when the skill applies (the task, the files, the phrases someone would use), so an agent loads it without being asked.
- **Plain `SKILL.md`** with `name` and `description` frontmatter, so other agents can read it.

**Repo skills in `.claude/skills/`** stay short and link `docs/contributing/` or the foundations pages instead of copying their rules, so they can't drift.

**Releasing a change.** A PR that changes `skills/` adds a changeset for the
private `roadie-skills` package (`pnpm changeset`): minor for a new skill or a
change in what a skill does, patch for wording and fixes. Don't bump versions
by hand. The version ships when the maintainer merges the Version Packages PR,
which bumps `skills/package.json`, writes `CHANGELOG.md`, and copies the
version into `.claude-plugin/plugin.json`. CI's `Check plugin release` step
fails a skills PR with no `roadie-skills` changeset, and any PR where the two
versions differ; `node scripts/check-plugin-release.mjs` runs it locally.
Repo-only skills in `.claude/skills/` need no changeset.

**Skills shipped in this plugin:**

1. **Must be self-contained.** A consumer repo won't have the Roadie source checked out, so don't reference `packages/components/...` or `AGENTS.md`-relative paths. Inline the rules or fetch from `https://raw.githubusercontent.com/TicketSolutionsPtyLtd/roadie/main/...` via WebFetch.
2. **Frontmatter `name` matches directory name** — e.g. `skills/audit/SKILL.md` has `name: audit`. The plugin namespace (`roadie:`) is added automatically at install time.
3. **Keep the `description` action-oriented** — it's what Claude matches against to decide when to invoke. Include trigger phrases ("audit against Roadie", "check Roadie compliance").

Project-scoped skills that only make sense inside the Roadie repo itself (e.g. `.claude/skills/new-component/`, which references `packages/components/src/...`, and `.claude/skills/docs-page/`, which runs the docs checks) stay in `.claude/skills/` and are **not** shipped in the plugin.
