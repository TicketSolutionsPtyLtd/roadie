# PR workflow

How a change gets from idea to `main` in Roadie. It applies to people and to
agents alike. Read `AGENTS.md` first; this page is the process around it.

## 1. Before you start

- **One PR, one concern.** Small PRs that a teammate can review in one
  sitting. Split a large change into a sequence that leaves `main` working
  after each step.
- **Branch from the latest `main`** in its own worktree:
  `git worktree add ../roadie-<slug> -b <branch> origin/main`, then
  `pnpm install --frozen-lockfile`.
- **Agree the intent before any code** for new components and system-level
  APIs. Don't commit plan or spec files: they bloat the diff and go stale.
  - **One PR:** the PR description is the plan and the record (section 7).
  - **A series of PRs:** keep a working spec in the gitignored
    `docs/superpowers/`. As each PR lands, move its lasting decisions into the
    maintained docs below and drop them from the spec.
- **Lasting knowledge goes where it's maintained:** consumer changes in the
  changeset, rules in `AGENTS.md` and the foundations pages, behaviour on the
  component's docs page, learnings in `docs/solutions/`, follow-ups in Jira
  (section 9).
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
  inside `packages/`; the docs app may use it), forms (`Field` wraps every control), styling rule 8 for
  `:has()`, and the code-quality rules.
- **Foundations pages** in `docs/src/app/foundations/` for the area you
  touch: layout, typography, shape, interactions, colours, elevation,
  iconography, date and time, linking.
- **Component patterns**: `docs/contributing/BASE_UI.md` for Base UI
  wrappers, `docs/contributing/COMPOUND_PATTERNS.md` for compounds, and
  `Badge/index.tsx` as the cva reference.
- **Roadie audit** of the added lines (`git diff origin/main -U0`): hardcoded
  colours, `dark:` variants, `flex flex-col` stacks, margin for sibling
  spacing, icon `size` props or wrong weights, headings without display
  classes, inline styles with a utility equivalent, `div` with `onClick`,
  deprecated APIs, non-existent text colours, manual hover instead of
  `is-interactive`.
- **Prop vocabulary** for new components: compare every prop name and value
  set with existing components that share the concept. Booleans are bare
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
  dark.
- Edit `.mdx` by hand; never run Prettier on it.
- Docs never point at files or code that `main` doesn't have.

## 5. Verify locally

- `pnpm build && pnpm typecheck && pnpm lint && pnpm test`, the browser
  tests for the files you touched, and the `size` script of every
  touched package that has one (`pnpm --filter <package> size`; `docs`
  has none).
- Rebuild before browser tests; stale `dist` misleads the `:has()` guard.
- **Keep the machine cool.** Iterate in one engine (`ROADIE_BROWSERS=chromium`),
  cap workers (`--maxWorkers=4`), run the three-engine set once before
  pushing, and let CI run the full matrix. Never wait on an infinite
  animation; give browser tests explicit timeouts. Stop dev servers you start.
- **Check the file list** (`git diff --name-only origin/main...HEAD`): no
  `.vitest/` screenshots, `test-results/`, coverage or images you didn't mean
  to add.

## 6. Review before the PR exists

Two separate reviewers, each with fresh eyes, before anything is pushed:

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
the PR only when both passes are clean.

## 7. Open the PR and see it through

- **The body is the record.** Fill in `.github/pull_request_template.md`:
  why, what changes, decisions a reader might question, what's out of scope
  (with Jira keys), and the checks run. Keep it short and true when merged;
  the squash commit carries it into `git log`.
- Request Copilot's review. It reads `.github/copilot-instructions.md`;
  update that file when a convention or a deliberate decision changes, and
  keep it under 4,000 characters (Copilot reads no further).
- A review is clean when it shows "Findings: None"
  **and** its body lists no "Previously missed" items.
- For each finding: fix it test-first and reply naming the commit and test,
  or reply with why it stands. Resolve every thread.
- **After three Copilot rounds, triage instead of looping.** Critical and
  Important findings are always fixed, however rare the case. A Minor one is
  fixed only if a real user would hit it in normal use; the rest become Jira
  follow-ups (section 9).
- **Flaky tests**: a known flake may be re-run once. A flake seen on two
  unrelated PRs gets fixed at its root in its own PR.
- If `main` moves under you, update the branch and wait for CI again,
  especially after changes to shared CSS or the lockfile.

## 8. Merge

Merge (squash, delete the branch) only when all of these hold:

- CI is green.
- The file list is clean.
- Both local reviews and Copilot are clean, every thread resolved.
- Behaviour changes for consumers are named in the changeset.

The Version Packages PR is merged only by a maintainer, when they decide to
release.

## 9. Nothing deferred is dropped

Every Minor finding not fixed in its own PR becomes a Jira work item in the
**INNO** project with the **Roadie** component and the `follow-up` label,
holding the file and line, the finding, and a link to the PR thread it came
from. Group related findings in one item with a checklist. Reply on the PR
thread with the Jira link before resolving it. When a later PR touches the
same code, it fixes the item there and closes it. The rest are batched by
area into follow-up PRs, or closed with a written reason.
