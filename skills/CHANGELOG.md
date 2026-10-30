# roadie-skills

## 0.6.0

### Minor Changes

- c17a49e: `/roadie:charts` writes one chart as a chart document, checks it with `validateChartDocument`, and draws it to SVG with `renderChartDocument`, rather than a one-card dashboard or a hand-made SVG. It leaves PDF to the app.

### Patch Changes

- b0f142f: Update `DataCard` labels to wrap to two lines, then truncate, so a chart card's title such as "Tickets sold by ticket type" fits beside the Chart/Table switch and More. Actions sit on the label's first line, so they line up across a row of cards. A `stat` label still truncates on one line, so the values in a row of stat tiles line up. `COPY_LIMITS` labels grow to 60 characters at `sm` and `md` and 72 at `lg` and `full`, `CHART_LABEL_LIMITS` to 42 and 50, and `ACTIONS_LABEL_LIMITS` to 29 and 42, so `validateDashboard` warns about a card label only past two lines. Stat labels and context lines keep their one-line limits.
- 1ddb0e9: Fix the `/roadie:migrate` codemods writing Windows line endings into a file that uses `\n`. A file keeps its own line endings, and one with Windows line endings keeps the blank line after `'use client'`.
- 2a04a53: `/roadie:review`, `/roadie:implement` and `/roadie:shepherd` fix a Minor finding when it's in code the PR changes, and file only those in code it doesn't touch.
- 1ddb0e9: `/roadie:charts` reads full amounts in a chart as `$1,200.00` and names `decimals` and `trailingZeroDisplay`, and `/roadie:build` keeps cents in a cart, checkout, receipt, chart, or table and passes `trailingZeroDisplay: 'stripIfInteger'` to `formatValue` for money in copy, now that `currency` shows cents on every amount.
- 9897cdc: Update the `charts` skill: a server route that builds a card's CSV or image passes the card through `followPeriod` first, so a chart's comparison matches the Table view.
- a0b7a62: Reword the `audit` skill and the skills README without em dashes. The `audit` skill's dash check (H5) now names the dashes by code point, `\x{2013}` and `\x{2014}`, and matches the same text.

## 0.5.2

### Patch Changes

- f041392: `/roadie:release` no longer points at Roadie's shim guard test, which went with the shim. It says to keep such a test while a rename shim lives in the repo.

## 0.5.1

### Patch Changes

- 5c1b2fd: `/roadie:audit` installs the lint plugin by its new name, `@oztix/roadie-lint-plugin`, and swaps an app off `@oztix/roadie-eslint-plugin`.
- f02f183: `/roadie:audit` runs the lint plugin in oxlint, and falls back to ESLint only when oxlint can't run. An app without an oxlint config gets a one-off run from a temporary config, so an app on a legacy `.eslintrc` is checked too.
- 6483954: `/roadie:charts` routes part of a whole over time to `StackedArea` and lists the `stacked-area` plot kind.
- 835ccfe: `/roadie:release` checks dist-tags, flagging a `stage` tag or an undeprecated placeholder left from a first publish, and fails when a renamed package's shim would release again.
- 5531c2b: `/roadie:release` says npm can take up to about 10 minutes to show a large package after Publish, so wait before treating a missing version as a failed publish.
- 966da48: `/roadie:test` and `/roadie:review` name three tests that can't fail (an assertion the default layout meets, one on the wrong element, and a threshold zero meets), and review mutation-checks every new class and asserted element, restoring the file in the same command. `/roadie:implement` checks changeset, docs, and spec claims against a test or a measurement and runs touched browser tests in WebKit and Firefox before the demo, `/roadie:pr` treats the changeset and numbers as claims, `/roadie:shepherd` lints and typechecks the files both sides touched after a rebase, and `/roadie:demo`'s `shoot.mjs` scrolls to the first visible match and fails if it isn't in view.
- 873faa0: `/roadie:spec` makes a tool migration's test seam a parity check that seeds every form the old config catches, and `/roadie:slice` counts a partial move as both deleted and added lines when estimating a slice's size.
- 8c8c72d: `/roadie:review` formats files no package lints with the host repo's formatter, not always Prettier.
- 32f8eff: `/roadie:test` says the five testing lint rules ship in the `testing` preset of `@oztix/roadie-lint-plugin`, so an app can turn them on too.

## 0.5.0

### Minor Changes

- 0a0a22b: `/roadie:audit` runs `@oztix/roadie-eslint-plugin` for the checks a lint rule makes, and reports its hits by rule ID. It installs the plugin and adds its recommended config when the app lacks them, which also brings arbitrary z-index and radius classes into the audit. The skill no longer greps for `dark:` variants (A4), bare Phosphor names (C2), icon `size` props (C3), or hex colours in class strings (part of A3). C4 now checks only where `fill` and `duotone` belong, since the lint rule makes every icon bold, fill, or duotone.

  H6 now finds a hand-built calendar tile by its shape, a short month stacked over a day, so it flags sentence-case tiles as well as uppercase ones, to match `CalendarTile`'s sentence-case month.

- 421395a: `/roadie:content` writes and reviews copy against Roadie's Content section in place of the generic oztix-brand-guidelines skill. It loads the page for the job, checks the draft by rule heading, and reports each finding with its rewrite. `/roadie:build` and `/roadie:charts` hand copy reviews to it, and `/roadie:review` runs its checklist on changed copy.
- b45f82f: `/roadie:implement` ends a user-visible change with an explore gate before it
  hands off to `/roadie:demo`. In the preview, it drives each changed
  interaction, runs a keyboard-only pass, opens every overlay, tries edge
  content, and reads the console, with the repo's headless Playwright or a
  browser MCP the session has. Each bug it finds becomes a failing test before
  the fix. `/roadie:pr` puts what the pass exercised, and what it didn't, under
  Evidence, and `/roadie:demo` reuses the gate's preview.
