# Navigator Phase 3 — new-session kickoff prompt

> Paste the block below into a fresh session in `/Users/lukebrooker/Code/roadie`.
> Phase 2 has landed on `feat/navigator-component` and is unmerged by choice;
> Phase 3 continues on the same branch.

---

Pick up the remaining Navigator/Pane work on the `feat/navigator-component`
branch.

**Read these first, in order:**

1. `docs/plans/2026-07-27-navigator-phase-2-follow-ups.md` — what is deferred and
   why, including a worked analysis of which tab-bar animations are actually
   fixable. Read this before proposing a fix for any of them.
2. `.superpowers/sdd/2026-07-27-navigator-phase-2-plan/progress.md` — the ledger
   for all 28 Phase 2 tasks: every ruling, every deferred minor, every reversal.
   **This is the memory of why things are the way they are.** Several decisions
   in it were reversed mid-flight by the user; the ledger records both the
   original reasoning and what replaced it.
3. `docs/plans/2026-07-27-navigator-phase-2-plan.md` — the tasks themselves.
   Corrected in place where decisions changed, so it should not contradict the
   code. If you find somewhere it does, that is a bug in the document worth
   fixing.
4. `AGENTS.md`, `docs/contributing/COMPOUND_PATTERNS.md` (especially the
   registration section), `docs/contributing/BASE_UI.md`.

**Then use `superpowers:writing-plans`** to plan whatever you take on, and
`superpowers:subagent-driven-development` to execute it. The two-stage gate
earned its keep in Phase 2 — see "What the reviews caught" below.

## State of the branch

73 commits, unmerged, no upstream. 935 tests across 47 files. `pnpm typecheck`,
`pnpm lint` and `pnpm test` all pass from a cleared `tsbuildinfo` state.

**The act-warning budget is exactly at its ceiling of 5** (2 `ScrollAreaRoot`,
3 `TabsList`). There is no headroom. A new test that adds a warning breaches it,
and the answer is to fix the warning or consolidate tests, not to raise the
number.

`docs/src/app/debug/pane-stack/` is an untracked working-tree file belonging to
the user. Leave it alone.

## The work, in the order I would take it

### 0. Bugs found after this prompt was first written

Both were reported from a screenshot of `/foundations/accessibility` at mobile
width. Both are diagnosed below, but **reproduce before fixing** — the
diagnoses are from reading, not from a running browser.

**0a. The mobile section-nav strip wraps instead of scrolling.** It should be a
single horizontally-scrolling row; it renders as five wrapped lines.

The classes look correct — `navigatorSecondaryStripViewportVariants` has
`flex overflow-x-auto` and `NavigatorItem`'s strip branch sets `shrink-0`, and
nothing sets `flex-wrap`. The lead is one line up:
`NavigatorPaneChrome.tsx:38` renders a bare `<ScrollArea.Content>`, while the
rail at `NavigatorPrimary.tsx:496` passes **`fitWidth={false}`** with a comment
explaining why. Base UI's `ScrollArea.Content` fits the viewport width by
default, which is wrong for a row that is supposed to exceed it.

Check whether the strip's indicator still measures correctly afterwards —
`useSlidingIndicator` reads geometry off the viewport, and changing the content
box is exactly the kind of thing that moves it.

**0b. Page titles are missing from the header on 18 pages.** The heading renders
in the body, below the strip, instead of in `Pane.Header` above it.

Cause: the titles-in-header work covered `.mdx` pages only. `find docs/src/app
-name "page.tsx" -not -path "*/debug/*"` returns **18** pages — all of
`foundations/*` among them — each with `export const metadata` **and** an
inline `<h1 className='text-display-prose-1 text-strong'>`. The manifest helper
that feeds the header (`getMdxPageTitles` in
`docs/src/lib/component-manifest.ts`) parses `page.mdx` only, so those routes
resolve no title and keep their body heading.

The fix is the same migration applied to the other 45: read `metadata.title`
from `.tsx` pages too, and remove the inline `<h1>`. Watch three things —
`OnThisPage`'s heading seeding (already reworked once for this), that every one
of the 18 actually declares `metadata.title`, and that removing the `<h1>`
leaves each page's first body element sensible, since these are hand-authored
TSX rather than MDX with a uniform shape.

