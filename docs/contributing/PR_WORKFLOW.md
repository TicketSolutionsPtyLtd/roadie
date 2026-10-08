# PR workflow

How a change gets from idea to `main` in Roadie. It applies to people and to
agents alike. Read `AGENTS.md` first; this page is the process around it.

## 1. Before you start

- **One PR, one concern.** Small PRs that a teammate can review in one
  sitting. Split a large change into a sequence that leaves `main` working
  after each step.
- **Branch from the latest `main`** in its own worktree:
  `git worktree add ../roadie-<slug> -b <prefix>/<slug> origin/main`, then
  `pnpm install --frozen-lockfile`. Never edit, check out, or build in the main
  checkout; it stays on `main`. Remove the worktree and branch once the PR
  merges.
- **Agree the intent before any code** for new components and system-level
  APIs. Don't commit plan or spec files: they bloat the diff and go stale.
  - **One PR:** the PR description is the plan and the record (section 7).
  - **A series of PRs:** keep a working spec in the gitignored `.scratch/`.
    As each PR lands, move its lasting decisions into the maintained docs
    below and drop them from the spec.
- **Lasting knowledge goes where it's maintained:** consumer changes in the
  changeset, rules in `AGENTS.md`, `CODING_STANDARDS.md` and the foundations
  pages, behaviour on the component's docs page, learnings in
  `docs/solutions/`, follow-ups in Jira (section 9). Corrections and learnings
  go into the repo, never agent memory.
- **Decide and carry on.** When a call is open, pick the recommended option,
  record it under Decisions, and keep going; the maintainer can veto it in
  review. Stop and ask only for a one-way door (section 7), a limit in section
  10, spending money, or anything outside the team. Check
  [`docs/decisions/`](../decisions/README.md) first, and add an entry when a
  call will outlast the PR.
- **Check prior art for a new component API.** See how two other platforms
  solve it and record what you take and what you avoid, with their cons,
  under Decisions.
- **Look for what already exists.** Before adding a token, utility, prop or
  mechanism, show that the cascade, intent, emphasis, data attributes or an
  existing component can't already do it. A second way to say the same thing
  makes choosing the right option harder.

## 2. Build

- **Test first.** Write the failing test, watch it fail, then write the code.
  Pure logic gets table-driven unit tests. Anything CSS decides gets a
  `*.browser.test.tsx` that runs in Chromium, WebKit and Firefox.
- **Fix root causes.** No retries, sleeps or `!important` to make something
  pass. If a component's styles leak into another (a parent's descendant
  selector resizing a nested icon), fix the scope, not the symptom.
- **Wire new public subpaths everywhere they ship from:** an `exports`
  entry in `package.json`; for JavaScript, a `tsdown.config.ts` entry unless
  a wildcard already covers it (components does) and a Size Limit budget
  about 10% above what you measure (`.size-limit.json`, or the `size-limit`
  field in `package.json` for core and widgets). New `@utility` classes also
  go in `src/css/safelist.html`.
- **Changing Turbo config?** Read the installed turbo's `docs/README.md`
  first; the installed version may differ from what you know.
- **Changesets.** `minor` for a new export, `patch` for a fix, per package
  touched. While a release is held, edit the existing changeset of an
  unreleased API rather than adding a "breaking" entry for something nobody
  has installed.

## 3. Roadie conventions and foundations (blocking)

Every PR is checked against these before review. Fix every real hit.

- **`AGENTS.md`**: colour utilities and intents, emphasis shortcuts,
  interaction utilities, layout (grid first, `gap` not margin), shape tiers,
  iconography (bold Phosphor, `Icon` suffix, Tailwind sizing), typography
  (raw elements with `text-display-*`), linking (`href`, never `next/link`
  inside `packages/`; the docs app may use it), forms (`Field` wraps every
  control), the `:has()` selector rule, and the code rules.
- **[`CODING_STANDARDS.md`](CODING_STANDARDS.md)**: the reviewer's
  judgement rules.
- **Foundations pages** in `docs/src/app/foundations/` for the area you
  touch: layout, typography, shape, interactions, colours, elevation,
  iconography, date and time, linking.