- 4e6fdc6: `/roadie:motion` animates with Roadie in place of the generic motion-dev-animations skill: the component or utility for the job first, then the duration and easing tokens, and reduced motion covered in CSS and JavaScript.
- 9e3076f: `/roadie:spec`, `/roadie:grill`, `/roadie:codebase-design`, and `/roadie:retro`
  also read the Oztix Decision log and its Principles, through the Atlassian MCP
  when it's connected, and say when it went unchecked. `/roadie:spec` and
  `/roadie:debug` record a lasting call where the repo's register says it
  belongs: the repo's `docs/decisions/`, or a Decision log record drafted in the
  PR and filed only with the maintainer's OK.

### Patch Changes

- a1e7c70: `/roadie:audit` flags an anchor passed to `render` (I6), which I2 and I3 missed
  when its `href` was an expression, and a hand-rolled icon tile (C5), which had
  no pattern. `/roadie:migrate` prints why a manifest is missing.
- 5484613: `/roadie:build` says every `Card` has a `Card.Content`, and `/roadie:audit` reports `roadie/card-content` hits as warnings.
- d52ab01: `/roadie:build` says to use `Link` for text links and when to choose each `emphasis`.
- f69be8a: `/roadie:build` names the records filter bar `Records.Header`, as Records now calls it.
- 58a369e: The audit and build skills measure the 48px duotone threshold on the tile around the icon, as the iconography guide does, so an `EmptyState` tile's duotone icon is no longer a finding.
- 292ac56: `/roadie:pr` moves a ticket to In Progress when its first PR opens, and
  `/roadie:shepherd` moves it to Review when its last PR is ready and to Done,
  with a PR link, once it merges.
- 280e23a: `/roadie:migrate` runs its codemods with jscodeshift 17.4.0, the version their tests use.
- ca98c9b: The `/roadie:migrate` codemods no longer rewrite a local variable or parameter
  that shadows a Roadie import. They report an `import()` of a module with a
  deprecated export, and `widgets-renames` moves an `import()` of
  `/cart-drawer/core` to `/cart`.
- ba7ede5: The motion skill says the reduced-motion reset zeroes CSS delays, keeps
  `motion-safe:` on a stagger for older releases, and covers JavaScript timers.
- a9c7f01: `/roadie:motion` allows `animate-spin` for one job, a small status icon standing in for a pending action, as Toast's loading icon does.
- 4cdbd4c: The `/roadie:pr` and `/roadie:shepherd` privacy checks now cover the title,
  body, and commit messages, and flag a real person's name. Public text says
  "the maintainer" instead, as PR workflow section 7 says.
- 2da76e7: The skills README says a `roadie-skills` changeset is never major, and that an
  edit to the plugin manifest needs one.
- 8eebe74: The plugin's root is now `skills/`, so installing `roadie@roadie` caches only the skills, not the whole repository, and no longer warns about the pnpm lockfile.
- 514d8c7: `/roadie:release` drafts an optional release note for the docs changelog: a title, a summary, and the highlights in order, for a docs PR once Version Packages merges. It also lists the docs pages due a status promotion. Both steps are required, and the hand-off reports each one, with "nothing due" and "no note needed" as valid answers. `/roadie:pr` checks a changeset's wording, so a new component or package gets its card on the changelog.
- 3d41d5c: `/roadie:implement` removes only the scratch files it created, by exact path,
  and never deletes the scratchpad directory it shares with the parent session.
- f5f485c: The build and charts skills point their copy rules at Roadie's Content pages. The build skill now writes one to ten as words outside tickets, prices, percentages, times, dates, and durations, and ends error text with a full stop.
- 49987ae: The README links the new Building with AI docs page.
- 79ba8a1: Update `/roadie:build` and `/roadie:test` to match this release. `/roadie:build` covers records in server and range mode (`onRequestChange`, `loadRange`, `rowCountExact`), the versioned `RecordsRequest` a server reads with `toMeilisearch` and the JSON Schema, the one context object every action gets, location fields, and the calendar in the search dropdown. It adds `QueryField`, `Toolbar`, `Editor`, and `Link` to the component table, and says to pin alpha and beta APIs. `/roadie:test` drops file citations the audit's fixes removed, names the lint rule that now fails each test anti-pattern, and adds the WebKit hover (`pointAt`) and Firefox focus (`focusPage`) helpers for browser tests.
- 9dc16ca: `/roadie:implement` stops its dev servers and removes its scratch files and
  worktree when the work is done, and `/roadie:shepherd` removes the worktree
  after a merge the way PR workflow section 1 says.

## 0.4.0

### Minor Changes

- The repo is now a plugin marketplace, so the plugin installs as
  `roadie@roadie` and a repo can enable it in `.claude/settings.json`. The
  plugin is versioned as the private `roadie-skills` package, and Changesets
  writes this changelog.
- Adds `/roadie:build`, `/roadie:charts`, `/roadie:debug`, `/roadie:demo`,
  `/roadie:grill`, `/roadie:implement`, `/roadie:migrate`, `/roadie:pr`,
  `/roadie:release`, `/roadie:retro`, `/roadie:setup`, `/roadie:shepherd`,
  `/roadie:slice`, and `/roadie:spec`, which shipped on `main` without a
  version bump.

## 0.3.0

### Minor Changes

- Adds `/roadie:test`.

## 0.2.0

### Minor Changes

- Adds `/roadie:review`.

## 0.1.0

### Minor Changes

- Adds `/roadie:audit`.