These two are the top of the list: they are user-visible, on the docs site's
own pages, and both are regressions from Phase 2 work rather than pre-existing
debt.

### 1. The tab bar animates layout properties

The branch's own non-negotiable is `translate` / `scale` / `opacity` only, and
the mobile tab bar breaches it in three places. **The follow-ups document
contains a full analysis — read it before planning.** In short:

- the **indicator** (`left,top,width,height`) is fixable for the tab bar with
  `translate` alone, because its tabs are equal width by construction; the rail
  and strip need `scaleX`, which distorts corners and shadows
- the bar's **`padding`** and the tabs' **`max-width`** are doing real layout
  work and cannot be transformed away without restructuring the collapsed bar so
  the two edge circles are positioned rather than grid-tracked

Do not ship the indicator fix alone and call the tab bar clean — it removes one
of three, and the two that remain are the ones doing the collapsing.

### 2. Nothing announces a mobile surface change

When `Navigator.Panel` or `Navigator.Overflow` mounts its full-screen pane, a
screen-reader user tabbing linearly is not told the content changed. Both
surfaces have the same gap. **Fix them together or neither** — fixing one
creates exactly the asymmetry Phase 2 kept having to repair.

Note that "no focus trap" is *correct* here and is not the gap. These are
non-modal tab surfaces; trapping focus would break tabbing to another tab. A
reviewer overturned an implementer on this in Phase 2 — do not re-litigate it.

### 3. Panel and overflow panes slide like pushed screens

The user's stated intent is that a panel "feels like another tab" on mobile.
The stack CSS animates a non-top pane in from `translate-x-full`, so it reads as
a push. iOS cross-fades between tabs. Fixing it means changing `Pane`'s shared
stack geometry, which every stacked pane depends on — including the overflow.

### 4. The strip still imitates `Tabs` in three places

`navigatorSecondaryStripViewportVariants` composes `tabsListVariants`,
`NavigatorItem`'s strip branch composes `tabsTabVariants`, and
`navigatorIndicatorVariants`' `strip` surface carries a comment admitting the
two are "kept in sync by eye, not by import."

**Migrating to the real `Tabs` was tried in Phase 2 and correctly refused** —
verified against Base UI's source, not its docs: `TabsTab` hardcodes
`role='tab'` regardless of `render`, so an anchor loses its link role;
`useCompositeItem`'s roving tabindex leaves only the active tab in Tab order;
and `aria-controls` is always emitted, resolving to nothing without a
`Tabs.Panel`. Do not retry that migration.

The proposed alternative is to export shared class fragments from
`Tabs/variants.ts` so the three copies import one source instead of tracking it
by eye.

### 5. Smaller carried items

- The docs' Emphasis example uses 110px demo panes and wraps titles mid-word.
  Root cause is the fixed-width demo grid, not the title size.
- `railList.tsx` and `NavigatorGroup.tsx` key rows by array index, discarding
  consumer keys on dynamically generated lists.
- `'More'`, `'Scroll to top'` and `'Back'` are inlined string literals with no
  override and no constant.
- `hasNesting` on `NavigatorContext` is written and read by nothing, with a
  docblock claiming it "decides rail form for the whole product". Pre-existing.
- `NavigatorRoot` derives `hasContent` from a direct-children walk, so wrapping
  `Navigator.Content` in a layout div yields a false "no Content is mounted"
  warning. The constraint is documented; the fix is to publish through context.
- ~15 tests assert only negatives with no positive anchor and would pass against
  a component rendering nothing. `Navigator.test.tsx:3568` never asserts that a
  pane registered — the test's whole premise.

## Non-negotiables

Each was established by evidence and is expensive to rediscover.

- **`Navigator` imports from `Pane`, never the reverse.** `Pane` defines empty
  contexts; `Navigator` fills them. Violated once and repaired.
- **Panes register with the orchestrator; they are not found by a children
  walk.** An identity walk cannot see through a wrapper the parent did not
  render — a Next.js parallel-route slot most of all. This was a real consumer
  bug and the fix is the branch's most consequential change.