- **Component patterns**: `docs/contributing/BASE_UI.md` for Base UI
  wrappers, `docs/contributing/COMPOUND_PATTERNS.md` for compounds, and
  `Badge/index.tsx` as the cva reference.
- **Roadie audit** of the added lines (`git diff origin/main...HEAD -U0`):
  hardcoded colours, `dark:` variants, `flex flex-col` stacks, margin for
  sibling spacing, icon `size` props or wrong weights, headings without display
  classes, inline styles with a utility equivalent, `div` with `onClick`,
  deprecated APIs, non-existent text colours, manual hover instead of
  `is-interactive`.
- **Prop vocabulary** for new components: compare every prop name and value
  set with existing components that share the concept, and across every
  component in a batch built in parallel. Booleans are bare
  adjectives (`disabled`, `contained`, `combined`), never `is*`.
- **Contrast**: labels on strong fills reach APCA Lc 60. Any accepted
  exception is written down in the test and the docs.
- **Comments**: only the why, never the what.
- **Content**: sentence case, Australian spelling, plain active prose with no
  em dashes, and venues, events and promoters from
  [`EXAMPLE_DATA.md`](EXAMPLE_DATA.md). Only Australian cities and bands are
  real.

## 4. Docs (blocking for new components)

- A page built from `docs/src/app/components/fieldset/page.mdx` and checked
  line by line against `docs/contributing/COMPONENT_DOC_TEMPLATE.md`.
- A `case` in `docs/src/components/ComponentSkeleton.tsx` so the
  `/components` index shows the component as it ships, checked in light and
  dark. Chart pages need one in `ChartPreview.tsx`, foundations in
  `FoundationPreview.tsx` and token families in `tokens/TokenFamilyArt.tsx`;
  `CataloguePreview.test.tsx` fails for any listed page without art.
- Edit `.mdx` by hand; never run Prettier on it.
- Docs never point at files or code that `main` doesn't have.

## 5. Verify locally

- `pnpm build && pnpm typecheck && pnpm lint && pnpm test`, the browser
  tests for the files you touched, and the `size` script of every
  touched package that has one (`pnpm --filter <package> size`; `docs`
  has none).
- Rebuild before browser tests; stale `dist` misleads the `:has()` guard.
- **Keep the machine cool.** Check `uptime` before starting an agent, and
  wait while the 1-minute load is above the core count. Run tests with
  `pnpm test:gated <package>`, never vitest or `pnpm test` directly. It
  waits for the load, runs the changed tests in Chromium on half the cores,
  and stops after 10 minutes. Run `--all-browsers` once before pushing, and
  let CI run the full matrix. The pre-push hook also waits for the load before
  it typechecks and tests, and fails the push after 30 minutes. Give browser tests explicit timeouts and never
  wait on an infinite animation. Stop dev servers you start, and run
  `pnpm cleanup` (`--delete` to delete) when disk runs low.
- **Demo user-visible changes before pushing.** `pnpm preview` serves the
  docs from your worktree and prints the URLs a phone can open; set
  `ROADIE_PORT_RANGE` to your session's range and extra hosts in
  `NEXT_DEV_ORIGINS`. Post the link and screenshots at phone and desktop
  widths in light and dark, and work on something else until the maintainer's
  OK. Tooling, CI, skills, and docs-text PRs skip the demo.
- **Check the file list** (`git diff --name-only origin/main...HEAD`): no
  `.vitest/` screenshots, `test-results/`, coverage or images you didn't mean
  to add.

## 6. Review before the PR exists

A reviewer with fresh eyes, before anything is pushed. Run `/roadie:review`
in a fresh subagent: one pass covers both reviews below and test quality, and
commits its fixes:

1. **Design and conventions review.** Does the change meet its spec, follow
   section 3, keep public APIs consistent, and document behaviour changes in
   the changeset?
2. **Line-by-line bug hunt.** An adversarial pass like a code-review bot:
   controlled versus uncontrolled props and defaults (including `null`),
   stale closures and effects, async races and unmounts, focus and keyboard,
   IME composition, locale and time zones, SSR and hydration, accessible
   names and states, empty, zero and negative inputs, off-by-one, type holes,
   docs that claim something the code doesn't do, and tests that pass
   vacuously. Every finding needs a concrete failing input.