- **A pane inside another pane's content is content, not a stack sibling.**
  `Navigator.Content` resets `PaneContext` so entering an orchestrator returns
  you to stack level.
- **No `matchMedia` or breakpoint logic anywhere in `packages/components/src`.**
  JS owns depth; CSS owns whether depth matters.
- **Two breakpoints, never conflated.** `md` (768) flips nav form; `lg` (1024)
  flips pane arrangement; `2xl` (1536) is where the inspector yields.
- **Tailwind v4 emits `translate`, `scale` and `rotate` as independent CSS
  properties, never `transform`.** A `transition-[transform,…]` list paired with
  a translate utility animates nothing. **This shipped four times on this
  branch**, with class strings that read correctly every time. Compile and read
  the emitted `transition-property`.
- **Only `translate` / `scale` / `opacity`.** `box-shadow` is paint and allowed.
- **Compounds match children by element identity**, so server-authored trees and
  wrapper components fail *silently*. A component that merely *returns* a
  `Navigator.Item` is invisible for the same reason — that is why a consumer
  inlines the same shell at three call sites.
- **Header controls use their default size.** Documented convention.
- **`Pane.Title` deliberately does not compose `surfaceTitleClass`** — it is a
  page heading, while `Dialog.Title` and `Drawer.Title` head compact overlays.
  Guard tests exist; do not "fix the inconsistency".

## Traps that have already cost time

- **`prettier --write` on `.mdx` empties the file.** It happened once and was
  caught only because the implementer looked before committing. The repo's
  `pnpm format` globs exclude `.mdx`, but the pre-commit hook runs
  `turbo format` — so verify `.mdx` files after any commit that touches them.
- **Never run `pnpm --filter docs build` while the docs dev server is running.**
- `pnpm --filter … test -- <file>` does **not** filter. Use
  `cd packages/components && pnpm vitest run <path>`.
- **`react-hooks/exhaustive-deps` is not registered in this package**, so an
  `eslint-disable` for it is a hard error. Registering the plugin breaks
  `packages/widgets` and `docs`.
- **A test asserting a role or attribute the component never renders passes
  unconditionally.** Prove each new assertion fails first.
- **The rail and the tab bar carry identically-labelled controls.** An unscoped
  `getByRole` matches both; `railOf` / `tabBarOf` helpers exist.
- **Base UI's `ScrollArea` sets `position: relative` inline** — no class beats
  it; an overlaying pane needs `absolute!`.
- **`react-docgen-typescript` empties a component's whole props table** when a
  second substantial function is exported from the same file. Distinct from the
  documented CVA case. See
  `docs/solutions/build-errors/react-docgen-second-export-empties-table.md`.
- If CI reports a typecheck error that passes locally:
  `find . -name "*.tsbuildinfo" -not -path "*/node_modules/*" -delete`, re-run.
  Note `pnpm typecheck` alone may replay a Turbo cache — use `--force` for CI's
  view.

## What the reviews caught in Phase 2

Worth knowing before deciding how much process to apply.

Across 28 tasks the two-stage gate caught **nine or more tests that would have
passed against a component rendering nothing**, and twice overturned an
implementer's own assessment — once a reported "focus regression" that was
correct behaviour, once a "visual only" claim that was an `aria-current` bug
reaching assistive tech. It also caught a silently-narrowed `motion-reduce`
guard, an inspector receiving live chrome, a duplicate DOM id, and an RSC canary
that had been throwing on every page load and could no longer detect the
regression it existed for.

Implementers also corrected the plan four times — a race in a warning effect,
two infinite render loops, an unscoped test query, and an approach that could
not work at all. **Both directions of that are the point.** A brief is a
hypothesis; treat an argued refusal as a good outcome, and verify a clean
self-report anyway.

## Definition of done

`pnpm test`, `pnpm typecheck` and `pnpm lint` all pass from a cleared
`tsbuildinfo` state, with act warnings still ≤ 2 in `Navigator.test.tsx` and
≤ 5 across the suite.

Verify in a real browser at `http://localhost:9614` at 390 / 900 / 1200 /
1600px. The browser tool floors at 500px, so use device emulation or read
computed values for true mobile.

The branch is unmerged and has no upstream. Do not merge or push without asking.