Fix Critical and Important findings test-first. If a fix is significant (new
logic, state or API, not a one-liner), review the fix commits again. Open
the PR only when the review is clean.

## 7. Open the PR and see it through

`/roadie:shepherd` carries a draft PR through this section and section 8.

- **The body is the record.** Fill in `.github/pull_request_template.md`:
  why, what changes, evidence that it works, merge danger, decisions a reader
  might question, what's out of scope (with Jira keys), and the checks run.
  `/roadie:pr` writes it. Keep it short and true when merged; the squash
  commit carries it into `git log`.
- **Open it as a draft** (`gh pr create --draft`). Copilot reviews once, when
  the PR is marked ready, and skips drafts. Run `gh pr ready` only after CI is
  green, the local review is clean and any demo is approved.
- **One-way doors** always get the maintainer's review: removing or renaming
  a public export, prop, intent, or subpath; changing a token's value or
  meaning; the shared CSS cascade, layers, base styles, or `.prose` output;
  and release contents. Merge danger opens with the door. A one-way door
  names the item it hits; anything else is a two-way door, which says why a
  revert undoes it.
- Copilot reads `.github/copilot-instructions.md`; update that file when a
  convention or a deliberate decision changes, and keep it under 4,000
  characters (Copilot reads no further).
- A review is clean when it shows "Open findings: None"
  **and** its body lists no "Previously missed" items. Fixes listed under
  "Fixed" don't count against it.
- For each finding: fix it test-first and reply naming the commit and test,
  or reply with why it stands. Resolve every thread.
- **Copilot is a last resort.** Fix its real findings yourself; each one is a
  gap in the local review.
- **Triage instead of looping.** Critical and Important findings are always
  fixed, however rare the case. A Minor one is fixed only if a real user
  would hit it in normal use; the rest become Jira follow-ups (section 9).
- **Flaky tests**: a known flake may be re-run once. A flake seen on two
  unrelated PRs gets fixed at its root in its own PR. Until then it can go on
  the quarantine list in `vitest.browsers.config.ts`, with its ticket. CI
  retries browser tests twice and flags any that pass on a retry.
- If `main` moves under you, update the branch and wait for CI again,
  especially after changes to shared CSS or the lockfile.

## 8. Merge

An agent merges a two-way-door PR itself (squash, delete the branch) once all
of these hold. A one-way door (section 7) waits for the maintainer.

- CI is green.
- The file list is clean.
- The local review is clean, and the one Copilot pass is triaged with every
  thread resolved.
- Behaviour changes for consumers are named in the changeset.

Never merge the Version Packages PR. The maintainer merges releases by hand.

## 9. Nothing deferred is dropped

Every Minor finding not fixed in its own PR becomes a Jira work item in the
**INNO** project with the **Roadie** component and the `follow-up` label,
holding the file and line, the finding, and a link to the PR thread it came
from. Add to the open `Roadie follow-ups: <area>` item before creating one,
listing findings as plain bullets (Jira shows `- [ ]` literally). Reply on the
PR thread with the Jira link before resolving it. When a later PR touches the
same code, it fixes the item there and closes it. The rest are batched by
area into follow-up PRs, or closed with a written reason.

## 10. What agents may change

- **Shared config.** CI workflows, git hooks, and `.claude/settings.json`
  change through normal PRs when a roadmap ticket needs it. Creating, changing,
  or deleting a ruleset, or changing branch protection, needs the maintainer.
- **Skills.** A skill ships v1 once it passes the trial in its ticket's "done
  when", then improves through retros. Skill PRs follow the normal merge rule.
- **Other repos.** Agents may move the prototype repo onto the Roadie plugin.
  Other repos wait until the plugin is released.
- **User settings.** For a change to someone's user-level Claude settings,
  propose the exact change and wait for their OK.
- **Sessions.** Run agents as local sessions only, never as cloud sessions
  billed on API tokens.
- **Parallel sessions.** Each session has a branch prefix and a dev server
  port range, and never touches another session's branches or worktrees: phase
  0 uses `p0/` and ports 3100 to 3199, phase 1 `p1/` and 3200 to 3299, and docs
  typeset `ts/` and 3300 to 3399. Rebase on `origin/main` before marking a PR
  ready.
