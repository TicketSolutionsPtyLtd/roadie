# Navigator redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One navigation model at every size: a vertical capsule rail on large
screens that mirrors the phone tab bar, every section's sub-pages in a generated
list pane, and an API built on per-item `placement` / `visibilityPriority` and a
real Base UI `Menu` instead of `End`, the `tabs` tuple and `Panel`.

**Architecture:** `Navigator.Primary` keeps its identity walk over authored
children, but the walk now produces slot metadata carrying `placement` and
`priority`, partitioned into brand / cluster / pinned. Two pure functions decide
membership — `rankSlots`/`keepTopRanked` (priority ranking, beside
`deriveMobileSlots`) and `fitRailCluster` (height arithmetic from fixed tile
tokens, fed by one `ResizeObserver`). Sub-pages never render in the rail again:
`Navigator.Secondary` becomes a declaration that `Navigator.Content` turns into
the active section's `Pane role='list'`. Menus are Base UI `Menu` anchored to the
tile, tab or row that owns them. Visuals move to duotone icons, `text-subtle` +
`intent-accent`, a translate-only sliding pill on every surface, and `Tooltip`
labels.

**Tech Stack:** React 19, TypeScript strict, CVA, Tailwind v4, Base UI 1.8.0
(`menu`, `tooltip`, `scroll-area`), Phosphor (`duotone`), Vitest + React Testing
Library, Next.js 16 static-export docs.

**Spec:** `docs/plans/2026-09-11-navigator-redesign-design.md`. Read it in full;
this plan argues from it section by section. Prerequisite plan:
`docs/plans/2026-09-12-standalone-component-prs-plan.md` (all six PRs merged).

## Global Constraints

Every task's requirements implicitly include this section.

- **Starts only after all six standalone PRs have merged** and Task 0's rebase
  is done. `Tooltip`, `Badge hideLabel`, `List`, `ScrollArea`, `Drawer` and the
  Accordion inset then come from `main`.
- **Breakpoints, never conflated.** `md` (768) flips nav form (rail vs bar);
  `lg` (1024) flips pane arrangement (columns vs stack). **No `matchMedia` or
  breakpoint logic in `packages/components/src`.** JS owns membership and depth;
  CSS owns which surface shows. Where the bar and rail disagree (their folded
  sets), render both and gate with `md:hidden` / `max-md:hidden`.
- **Only `translate` / `scale` / `opacity` animate** (`background-color` and
  `box-shadow` are paint and allowed). **Tailwind v4 emits `translate`, `scale`,
  `rotate` as independent properties** — a `transition-[transform]` paired with
  a translate utility animates nothing. Read the emitted `transition-property`.
  The rail width **snaps** on expand/collapse; labels fade on opacity.
- **Roadie never reads `location`.** Depth comes from `value` and `showList`,
  both derived by the app from its URL.
- **`Navigator` imports from `Pane`, never the reverse.** Pane defines seams
  (`PaneStackContext`, `PaneChromeContext`), Navigator fills them.
- **Identity walks.** `Primary` and `Secondary` match `Navigator.Item`,
  `Navigator.Group`, `Navigator.GroupTitle`, `Navigator.Brand`,
  `Navigator.ExpandToggle`, `Navigator.Menu` by element type. Trees stay
  authored in a client component (`COMPOUND_PATTERNS.md` §1.2).
- **Act-warning budgets:** `Navigator.test.tsx` ≤ 2, `Pane.test.tsx` ≤ 2, whole
  suite ≤ 5 and currently exactly 5. **Every new test file must add 0.** Measure:
  `cd packages/components && pnpm vitest run <file> 2>&1 | grep -c "not wrapped in act"`.
  Fix or consolidate, never raise the number. Generated panes mount a
  ScrollArea — every test that renders one must `await flushViewportMeasurement()`.
- **`pnpm --filter … test -- <file>` does not filter.** Use
  `cd packages/components && pnpm vitest run <path>` (add `-t '<name>'` to
  narrow).
- **Prove every new assertion fails against the unfixed code** before
  implementing.
- **`react-hooks/exhaustive-deps` is not registered** in
  `packages/components` — an `eslint-disable` for it is a lint error.
- **Every rendered leaf carries a kebab-case `data-slot`.**
- **Comments are minimal — ideally none.** Write one only for what the code
  can't say (a quirk, a workaround, a non-obvious why), as one terse line.
  Public-prop JSDoc is one short sentence (the docs Props table reads it), plus
  `@default` where it applies. No comments that narrate, restate the code, or
  reference plans, task or decision numbers, or branches. The snippets in this
  plan follow that; where one doesn't, the rule wins. **Apply it to the existing
  Navigator and Pane code each task touches** — trim the long comment blocks in
  the files you edit as you go (this branch has many); no separate sweep. A
  comment a change makes false is a defect: when deleting behaviour, grep for
  comments describing it (`nested`, `strip`, `End`, `Panel`, `tabs`, `compact`)
  and delete or fix them.
- **No raw scale steps** (`text-accent-11`, `bg-accent-9`) in Navigator. Colour
  comes from `text-subtle` under `intent-accent`.
- **Icons:** Navigator destinations render Phosphor `duotone` at `size-6`,
  applied by Navigator via `presentNavIcon`. Everything else stays `bold`.
- **Docs are a static export** (`docs/next.config.mjs`: `output: 'export'`) —
  no `next/headers`. **Never run `pnpm --filter docs build`.** The docs dev
  server runs on 9614 and reads components from `dist`: after changing
  `packages/components`, run `pnpm --filter @oztix/roadie-components build`; if
  the page still shows stale code, ask the user before restarting the server.
- **Browser work uses the Playwright MCP tools.** Every probe reports
  `innerWidth` — an all-zero reading earlier in this project was the hidden
  surface, and a naive check passed against two empty rects.
- **Keep `pnpm typecheck` green at every commit.** Deleting an API means
  migrating its docs-site call sites (`docs/src/components/Navigation.tsx`,
  `docs/src/app/debug/rsc-smoke/NavigatorCanary.tsx`) in the same task. Live
  `tsx-live` examples in `navigator/page.mdx` are not typechecked and are
  rewritten in Task 13.
- **Stage explicit paths only.** `docs/src/app/debug/pane-stack/` is the user's
  untracked file if present — never stage, edit or delete it.
- **Verification gate at every commit:**
  `cd packages/components && pnpm vitest run src/components/Navigator src/components/Pane`,
  then `pnpm --filter @oztix/roadie-components test`, `pnpm typecheck`,
  `pnpm lint`. If CI's typecheck disagrees, delete every `tsbuildinfo` first.

## Decisions recorded where the spec is ambiguous

Each is referenced by the task that implements it.

- **D1 — Placement is authoritative on the Group.** Priority follows the spec
  literally (item's, else group's, else `automatic`). For placement, an Item
  inside a Group follows the Group; an Item declaring a *different* placement
  inside a Group gets a dev warning and is ignored — splitting a capsule across
  regions would break "capsules are lists named by their GroupTitle".
- **D2 — DOM order is region order.** The rail renders brand, cluster, pinned;
  the bar renders capsule, pinned circle. Within a region, source order holds.
  Authors put pinned items last (the spec's example does); a pinned item
  authored first is still tabbed after the cluster. *(Settled by the user:)* a
  pinned Item, Group or ExpandToggle written before any cluster entry gets a
  dev warning (Task 2), gated by `isDev()` (`utils/isDev.ts`, the
  `process.env.NODE_ENV` pattern AGENTS.md prescribes). Docs guideline says so.
- **D3 — `ExpandToggle` never folds.** Default `placement='automatic'` like any
  item; when automatic it is a fixed one-tile capsule at the end of the cluster
  that capacity counts but never folds. It isn't a destination, so it's outside
  ranking, More, and the phone bar entirely.
- **D4 — The bar's scroll-collapse survives.** Collapsed, the left circle is
  still the active tab. The right circle is the pinned circle when one exists
  (it already sits at the trailing edge), otherwise the final slot as today.
- **D5 — The More pane is `role='list'`, rendered after the consumer's panes**
  (so it stays the deepest `current` and pushes on top when stacked) and moved
  to the leading column from `lg` with `lg:-order-1`. Trade-off: at `lg` its tab
  order follows the detail pane. *(Accepted by the user on one condition:)*
  opening More moves focus into the pane — to its `Pane.Title` when it has one,
  else the pane itself — and closing it with Escape returns focus to the More
  tile or tab that opened it. Tested in Task 4. It replaces the section pane
  while open (one list pane at a time), and its generated form uses `Pane.Title`
  like a section pane.
- **D6 — One More pane, two row sets.** The bar and the rail fold different
  items. `Navigator.OverflowItems` renders the bar's set `md:hidden` and the
  rail's set `max-md:hidden` — no breakpoint in JS.
- **D7 — The URL decides depth; every section has its own route.** *(Settled
  by the user.)* An Item with a `Navigator.Secondary` declares an `href` — its
  section route. On the section route the section's list pane is the top of the
  stack; on desktop the consumer's detail/overview pane for that route sits
  beside it. On a sub-page the detail pane is on top and its header gets a Back
  **link** to the section route, supplied by Navigator through
  `PaneChromeContext.backHref` (a consumer's own `backHref`/`onBack` wins).
  Details:
  - **D7a — A section tab always links to its section route.** *(Deliberate;
    approved by the user.)* Section memory no longer retargets an item that
    declares a Secondary — its list pane, with the current row marked, replaces
    what memory used to do. Memory survives only for items without sub-pages
    that sit over un-declared sub-routes.
  - **D7b — A Secondary section without `href` gets a dev warning** and falls
    back to today's first-sub-page link; Navigator supplies no Back for it.
  - **D7c — The optional list query.** Roadie never reads `location`. The root
    takes a controlled boolean, like `value`/`onValueChange`:

    ```tsx
    type NavigatorRootProps = {
      // …existing
      /**
       * Show the active section's list pane on top of a stacked layout, even
       * on a sub-page. Derive it from your URL (e.g. `?nav`) so "show me the
       * list" is linkable and Back-able. On the section route the list is on
       * top regardless. No effect once panes are columns (`lg`).
       */
      showList?: boolean
      /**
       * Called with `true` when the active section's tab is tapped on a
       * sub-page, and `false` when it's tapped again while the list is
       * showing. Turn it into a URL update. Omit it and that tap navigates to
       * the section route instead.
       */
      onShowListChange?: (next: boolean) => void
    }
    ```

    The app names the parameter; Roadie's docs use `?nav`. Selecting a row
    navigates to its own URL, which drops the parameter, so Navigator never has
    to call `onShowListChange(false)` for that.
- **D8 — The generated section pane is never `current`.** It is first in DOM
  order, so it is the stack's root: the top when no consumer pane is current,
  when the value is the section route, or when `showList` is set; behind a
  `current` detail pane otherwise.
- **D9 — Two pill tracks on the rail.** The cluster scrolls and the pinned
  region doesn't, so each gets its own `NavigatorIndicator`; moving between them
  cross-fades instead of sliding.
- **D10 — Rail widths become Tailwind classes** (`w-20` collapsed, `w-60`
  expanded). The `--navigator-rail-*` tokens are deleted, not replaced.
- **D11 — Tile metrics live in one TS object** (`RAIL_METRICS`, rem) and a test
  pins the matching Tailwind classes, so the arithmetic and the CSS can't drift.
  An unmeasured cluster (height 0 — SSR, jsdom) folds nothing.
- **D12 — `Navigator.SecondaryItems` takes an optional `query`**, so a
  `SecondaryPane` override can still offer search.
- **D13 — Menu-row icons inside the More pane stay List's leading size**
  (`size-5`) but duotone; tiles and tabs are `size-6`.
- **D14 — Expanded styling is CSS-first through one variant.** *(Settled by
  the user.)* One source of truth per style: the rail carries `data-expanded`
  from React state, and every expanded style is written once as
  `navigator-expanded:…` next to its collapsed default — no CVA `expanded`
  variant, no duplicated classes. Core ships the variant in
  `@oztix/roadie-core/css` (a new `navigator.css` sheet), so every consumer's
  Tailwind build that imports Roadie sees it:

  ```css
  @custom-variant navigator-expanded (&:where([data-slot=navigator-rail][data-expanded], [data-slot=navigator-rail][data-expanded] *, [data-navigator-expanded] [data-slot=navigator-rail][data-from-document], [data-navigator-expanded] [data-slot=navigator-rail][data-from-document] *));
  ```

  It is scoped to the **rail**, not the Navigator root, because every
  expanded style lives in the rail and a Navigator rendered inside another
  Navigator's content (the docs examples) is never inside that rail — scoping
  to the root would let an expanded site nav expand every example. `:where()`
  keeps the variant at zero added specificity, so `w-20
  navigator-expanded:w-60` resolves by Tailwind's variant ordering. Presence
  attributes (`[data-expanded]`, not `='true'`): React omits the attribute when
  collapsed.

  The second pair of selectors is an **optional static-site enhancement, not a
  core requirement**. Server-rendered apps read the cookie on the server and
  pass `defaultExpanded` (or `expanded`); `data-expanded` is then in the server
  HTML and nothing else is needed. A static export (the docs) can't read the
  cookie, so `@oztix/roadie-core/navigator` offers `getNavigatorExpandedScript()`,
  a blocking head script that sets `data-navigator-expanded` on `<html>` before
  paint; a Navigator opts in with `expandedFromDocument`, which renders
  `data-from-document` on its rail (so only that Navigator follows the
  document) and keeps the `<html>` attribute in sync after hydration. The
  subpath sits beside `@oztix/roadie-core/theme` rather than inside it — it
  isn't theming. Task 9 (variant, CSS-first styling), Task 9B (script), Task
  14 (docs wiring).
- **D15 — `Get started` keeps its Secondary** in the docs (it has one today),
  alongside Foundations, Tokens, Widgets and Components, and gets its own
  section route, `/get-started`. *(Decided by the user.)* The home page `/`
  stays an ordinary page outside every section, so no list ever covers it on a
  phone; on `/` no section tile is lit.

---

## File structure

**Created** (all under `packages/components/src/components/Navigator/` unless noted)

| File | Responsibility |
| --- | --- |
| `mobileSlots.test.ts` | pure tests: ranking, `keepTopRanked`, `deriveMobileSlots` (moved out of `Navigator.test.tsx`) |
| `collectSlots.ts` / `collectSlots.test.tsx` | the Primary identity walk → brand / cluster / pinned entries with inherited placement + priority |
| `railCapacity.ts` / `railCapacity.test.ts` | `RAIL_METRICS`, `capsuleHeight`, `clusterHeight`, `fitRailCluster` |
| `useRailCapacity.ts` | one `ResizeObserver` on the cluster viewport → folded set |
| `capsules.tsx` | `wrapCapsules` (replaces `railList.tsx`) |
| `NavigatorMenu.tsx` | `Navigator.Menu` declaration (renders null) |
| `NavigatorMenuItem.tsx` | `Navigator.MenuItem` on `Menu.Item` / `Menu.LinkItem` |
| `NavigatorMenuHost.tsx` | internal: Base UI `Menu.Root` around any trigger, publishes `openMenu` |
| `NavigatorMenu.test.tsx` | Menu behaviour |
| `NavigatorOverflowPane.tsx` | renamed from `NavigatorOverflow.tsx` |
| `NavigatorSectionPane.tsx` | internal: the generated list pane |
| `NavigatorSecondaryItems.tsx` | `Navigator.SecondaryItems` — the section's rows as a `List` |
| `NavigatorSecondaryPane.tsx` | `Navigator.SecondaryPane value` override |
| `NavigatorSectionPane.test.tsx` | generated pane, search, override, Back reveal |
| `NavigatorExpandToggle.tsx` | `Navigator.ExpandToggle` |
| `NavigatorRail.test.tsx` | rail regions, capsules, capacity, expanded, tooltips, badges |
| `docs/src/components/useExpandedCookie.ts` | docs: cookie-backed expanded state |
| `packages/core/src/css/navigator.css` / `packages/core/src/css/navigator-variant.test.ts` | the `navigator-expanded` custom variant (D14) and a compile test |
| `packages/core/src/navigator/index.ts` / `navigator.test.ts` | `@oztix/roadie-core/navigator`: `NAVIGATOR_EXPANDED_SCOPE`; later the optional head script, cookie constants and serializer (D14) |
| `docs/src/components/NavListQuery.tsx` | docs: reads `?nav` inside `<Suspense>` and reports it (D7c) |
| `docs/src/app/foundations/page.tsx`, `docs/src/app/get-started/page.tsx` | docs: the Foundations and Get started section routes (D7, D15) |

**Modified**

| File | Change |
| --- | --- |
| `mobileSlots.ts` | priority types + ranking; `deriveMobileSlots(automatic, pinned)` |
| `NavigatorPrimary.tsx` | walk via `collectSlots`; rail regions; tab bar pinned circle + More; capacity; `tabs` prop gone |
| `NavigatorRoot.tsx` / `NavigatorContext.ts` | `expanded` state; `activeSection`; `openMenu`; `overflowItems: { bar, rail }`; `showList`/`onShowListChange`, `stackAtRoot`; `declaredSecondaryPanes`; drop `hasNesting`, `secondaryNav`, `openPanel`, `panelItems` |
| `NavigatorItem.tsx` | `placement`, `visibilityPriority`, typed `badge`; tile/row; tooltip; menu host; no inline Secondary |
| `NavigatorGroup.tsx` | `placement`, `visibilityPriority`; capsule list; folded filtering |
| `NavigatorGroupTitle.tsx` / variants | `sr-only` while collapsed |
| `NavigatorSecondary.tsx` | renders null; `searchable` |
| `NavigatorContent.tsx` | generated section pane; More pane; list on top on the section route or with `showList`; no Panel pane |
| `NavigatorTab.tsx` | icon-only; `pinned` presentation; badge dot |
| `NavigatorDestination.tsx` | forwards `ref` and rest props (for Tooltip/Menu `render`) |
| `NavigatorOverflowItems.tsx` | two gated row sets; menu rows |
| `NavigatorIndicator.tsx` / `useSlidingIndicator.ts` | `rail` surface translate-only; `strip` gone |
| `presentNavIcon.tsx` | always `duotone` |
| `splitSecondary.ts` | `menu` replaces `panel`; `textOf` for search |
| `paneStack.ts` / `paneStack.test.ts` | `derivePositions(entries, revealRoot)` |
| `useTopPaneChrome.tsx` | no strip; supplies the section route as `backHref` |
| `variants.ts` | rail, capsule, tile, tab, indicator, More variants; deletions |
| `index.tsx` + `packages/components/src/index.tsx` | new/removed parts and types |
| `Navigator.test.tsx` | delete/migrate per task |
| `Pane/PaneChromeContext.ts`, `Pane/PaneHeader.tsx`, `Pane/Pane.test.tsx` | `headerExtras` → `backHref` |
| `packages/core/src/css/layout.css` | delete `--navigator-rail-*` |
| `packages/core/package.json`, `packages/core/tsdown.config.ts` | `./navigator` subpath and entry |
| `packages/core/src/css/roadie.css` | imports `navigator.css` |
| `docs/src/app/layout.tsx` | Foundations gets `href: '/foundations'`; the expanded head script |
| `docs/src/components/Navigation.tsx` | migration |
| `docs/src/app/components/navigator/page.mdx`, `pane/page.mdx`, `foundations/app-shell/page.tsx`, `debug/rsc-smoke/*` | docs |
| `AGENTS.md`, `docs/contributing/COMPOUND_PATTERNS.md` | iconography exception; walk exceptions |
| `.changeset/navigator-list.md`, `.changeset/app-frame-core-css.md` | rewritten |

**Deleted**

`NavigatorEnd.tsx`, `NavigatorPanel.tsx`, `NavigatorPanelPane.tsx`,
`NavigatorPaneChrome.tsx`, `NavigatorPresentationContext.ts`, `railList.tsx`,
`NavigatorOverflow.tsx` (renamed), `docs/src/components/ComponentSkeleton.tsx`.
Variants: `navigatorEndVariants`, `navigatorSecondaryVariants`,
`navigatorChevronVariants`, `navigatorSecondaryStrip{,Viewport,Content}Variants`,
`navigatorPanelPaneVariants`, `navigatorRailVariants`' `form`, the indicator's
`strip` surface, `navigatorItemTrailingVariants`' chevron use.

---

## Task 0: Rebase onto `main` and re-baseline

**Files:**
- Modify: `docs/src/app/components/*/page.mdx` (strip `# Title`)
- Modify: `.changeset/navigator-list.md`, `.changeset/app-frame-core-css.md`

- [ ] **Step 1: Confirm the prerequisites merged**

```bash
git fetch origin
for p in ScrollArea List Drawer Tooltip; do git cat-file -e origin/main:packages/components/src/components/$p/index.tsx && echo "$p ok"; done
git show origin/main:packages/components/src/components/Badge/index.tsx | grep -c hideLabel
git show origin/main:packages/components/src/components/Accordion/variants.ts | grep -c content-inset
```

Expected: four `ok` lines and two non-zero counts. Otherwise stop.

- [ ] **Step 2: Rebase**

```bash
git checkout feat/navigator-component
git rebase origin/main
```

For each conflict: in the extracted component folders (`ScrollArea/`, `List/`,
`Drawer/`, `Accordion/`), their docs pages, `vitest.setup.ts`,
`packages/components/src/variants.ts` (`surfaceTitleClass`, `RoadieIntent`),
`motion.css` (`motion-drawer`), `PropsDefinitions.tsx`, `AGENTS.md` (List.Item
lines) and `package.json` exports — take `main`'s hunk (during a rebase that is
`git checkout --ours <path>` for a whole file, or keep the upstream side of the
hunk). Keep the branch's side for everything Navigator/Pane-owned and for the
`navigator` barrel/exports entries. After `package.json` conflicts, run
`pnpm --filter @oztix/roadie-components generate:exports` rather than merging by
hand.

**The elevation refresh (PR #132, released via #133) is on `main`** and
changed field surfaces (`emphasis-field`, field states, Select trigger
`border-transparent`). The branch also touched `Input`, `Textarea` and
`packages/components/src/variants.ts` (`fieldSurfaceClass`, used by
`Pane.Search`). Take `main`'s `Input.tsx`, `Textarea.tsx`, `Select` and core
CSS; then make `fieldSurfaceClass` (if `main` doesn't already define an
equivalent) reproduce `main`'s field surface — read `main`'s `Input` normal
emphasis and copy its class string — so `Pane.Search` matches the inputs. Run
`cd packages/components && pnpm vitest run src/components/Pane -t Search` after.

Then `git diff origin/main -- packages/components/src/components/{ScrollArea,List,Drawer,Accordion,Tooltip,Badge}`
Expected: empty. Any difference means a branch-side hunk survived — take
`main`'s.

- [ ] **Step 3: Strip `# Title` again**

The branch's docs layout renders the title via `Pane.BodyTitle`, so every
component page must lack an H1:

```bash
grep -ln '^# ' docs/src/app/components/*/page.mdx docs/src/app/overview/*/page.mdx docs/src/app/roadie-widgets/*/page.mdx docs/src/app/tokens/page.mdx docs/src/app/roadie-widgets/page.mdx
```

For each file listed, delete the `# Title` line and the blank line after it by
hand (no prettier on MDX). Expected afterwards: the grep prints nothing.

- [ ] **Step 4: Rewrite the changesets**

`.changeset/navigator-list.md` becomes (List, ScrollArea, Drawer, Accordion
shipped separately):

```md
---
"@oztix/roadie-components": minor
---

Add `Navigator` and `Pane`, the application frame.

`Navigator` is one navigation model at every size: icon-only floating capsules
in a vertical rail from `md` (brand on top, pinned items at the bottom, an
optional expanded state with labels), and a floating tab bar below it. Items
declare `placement` and `visibilityPriority`; whatever doesn't fit folds into
a More pane. A section's sub-pages open in a generated list pane, optionally
searchable, and an item can own a `Navigator.Menu` instead of a destination.

`Pane` is a scrolling column of that frame, with sticky chrome, a
collapse-on-scroll header and a stack position when panes share a screen.
```

`.changeset/app-frame-core-css.md` becomes:

```md
---
"@oztix/roadie-core": minor
---

Add `animate-pop-tap` — a 200ms tap response, where `animate-pop` at 600ms reads
as a notification.
```

(The rail-width tokens it used to announce are deleted in Task 8 and never
shipped.)

- [ ] **Step 5: Baseline**

```bash
pnpm install
cd packages/components && pnpm vitest run 2>&1 | tee /tmp/nav-baseline.txt | tail -5
grep -c "not wrapped in act" /tmp/nav-baseline.txt
cd ../.. && pnpm typecheck && pnpm lint
```

Expected: all green; act-warning count 5 (record the number you get — that is
the ceiling for the rest of the plan).

- [ ] **Step 6: Commit**

```bash
git add docs/src/app .changeset/navigator-list.md .changeset/app-frame-core-css.md
git commit -m "chore(navigator): re-baseline on main after the standalone component PRs"
```

The rebased branch needs a force-push; ask the user before running
`git push --force-with-lease`.

---

## Task 1: Priority ranking as a pure function

**Files:**
- Modify: `packages/components/src/components/Navigator/mobileSlots.ts`
- Create: `packages/components/src/components/Navigator/mobileSlots.test.ts`

**Interfaces:**
- Produces (every later task uses these exact names):

```ts
export type NavigatorPlacement = 'automatic' | 'pinned'
export type NavigatorVisibilityPriority = 'low' | 'automatic' | 'high'
export function rankSlots<T extends { priority: NavigatorVisibilityPriority }>(
  slots: readonly T[]
): T[]
export function keepTopRanked<T extends { priority: NavigatorVisibilityPriority }>(
  slots: readonly T[],
  count: number
): { kept: T[]; folded: T[] } // both in source order
```

and two new required fields on `NavigatorSlotMeta`:
`placement: NavigatorPlacement`, `priority: NavigatorVisibilityPriority`.

- [ ] **Step 1: Write the failing tests**

`mobileSlots.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import {
  type NavigatorVisibilityPriority,
  keepTopRanked,
  rankSlots
} from './mobileSlots'

const slot = (value: string, priority: NavigatorVisibilityPriority = 'automatic') => ({
  value,
  priority
})
const values = (slots: { value: string }[]) => slots.map((s) => s.value)

describe('rankSlots', () => {
  it('orders high, then automatic, then low', () => {
    expect(
      values(rankSlots([slot('a', 'low'), slot('b'), slot('c', 'high')]))
    ).toEqual(['c', 'b', 'a'])
  })

  it('breaks ties by source order', () => {
    expect(values(rankSlots([slot('a'), slot('b'), slot('c')]))).toEqual([
      'a',
      'b',
      'c'
    ])
  })

  it('does not mutate its input', () => {
    const input = [slot('a', 'low'), slot('b', 'high')]
    rankSlots(input)
    expect(values(input)).toEqual(['a', 'b'])
  })
})

describe('keepTopRanked', () => {
  it('decides membership by rank but keeps source order', () => {
    const { kept, folded } = keepTopRanked(
      [slot('a', 'low'), slot('b'), slot('c'), slot('d', 'high')],
      2
    )
    expect(values(kept)).toEqual(['b', 'd'])
    expect(values(folded)).toEqual(['a', 'c'])
  })

  it('keeps everything when the count covers it', () => {
    const { kept, folded } = keepTopRanked([slot('a'), slot('b')], 5)
    expect(values(kept)).toEqual(['a', 'b'])
    expect(folded).toEqual([])
  })

  it('folds everything at zero', () => {
    expect(values(keepTopRanked([slot('a')], 0).folded)).toEqual(['a'])
  })
})
```

Run: `cd packages/components && pnpm vitest run src/components/Navigator/mobileSlots.test.ts`
Expected: FAIL — `rankSlots` / `keepTopRanked` are not exported.

- [ ] **Step 2: Implement**

Add to `mobileSlots.ts` (above `deriveMobileSlots`), and add `placement` and
`priority` to `NavigatorSlotMeta` and `placement?`/`priority?` to
`NavigatorSlotGroup`:

```ts
export type NavigatorPlacement = 'automatic' | 'pinned'
export type NavigatorVisibilityPriority = 'low' | 'automatic' | 'high'

const RANK: Record<NavigatorVisibilityPriority, number> = {
  high: 2,
  automatic: 1,
  low: 0
}

/** Highest priority first; ties keep source order. */
export function rankSlots<T extends { priority: NavigatorVisibilityPriority }>(
  slots: readonly T[]
): T[] {
  return slots
    .map((slot, index) => ({ slot, index }))
    .sort(
      (a, b) =>
        RANK[b.slot.priority] - RANK[a.slot.priority] || a.index - b.index
    )
    .map(({ slot }) => slot)
}

// Kept slots come back in source order: priority picks members, not positions.
export function keepTopRanked<
  T extends { priority: NavigatorVisibilityPriority }
>(slots: readonly T[], count: number): { kept: T[]; folded: T[] } {
  const keep = new Set(rankSlots(slots).slice(0, Math.max(0, count)))
  return {
    kept: slots.filter((slot) => keep.has(slot)),
    folded: slots.filter((slot) => !keep.has(slot))
  }
}
```

In `NavigatorPrimary.tsx`'s `toSlotMeta`, set `placement: 'automatic'` and
`priority: 'automatic'` for now (Task 2 wires the props), and add the two fields
to every `NavigatorSlotMeta` fixture in `Navigator.test.tsx` (`items(n)`,
`account`, `orgs`, `meta(v)` near the `deriveMobileSlots` describes) so
typecheck passes.

- [ ] **Step 3: Run**

Run: `cd packages/components && pnpm vitest run src/components/Navigator`
Expected: PASS. `pnpm typecheck` clean.

- [ ] **Step 4: Commit**

```bash
git add packages/components/src/components/Navigator/mobileSlots.ts \
  packages/components/src/components/Navigator/mobileSlots.test.ts \
  packages/components/src/components/Navigator/NavigatorPrimary.tsx \
  packages/components/src/components/Navigator/Navigator.test.tsx
git commit -m "feat(navigator): rank slots by visibility priority"
```

---

## Task 2: `placement` and `visibilityPriority` replace `Navigator.End` and the `tabs` tuple

**Files:**
- Create: `packages/components/src/components/Navigator/collectSlots.ts`
- Create: `packages/components/src/components/Navigator/collectSlots.test.tsx`
- Modify: `mobileSlots.ts`, `mobileSlots.test.ts`, `NavigatorPrimary.tsx`,
  `NavigatorItem.tsx`, `NavigatorGroup.tsx`, `NavigatorTab.tsx`, `variants.ts`,
  `index.tsx`, `Navigator.test.tsx` (all under `…/Navigator/`),
  `packages/components/src/index.tsx`
- Modify: `docs/src/components/Navigation.tsx`,
  `docs/src/app/debug/rsc-smoke/NavigatorCanary.tsx`
- Delete: `…/Navigator/NavigatorEnd.tsx`

**Interfaces:**
- Consumes: `rankSlots`, `keepTopRanked`, `NavigatorPlacement`,
  `NavigatorVisibilityPriority` (Task 1).
- Produces:

```ts
// NavigatorItem / NavigatorGroup props gain
placement?: NavigatorPlacement          // default 'automatic'
visibilityPriority?: NavigatorVisibilityPriority // default 'automatic'

// collectSlots.ts
export type RailEntry =
  | { kind: 'item'; element: ReactElement<NavigatorItemProps>; slot: NavigatorSlotMeta }
  | { kind: 'group'; element: ReactElement<NavigatorGroupProps>; group: NavigatorSlotGroup; slots: NavigatorSlotMeta[] }
export type CollectedSlots = {
  brand: ReactElement[]
  cluster: RailEntry[]            // automatic placement, source order
  pinned: RailEntry[]             // pinned placement, source order
  automatic: NavigatorSlotMeta[]  // every destination in `cluster`, flattened
  pinnedSlots: NavigatorSlotMeta[]
  hasStrayChild: boolean
  conflictingPlacement: string[]  // item values overridden by their group
  pinnedBeforeCluster: boolean    // a pinned entry is written before a cluster entry
}
export function collectSlots(children: ReactNode): CollectedSlots
export function toSlotMeta(props: NavigatorItemProps, group?: NavigatorSlotGroup): NavigatorSlotMeta

// mobileSlots.ts — replaces the old MobileSlots shape
export type MobileSlots = {
  tabs: NavigatorSlotMeta[]       // capsule tabs, source order
  overflow: NavigatorSlotMeta[]   // folded automatic items, then extra pinned
  pinned?: NavigatorSlotMeta      // the trailing circle
}
export function deriveMobileSlots(
  automatic: NavigatorSlotMeta[],
  pinned: NavigatorSlotMeta[]
): MobileSlots
```

`NavigatorTabSlots`, `MobileSlots.label/end/unknownTabs/repeatedTabs/overflowTabs`,
the `tabs` prop, `Navigator.End` and `NavigatorEndProps` are gone.

- [ ] **Step 1: Write the failing `deriveMobileSlots` tests**

Move nothing yet — write the new expectations. Append to `mobileSlots.test.ts`:

```ts
import type { NavigatorSlotMeta } from './mobileSlots'
import { deriveMobileSlots } from './mobileSlots'

const meta = (
  value: string,
  priority: NavigatorVisibilityPriority = 'automatic',
  placement: 'automatic' | 'pinned' = 'automatic'
): NavigatorSlotMeta => ({
  value,
  label: value,
  topValue: value,
  descendants: [],
  placement,
  priority
})
const many = (n: number) =>
  Array.from({ length: n }, (_, i) => meta(`/${String.fromCharCode(97 + i)}`))

describe('deriveMobileSlots', () => {
  it('renders five or fewer as tabs with no More', () => {
    const slots = deriveMobileSlots(many(5), [])
    expect(values(slots.tabs)).toEqual(['/a', '/b', '/c', '/d', '/e'])
    expect(slots.overflow).toEqual([])
    expect(slots.pinned).toBeUndefined()
  })

  it('keeps the top four by rank and folds the rest past five', () => {
    const slots = deriveMobileSlots(many(6), [])
    expect(values(slots.tabs)).toEqual(['/a', '/b', '/c', '/d'])
    expect(values(slots.overflow)).toEqual(['/e', '/f'])
  })

  it('keeps a high-priority item in source position', () => {
    const items = many(6)
    items[5] = meta('/f', 'high')
    const slots = deriveMobileSlots(items, [])
    expect(values(slots.tabs)).toEqual(['/a', '/b', '/c', '/f'])
    expect(values(slots.overflow)).toEqual(['/d', '/e'])
  })

  it('gives the first pinned item a circle outside the five', () => {
    const account = meta('account', 'automatic', 'pinned')
    const slots = deriveMobileSlots(many(5), [account])
    expect(slots.tabs).toHaveLength(5)
    expect(slots.pinned).toBe(account)
    expect(slots.overflow).toEqual([])
  })

  it('folds further pinned items into More', () => {
    const one = meta('one', 'automatic', 'pinned')
    const two = meta('two', 'automatic', 'pinned')
    const slots = deriveMobileSlots(many(3), [one, two])
    expect(values(slots.tabs)).toEqual(['/a', '/b', '/c'])
    expect(slots.pinned).toBe(one)
    expect(values(slots.overflow)).toEqual(['two'])
  })

  it('makes room for More when an extra pinned item forces it', () => {
    const slots = deriveMobileSlots(many(5), [
      meta('one', 'automatic', 'pinned'),
      meta('two', 'automatic', 'pinned')
    ])
    expect(values(slots.tabs)).toEqual(['/a', '/b', '/c', '/d'])
    expect(values(slots.overflow)).toEqual(['/e', 'two'])
  })
})
```

Run: `cd packages/components && pnpm vitest run src/components/Navigator/mobileSlots.test.ts`
Expected: FAIL — wrong arity / shape.

- [ ] **Step 2: Rewrite `deriveMobileSlots`**

Replace the `NavigatorTabSlots` type, the old `MobileSlots` type and the old
function body in `mobileSlots.ts` with:

```ts
export type MobileSlots = {
  tabs: NavigatorSlotMeta[]
  overflow: NavigatorSlotMeta[]
  pinned?: NavigatorSlotMeta
}

// Lives outside NavigatorPrimary.tsx: a second exported function there empties its docgen props table.
export function deriveMobileSlots(
  automatic: NavigatorSlotMeta[],
  pinned: NavigatorSlotMeta[]
): MobileSlots {
  const [circle, ...extraPinned] = pinned
  const needsMore = automatic.length > MAX_TABS || extraPinned.length > 0
  if (!needsMore) return { tabs: automatic, overflow: [], pinned: circle }
  const { kept, folded } = keepTopRanked(automatic, MAX_TABS - 1)
  return { tabs: kept, overflow: [...folded, ...extraPinned], pinned: circle }
}
```

Keep `OVERFLOW_LABEL = 'More'`.

Run the file again. Expected: PASS.

- [ ] **Step 3: Write the failing walk tests**

`collectSlots.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest'

import { Navigator } from '.'
import { collectSlots } from './collectSlots'

const values = (slots: { value: string }[]) => slots.map((s) => s.value)

describe('collectSlots', () => {
  it('defaults every item to automatic placement and priority', () => {
    const { automatic } = collectSlots(
      <Navigator.Item value='/a'>A</Navigator.Item>
    )
    expect(automatic[0]).toMatchObject({
      placement: 'automatic',
      priority: 'automatic'
    })
  })

  it("lets an item's priority win over its group's, and inherits otherwise", () => {
    const { automatic } = collectSlots(
      <Navigator.Group visibilityPriority='low'>
        <Navigator.Item value='/a'>A</Navigator.Item>
        <Navigator.Item value='/b' visibilityPriority='high'>
          B
        </Navigator.Item>
      </Navigator.Group>
    )
    expect(automatic.map((s) => s.priority)).toEqual(['low', 'high'])
  })

  it('moves a pinned item and a pinned group into the pinned region', () => {
    const result = collectSlots(
      <>
        <Navigator.Item value='/a'>A</Navigator.Item>
        <Navigator.Item value='account' placement='pinned'>
          Account
        </Navigator.Item>
        <Navigator.Group placement='pinned'>
          <Navigator.Item value='/help'>Help</Navigator.Item>
        </Navigator.Group>
      </>
    )
    expect(values(result.automatic)).toEqual(['/a'])
    expect(values(result.pinnedSlots)).toEqual(['account', '/help'])
    expect(result.pinned.map((entry) => entry.kind)).toEqual(['item', 'group'])
    expect(result.pinnedSlots[1]).toMatchObject({ placement: 'pinned' })
  })

  it("keeps an item in its group's placement and reports the conflict", () => {
    const result = collectSlots(
      <Navigator.Group>
        <Navigator.Item value='/a' placement='pinned'>
          A
        </Navigator.Item>
      </Navigator.Group>
    )
    expect(values(result.automatic)).toEqual(['/a'])
    expect(result.conflictingPlacement).toEqual(['/a'])
  })

  it('notices a pinned entry written before the cluster', () => {
    const first = collectSlots(
      <>
        <Navigator.Item value='/me' placement='pinned'>Me</Navigator.Item>
        <Navigator.Item value='/a'>A</Navigator.Item>
      </>
    )
    const last = collectSlots(
      <>
        <Navigator.Item value='/a'>A</Navigator.Item>
        <Navigator.Item value='/me' placement='pinned'>Me</Navigator.Item>
      </>
    )
    expect(first.pinnedBeforeCluster).toBe(true)
    expect(last.pinnedBeforeCluster).toBe(false)
  })

  it('collects Brand without counting it as a destination', () => {
    const result = collectSlots(
      <>
        <Navigator.Brand>Logo</Navigator.Brand>
        <Navigator.Item value='/a'>A</Navigator.Item>
      </>
    )
    expect(result.brand).toHaveLength(1)
    expect(values(result.automatic)).toEqual(['/a'])
  })

  it('flags a child it cannot recognise', () => {
    expect(collectSlots(<div />).hasStrayChild).toBe(true)
  })

  it('records the group title on each slot for the More pane', () => {
    const { automatic } = collectSlots(
      <Navigator.Group>
        <Navigator.GroupTitle>Docs</Navigator.GroupTitle>
        <Navigator.Item value='/a'>A</Navigator.Item>
      </Navigator.Group>
    )
    expect(automatic[0]?.group?.title).toBe('Docs')
  })
})
```

Run: `cd packages/components && pnpm vitest run src/components/Navigator/collectSlots.test.tsx`
Expected: FAIL — module not found; `placement`/`visibilityPriority` unknown props.

- [ ] **Step 4: Add the props**

`NavigatorItem.tsx` — add to `NavigatorItemProps`:

```ts
  /** `pinned` anchors it to the rail's bottom and the bar's trailing circle. @default 'automatic' */
  placement?: NavigatorPlacement
  /** Which items stay visible when space runs out; falls back to the group's. @default 'automatic' */
  visibilityPriority?: NavigatorVisibilityPriority
```

`NavigatorGroup.tsx` — the same two props on `NavigatorGroupProps` (the group's
`placement` doc: "Every item in the group follows it."). The components ignore
them at render; `collectSlots` reads them from props.

- [ ] **Step 5: Implement `collectSlots.ts`**

Move `toSlotMeta` out of `NavigatorPrimary.tsx` into this file and extend it:

```ts
import {
  Children,
  type ReactElement,
  type ReactNode,
  isValidElement
} from 'react'

import { NavigatorBrand } from './NavigatorBrand'
import { NavigatorGroup, type NavigatorGroupProps } from './NavigatorGroup'
import { NavigatorGroupTitle } from './NavigatorGroupTitle'
import { NavigatorItem, type NavigatorItemProps } from './NavigatorItem'
import type { NavigatorSlotGroup, NavigatorSlotMeta } from './mobileSlots'
import {
  firstSecondaryHref,
  firstSecondaryValue,
  secondaryDescendantValues,
  splitItemChildren
} from './splitSecondary'

export type RailEntry =
  | {
      kind: 'item'
      element: ReactElement<NavigatorItemProps>
      slot: NavigatorSlotMeta
    }
  | {
      kind: 'group'
      element: ReactElement<NavigatorGroupProps>
      group: NavigatorSlotGroup
      slots: NavigatorSlotMeta[]
    }

export type CollectedSlots = {
  brand: ReactElement[]
  cluster: RailEntry[]
  pinned: RailEntry[]
  automatic: NavigatorSlotMeta[]
  pinnedSlots: NavigatorSlotMeta[]
  hasStrayChild: boolean
  conflictingPlacement: string[]
  pinnedBeforeCluster: boolean
}

export function toSlotMeta(
  props: NavigatorItemProps,
  group?: NavigatorSlotGroup
): NavigatorSlotMeta {
  // body of the old NavigatorPrimary `toSlotMeta`, unchanged, plus:
  //   placement: group?.placement ?? props.placement ?? 'automatic',
  //   priority: props.visibilityPriority ?? group?.priority ?? 'automatic',
}

// Matches by element type, one level into Group — see COMPOUND_PATTERNS.md §1.2.
export function collectSlots(children: ReactNode): CollectedSlots {
  const result: CollectedSlots = {
    brand: [],
    cluster: [],
    pinned: [],
    automatic: [],
    pinnedSlots: [],
    hasStrayChild: false,
    conflictingPlacement: [],
    pinnedBeforeCluster: false
  }
  let groupCount = 0

  const place = (entry: RailEntry, slots: NavigatorSlotMeta[]) => {
    const pinned = slots[0]?.placement === 'pinned'
    // Pinned renders after the cluster, so writing it first misleads tab order.
    if (!pinned && result.pinned.length > 0) result.pinnedBeforeCluster = true
    ;(pinned ? result.pinned : result.cluster).push(entry)
    ;(pinned ? result.pinnedSlots : result.automatic).push(...slots)
  }

  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return
    if (child.type === NavigatorBrand) {
      result.brand.push(child)
      return
    }
    if (child.type === NavigatorItem) {
      const element = child as ReactElement<NavigatorItemProps>
      const slot = toSlotMeta(element.props)
      place({ kind: 'item', element, slot }, [slot])
      return
    }
    if (child.type === NavigatorGroup) {
      const element = child as ReactElement<NavigatorGroupProps>
      const group: NavigatorSlotGroup = {
        key: `group-${groupCount++}`,
        placement: element.props.placement ?? 'automatic',
        priority: element.props.visibilityPriority
      }
      const slots: NavigatorSlotMeta[] = []
      Children.forEach(element.props.children, (grandChild) => {
        if (!isValidElement(grandChild)) return
        if (grandChild.type === NavigatorGroupTitle) {
          group.title = (grandChild.props as { children?: ReactNode }).children
        } else if (grandChild.type === NavigatorItem) {
          const itemProps = grandChild.props as NavigatorItemProps
          if (
            itemProps.placement !== undefined &&
            itemProps.placement !== group.placement
          ) {
            result.conflictingPlacement.push(itemProps.value)
          }
          slots.push(toSlotMeta(itemProps, group))
        }
      })
      if (slots.length > 0) place({ kind: 'group', element, group, slots }, slots)
      return
    }
    result.hasStrayChild = true
  })

  return result
}
```

Fill `toSlotMeta` in from the old body (it is 30 lines in
`NavigatorPrimary.tsx`; keep its comments). `NavigatorSlotGroup` gains
`placement?: NavigatorPlacement` and `priority?: NavigatorVisibilityPriority`.

Run the walk tests. Expected: PASS.

- [ ] **Step 6: Wire `NavigatorPrimary` and delete `End` and `tabs`**

In `NavigatorPrimary.tsx`:

1. Remove the `tabs` prop and its JSDoc from `NavigatorPrimaryProps`, the
   `NavigatorEnd` import, `END_GROUP`, the local `toSlotMeta`, and the
   `unknownTabs`/`repeatedTabs`/`overflowTabs` effect.
2. Replace the `useMemo` walk with
   `const collected = useMemo(() => collectSlots(children), [children])` and
   derive `const items = [...collected.automatic, ...collected.pinnedSlots]`
   wherever the old code read `items` (section memory, `branchSection`).
   `nests` is still derived for now:
   `[...collected.automatic, ...collected.pinnedSlots].some((s) => s.descendants.length > 0)`
   (Task 5 deletes it).
3. `const slots = deriveMobileSlots(collected.automatic, collected.pinnedSlots)`.
4. Dev warnings: the stray-child message loses every mention of
   `Navigator.End` ("Navigator.Primary only recognises Navigator.Item,
   Navigator.Group and Navigator.Brand by direct element-type reference…").
   Add a second effect for D1:

```ts
  const conflicting = collected.conflictingPlacement.join(', ')
  useEffect(() => {
    if (!isDev() || conflicting === '') return
    console.warn(
      `[Roadie] Navigator.Item ${conflicting} declares a placement that ` +
        "differs from its Navigator.Group's. The group's placement wins — " +
        'move the item out of the group to place it on its own.'
    )
  }, [conflicting])

  const pinnedFirst = collected.pinnedBeforeCluster
  useEffect(() => {
    if (!isDev() || !pinnedFirst) return
    console.warn(
      '[Roadie] Navigator.Primary has a pinned item written before other ' +
        'items. Pinned items render at the bottom of the rail and in the ' +
        "phone bar's trailing circle, so keyboard and screen-reader order " +
        'follows that, not your source order. Write pinned items last.'
    )
  }, [pinnedFirst])
```

   Add to `Navigator.test.tsx`'s dev-warning tests:

```tsx
  it('warns when a pinned item is written before the cluster', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(
      <Navigator value='/a'>
        <Navigator.Primary aria-label='Main'>
          <Navigator.Item value='/me' href='/me' placement='pinned'>Me</Navigator.Item>
          <Navigator.Item value='/a' href='/a'>A</Navigator.Item>
        </Navigator.Primary>
      </Navigator>
    )
    await flushViewportMeasurement()
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Write pinned items last'))
    warn.mockRestore()
  })
```

   The "renders pinned items at the bottom of the rail" test in step 7 writes
   the pinned item first on purpose; spy on `console.warn` there too so the
   warning doesn't leak into the output.

5. Rail: render the cluster where the rows were, then a pinned region last:

```tsx
            {wrapRailRun([
              ...collected.brand,
              ...collected.cluster.map((entry) => entry.element)
            ])}
            {collected.pinned.length > 0 ? (
              <div
                data-slot='navigator-rail-pinned'
                className={navigatorRailPinnedVariants()}
              >
                {wrapRailRun(collected.pinned.map((entry) => entry.element))}
              </div>
            ) : null}
```

   In `variants.ts` rename `navigatorEndVariants` → `navigatorRailPinnedVariants`
   (same classes, comment: "Pinned items sit on the rail's bottom edge;
   `mt-auto` pushes against the rail's flex column.").

6. Tab bar. The final tab is always More now; the End/"sole folded" branch goes:

```ts
  const folded = slots.overflow
  const hasMore = folded.length > 0
  const pinnedTab = slots.pinned
  const foldedIsActive = folded.some((slot) => isSectionActive(slot, activeValue))
  const pinnedIsActive =
    pinnedTab !== undefined && isSectionActive(pinnedTab, activeValue)
  // The pinned circle already sits at the trailing edge, so it is the right circle.
  const activeIsRight = pinnedTab ? pinnedIsActive : hasMore && foldedIsActive
  const tabCount = slots.tabs.length + (hasMore ? 1 : 0)
```

   `setOverflowItems(folded)` keyed as today. The bar gets the pinned width as
   a second inline custom property and renders the circle after the track:

```tsx
      <nav
        data-slot='navigator-tab-bar'
        …
        style={
          {
            '--navigator-tab-count': String(tabCount),
            '--navigator-tab-pinned': pinnedTab ? '4rem' : '0rem'
          } as CSSProperties
        }
        className={navigatorTabBarVariants({
          collapsed,
          hidden: navHidden,
          pinned: pinnedTab !== undefined
        })}
      >
        <div ref={tabTrackRef} data-slot='navigator-tab-bar-track' …>
          {/* pill, indicator, tabs as today; isLeftCircle uses activeIsRight */}
          {hasMore ? (
            <NavigatorTab
              label={OVERFLOW_LABEL}
              icon={<DotsThreeIcon />}
              active={overflowOpen || (foldedIsActive && !disclosureOpen)}
              collapsed={collapsed}
              circleSide={pinnedTab ? undefined : 'right'}
              index={slots.tabs.length}
              expanded={overflowOpen}
              controls={overflowOpen ? overflowPaneId : undefined}
              onSelect={() => {
                setOpenPanel(null)
                setOverflowOpen(!overflowOpen)
              }}
            />
          ) : null}
        </div>
        {pinnedTab ? (
          <div
            data-slot='navigator-tab-bar-pinned'
            className={navigatorTabBarPinnedVariants()}
          >
            <NavigatorTab
              label={pinnedTab.label}
              icon={pinnedTab.icon}
              href={pinnedTab.panel ? undefined : rememberedHref(sectionMemory, pinnedTab.value, pinnedTab.href, pinnedIsActive)}
              active={pinnedTab.panel ? openPanel === pinnedTab.value : pinnedIsActive && !disclosureOpen}
              isPage={isActiveValue(pinnedTab.value, activeValue)}
              pinned
              index={0}
              onSelect={(event) => selectDestination(event, pinnedTab, pinnedIsActive)}
            />
          </div>
        ) : null}
      </nav>
```

   Import `DotsThreeIcon` from `@phosphor-icons/react` and drop `ListIcon`.
   (`panel`/`openPanel` are replaced by Menu in Task 3.)

7. `variants.ts`:
   - `navigatorTabBarVariants`: base keeps `grid`; add
     `'[--navigator-tab-pinned:0rem]'` and change the column to
     `'[--navigator-tab-col:calc((100cqw-2rem-var(--navigator-tab-pinned))/5)]'`
     (the `/5` stays — five columns of whatever width is left). New variant
     `pinned: { true: 'grid-cols-[1fr_auto] gap-2', false: '' }`, default `false`.
     Update the block comment's arithmetic paragraph to name the pinned width.
   - New `navigatorTabBarPinnedVariants = cva(['pointer-events-auto grid self-stretch'])`.
   - `navigatorTabVariants` gains a `pinned` presentation:
     `'pointer-events-auto aspect-square h-full rounded-full emphasis-floating place-content-center justify-self-end'`.
     `NavigatorTab` gets `pinned?: boolean`; presentation is `'pinned'` when
     set, whatever `collapsed` is (the circle never moves), and its label is
     `sr-only`.

- [ ] **Step 7: Migrate the test suite**

In `Navigator.test.tsx` (line numbers are from the plan-time file; search by
describe name):

- **Delete** `describe('deriveMobileSlots')` (≈565-635),
  `describe('deriveMobileSlots with declared tabs')` (≈637-739),
  `describe('Navigator.Primary tabs prop')` (≈741-811),
  `describe('Navigator.End stray children')` (≈1191-1233), the End assertions
  in `describe('Navigator rail form')` (≈903-918), and the `tabs` tests inside
  `describe('mobile tab bar')` (≈1557-1577). The new pure tests in
  `mobileSlots.test.ts` replace the first two.
- **Migrate** every fixture that declares `<Navigator.End>…</Navigator.End>`:
  unwrap its items and add `placement='pinned'` to each. Known sites:
  `sixItemsAndEnd` (≈1436-1450), `groupedOverflowNav` (≈1921-1925),
  ≈2111-2140, `barTree` (≈3574-3576), ≈3664-3680, ≈3908-3915, ≈3541-3556.
  `grep -n "Navigator.End" src/components/Navigator/Navigator.test.tsx` must
  print nothing afterwards.
- **Rewrite** expectations that assumed End's lone item became the final tab's
  label: a single pinned item is now the trailing circle
  (`[data-slot="navigator-tab-bar-pinned"]`), not a tab in the track. Two
  pinned items: the second is a row in the More pane.
- The direct-children warning test (≈3522-3557) asserts the new message text.
- Remove imports: `NavigatorTabSlots`, and `deriveMobileSlots` from
  `./NavigatorPrimary`.
- **Add** to `describe('mobile tab bar')`:

```tsx
  it('floats the first pinned item in a circle outside the tabs', async () => {
    const { container } = render(
      <Navigator value='/a'>
        <Navigator.Primary aria-label='Main'>
          {['/a', '/b', '/c', '/d', '/e'].map((v) => (
            <Navigator.Item key={v} value={v} href={v} icon={<FakeIcon />}>
              {v}
            </Navigator.Item>
          ))}
          <Navigator.Item value='/me' href='/me' icon={<FakeIcon />} placement='pinned'>
            Me
          </Navigator.Item>
        </Navigator.Primary>
      </Navigator>
    )
    await flushViewportMeasurement()
    const bar = tabBarOf(container)!
    const track = bar.querySelector('[data-slot="navigator-tab-bar-track"]')!
    expect(within(track as HTMLElement).queryByText('Me')).toBeNull()
    expect(within(track as HTMLElement).queryByText('More')).toBeNull()
    const circle = bar.querySelector('[data-slot="navigator-tab-bar-pinned"]')!
    expect(within(circle as HTMLElement).getByRole('link', { name: 'Me' })).toBeInTheDocument()
  })

  it('renders pinned items at the bottom of the rail', async () => {
    const { container } = render(
      <Navigator value='/a'>
        <Navigator.Primary aria-label='Main'>
          <Navigator.Item value='/me' href='/me' placement='pinned'>Me</Navigator.Item>
          <Navigator.Item value='/a' href='/a'>A</Navigator.Item>
        </Navigator.Primary>
      </Navigator>
    )
    await flushViewportMeasurement()
    const rail = container.querySelector('[data-slot="navigator-rail"]')!
    const pinned = rail.querySelector('[data-slot="navigator-rail-pinned"]')!
    expect(within(pinned as HTMLElement).getByText('Me')).toBeInTheDocument()
    expect(within(pinned as HTMLElement).queryByText('A')).toBeNull()
  })
```

(`tabBarOf` is defined locally in several describes — define it in this
describe too if it isn't in scope.)

Run: `cd packages/components && pnpm vitest run src/components/Navigator`
Expected: PASS. Act-warning count for `Navigator.test.tsx` ≤ 2.

- [ ] **Step 8: Exports and docs call sites**

- `Navigator/index.tsx`: remove `NavigatorEnd`/`End`/`NavigatorEndProps`;
  change the type re-exports from `./NavigatorPrimary` to
  `MobileSlots, NavigatorPrimaryProps, NavigatorSlotMeta` and add
  `export type { NavigatorPlacement, NavigatorVisibilityPriority } from './mobileSlots'`.
  Rename `navigatorEndVariants` in the variants list if it was exported (it
  isn't today); add `navigatorTabBarPinnedVariants`, `navigatorRailPinnedVariants`.
- `packages/components/src/index.tsx`: drop `type NavigatorEndProps`; add
  `type NavigatorPlacement, type NavigatorVisibilityPriority`.
- `NavigatorPrimary.tsx`'s re-export line becomes
  `export type { MobileSlots, NavigatorSlotMeta }` and
  `export { deriveMobileSlots }` stays.
- `docs/src/components/Navigation.tsx`: replace the `<Navigator.End>` wrapper
  with `placement='pinned'` on the Appearance item.
- `docs/src/app/debug/rsc-smoke/NavigatorCanary.tsx`: the same for its End.
- `git rm packages/components/src/components/Navigator/NavigatorEnd.tsx`.

Run `pnpm typecheck && pnpm lint`. Expected: clean.

- [ ] **Step 9: Commit**

```bash
git add packages/components/src/components/Navigator packages/components/src/index.tsx \
  docs/src/components/Navigation.tsx docs/src/app/debug/rsc-smoke/NavigatorCanary.tsx
git commit -m "feat(navigator)!: placement and visibilityPriority replace Navigator.End and tabs"
```

---

## Task 3: `Navigator.Menu` on Base UI Menu replaces `Navigator.Panel`

**Files:**
- Create: `…/Navigator/NavigatorMenu.tsx`, `NavigatorMenuItem.tsx`,
  `NavigatorMenuHost.tsx`, `NavigatorMenu.test.tsx`
- Modify: `NavigatorContext.ts`, `NavigatorRoot.tsx`, `NavigatorItem.tsx`,
  `NavigatorPrimary.tsx`, `NavigatorTab.tsx`, `NavigatorDestination.tsx`,
  `NavigatorOverflowItems.tsx`, `NavigatorContent.tsx`, `splitSecondary.ts`,
  `mobileSlots.ts`, `collectSlots.ts`, `variants.ts`, `index.tsx`,
  `Navigator.test.tsx`, `packages/components/src/index.tsx`
- Delete: `NavigatorPanel.tsx`, `NavigatorPanelPane.tsx`

**Interfaces:**
- Produces:

```ts
export type NavigatorMenuProps = { 'aria-label'?: string; className?: string; children?: ReactNode }
export type NavigatorMenuItemProps = {
  href?: string          // routed through RoadieLinkProvider
  onClick?: () => void
  icon?: ReactNode
  className?: string
  children: ReactNode
}
// internal
export type NavigatorMenuSurface = 'rail' | 'bar' | 'overflow'
export const menuId = (surface: NavigatorMenuSurface, value: string) => `${surface}:${value}`
// context: openMenu: string | null; setOpenMenu(next: string | null)
// slot meta: `menu?: ReactElement<NavigatorMenuProps>` replaces `panel`
// isSectionActive(item: Pick<NavigatorSlotMeta,'value'|'descendants'|'menu'>, active)
```

The rail and the bar are both mounted (CSS picks one), so a menu's open state
is keyed per surface — otherwise opening the rail's menu would also open the
bar's portaled copy.

- [ ] **Step 1: Write the failing tests**

`NavigatorMenu.test.tsx`:

```tsx
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { Navigator } from '.'

async function flushViewportMeasurement() {
  await act(async () => {
    await Promise.resolve()
  })
}

const FakeIcon = () => <svg data-testid='fake-icon' />
const rail = () =>
  document.querySelector('[data-slot="navigator-rail"]') as HTMLElement
const bar = () =>
  document.querySelector('[data-slot="navigator-tab-bar"]') as HTMLElement

function Tree({ value = '/home', signOut = () => {} }) {
  return (
    <Navigator value={value}>
      <Navigator.Primary aria-label='Main'>
        <Navigator.Item value='/home' href='/home' icon={<FakeIcon />}>
          Home
        </Navigator.Item>
        <Navigator.Item value='account' icon={<FakeIcon />} placement='pinned'>
          Account
          <Navigator.Menu>
            <Navigator.MenuItem href='/profile'>Profile</Navigator.MenuItem>
            <Navigator.MenuItem onClick={signOut}>Sign out</Navigator.MenuItem>
          </Navigator.Menu>
        </Navigator.Item>
      </Navigator.Primary>
    </Navigator>
  )
}

afterEach(() => vi.restoreAllMocks())

describe('Navigator.Menu', () => {
  it('opens a menu anchored inline-end of the rail tile', async () => {
    const user = userEvent.setup()
    render(<Tree />)
    await flushViewportMeasurement()
    const trigger = within(rail()).getByRole('button', { name: 'Account' })
    await user.click(trigger)
    const menu = await screen.findByRole('menu')
    expect(within(menu).getAllByRole('menuitem')).toHaveLength(2)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(menu.closest('[data-side]')).toHaveAttribute('data-side', 'inline-end')
  })

  it('moves with the arrow keys and typeahead', async () => {
    const user = userEvent.setup()
    render(<Tree />)
    await flushViewportMeasurement()
    await user.click(within(rail()).getByRole('button', { name: 'Account' }))
    await screen.findByRole('menu')
    await user.keyboard('{ArrowDown}')
    expect(screen.getByRole('menuitem', { name: 'Profile' })).toHaveAttribute(
      'data-highlighted'
    )
    await user.keyboard('s')
    expect(screen.getByRole('menuitem', { name: 'Sign out' })).toHaveAttribute(
      'data-highlighted'
    )
  })

  it('closes on Escape and returns focus to its tile', async () => {
    const user = userEvent.setup()
    render(<Tree />)
    await flushViewportMeasurement()
    const trigger = within(rail()).getByRole('button', { name: 'Account' })
    await user.click(trigger)
    await screen.findByRole('menu')
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('runs onClick and closes', async () => {
    const user = userEvent.setup()
    const signOut = vi.fn()
    render(<Tree signOut={signOut} />)
    await flushViewportMeasurement()
    await user.click(within(rail()).getByRole('button', { name: 'Account' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Sign out' }))
    expect(signOut).toHaveBeenCalledOnce()
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('renders an href item as a link', async () => {
    const user = userEvent.setup()
    render(<Tree />)
    await flushViewportMeasurement()
    await user.click(within(rail()).getByRole('button', { name: 'Account' }))
    const profile = await screen.findByRole('menuitem', { name: 'Profile' })
    expect(profile.closest('a')).toHaveAttribute('href', '/profile')
  })

  it('never lights from the route', async () => {
    render(<Tree value='account/settings' />)
    await flushViewportMeasurement()
    const trigger = within(rail()).getByRole('button', { name: 'Account' })
    expect(trigger).not.toHaveAttribute('aria-current')
    expect(trigger).not.toHaveAttribute('data-current')
  })

  it('reads active only while open, and the route tile yields', async () => {
    const user = userEvent.setup()
    render(<Tree />)
    await flushViewportMeasurement()
    const trigger = within(rail()).getByRole('button', { name: 'Account' })
    const home = within(rail()).getByRole('link', { name: 'Home' })
    expect(home).toHaveAttribute('data-current')
    await user.click(trigger)
    await screen.findByRole('menu')
    expect(trigger).toHaveAttribute('data-current')
    expect(home).not.toHaveAttribute('data-current')
    await user.keyboard('{Escape}')
    expect(trigger).not.toHaveAttribute('data-current')
    expect(home).toHaveAttribute('data-current')
  })

  it('opens above its tab on the phone bar, and only that copy', async () => {
    const user = userEvent.setup()
    render(<Tree />)
    await flushViewportMeasurement()
    await user.click(within(bar()).getByRole('button', { name: 'Account' }))
    expect(await screen.findAllByRole('menu')).toHaveLength(1)
    expect(screen.getByRole('menu').closest('[data-side]')).toHaveAttribute(
      'data-side',
      'top'
    )
  })
})
```

Run: `cd packages/components && pnpm vitest run src/components/Navigator/NavigatorMenu.test.tsx`
Expected: FAIL — `Navigator.Menu` is undefined.

- [ ] **Step 2: Declaration and item**

`NavigatorMenu.tsx`:

```tsx
import type { ReactNode } from 'react'

export type NavigatorMenuProps = {
  /** Names the menu. Falls back to the item's own label. */
  'aria-label'?: string
  className?: string
  children?: ReactNode
}

/** A menu owned by a `Navigator.Item`; the item opens it instead of navigating. */
export function NavigatorMenu(_props: NavigatorMenuProps): null {
  return null
}

NavigatorMenu.displayName = 'Navigator.Menu'
```

`NavigatorMenuItem.tsx`:

```tsx
'use client'

import type { ReactNode } from 'react'

import { Menu } from '@base-ui/react/menu'

import { cn } from '@oztix/roadie-core/utils'

import { RoadieRoutedLink } from '../Link/RoadieRoutedLink'
import { navigatorMenuItemVariants } from './variants'

export type NavigatorMenuItemProps = {
  /** Routes through `RoadieLinkProvider`, like `Navigator.Item`. */
  href?: string
  onClick?: () => void
  /** Leading icon. Bold weight, like any icon outside Navigator's destinations. */
  icon?: ReactNode
  className?: string
  children: ReactNode
}

export function NavigatorMenuItem({
  href,
  onClick,
  icon,
  className,
  children
}: NavigatorMenuItemProps) {
  const content = (
    <>
      {icon ? (
        <span data-slot='navigator-menu-item-icon' className='grid size-4 place-items-center'>
          {icon}
        </span>
      ) : null}
      <span className='truncate'>{children}</span>
    </>
  )
  const finalClassName = cn(navigatorMenuItemVariants(), className)

  if (href !== undefined) {
    return (
      <Menu.LinkItem
        data-slot='navigator-menu-item'
        className={finalClassName}
        render={<RoadieRoutedLink href={href} />}
        onClick={onClick}
      >
        {content}
      </Menu.LinkItem>
    )
  }

  return (
    <Menu.Item
      data-slot='navigator-menu-item'
      className={finalClassName}
      onClick={onClick}
    >
      {content}
    </Menu.Item>
  )
}

NavigatorMenuItem.displayName = 'Navigator.MenuItem'
```

`variants.ts`:

```ts
// A menu owned by an item. Same floating surface and motion as Popover.
export const navigatorMenuPopupVariants = cva([
  'grid min-w-48 max-h-(--available-height) origin-(--transform-origin) gap-0.5 p-1',
  'rounded-xl emphasis-floating motion-scale outline-none'
])

export const navigatorMenuItemVariants = cva([
  'flex cursor-default items-center gap-2 rounded-lg px-3 py-2 text-sm text-normal outline-none select-none',
  'data-[highlighted]:bg-subtle'
])
```

- [ ] **Step 3: Host, context, destination forwarding**

`NavigatorContext.ts`: replace `openPanel`/`setOpenPanel`/`panelItems`/
`setPanelItems` with

```ts
  /** `menuId(surface, value)` of the open menu, or null. */
  openMenu: string | null
  setOpenMenu: (next: string | null) => void
```

(defaults `null` / no-op) and change `isSectionActive`'s pick and guard from
`panel` to `menu`. `NavigatorRoot.tsx`: swap the two `useState`s and the
context entries accordingly.

`NavigatorMenuHost.tsx`:

```tsx
'use client'

import { type ReactElement, use } from 'react'

import { Menu } from '@base-ui/react/menu'

import { cn } from '@oztix/roadie-core/utils'

import { NavigatorContext } from './NavigatorContext'
import type { NavigatorMenuProps } from './NavigatorMenu'
import { navigatorMenuPopupVariants } from './variants'

export type NavigatorMenuSurface = 'rail' | 'bar' | 'overflow'

export const menuId = (surface: NavigatorMenuSurface, value: string) =>
  `${surface}:${value}`

const PLACEMENT = {
  rail: { side: 'inline-end', align: 'start' },
  bar: { side: 'top', align: 'center' },
  overflow: { side: 'bottom', align: 'start' }
} as const

export type NavigatorMenuHostProps = {
  surface: NavigatorMenuSurface
  value: string
  menu: ReactElement<NavigatorMenuProps>
  /** The item's label as text, for the menu's name when it declares none. */
  label?: string
  trigger: ReactElement
}

// Open state lives on context so route destinations can yield the pill while a menu is open.
export function NavigatorMenuHost({
  surface,
  value,
  menu,
  label,
  trigger
}: NavigatorMenuHostProps) {
  const { openMenu, setOpenMenu } = use(NavigatorContext)
  const id = menuId(surface, value)
  const { side, align } = PLACEMENT[surface]

  return (
    <Menu.Root
      open={openMenu === id}
      onOpenChange={(open) => setOpenMenu(open ? id : null)}
    >
      <Menu.Trigger render={trigger} />
      <Menu.Portal>
        <Menu.Positioner
          side={side}
          align={align}
          sideOffset={8}
          className='z-popover'
        >
          <Menu.Popup
            data-slot='navigator-menu'
            aria-label={menu.props['aria-label'] ?? label}
            className={cn(navigatorMenuPopupVariants(), menu.props.className)}
          >
            {menu.props.children}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )
}
```

`NavigatorDestination.tsx` must accept the props and ref Base UI merges in
through `render`. Change the signature to spread the rest onto both branches:

```tsx
export type NavigatorDestinationProps = Omit<
  ComponentProps<'button'>,
  'children' | 'onClick' | 'style' | 'className'
> & {
  // existing props unchanged …
  ref?: Ref<HTMLElement>
}

export function NavigatorDestination({ href, circleSide, style, ariaCurrent, dataCurrent, expanded, controls, className, children, onClick, ref, ...rest }: NavigatorDestinationProps) {
  if (href !== undefined) {
    return <RoadieRoutedLink {...(rest as AnchorHTMLAttributes<HTMLAnchorElement>)} ref={ref as Ref<HTMLAnchorElement>} data-slot='navigator-item' … />
  }
  return <button type='button' {...rest} ref={ref as Ref<HTMLButtonElement>} data-slot='navigator-item' … />
}
```

(Spread `rest` *before* the component's own attributes so `data-slot`,
`aria-current` and `className` can't be overridden.) `NavigatorTab` spreads
its own unknown props through to `NavigatorDestination` the same way.

- [ ] **Step 4: Wire the three surfaces**

- `splitSecondary.ts`: `splitItemChildren` returns `menu` (matched by
  `child.type === NavigatorMenu`) instead of `panel`; update the JSDoc.
- `collectSlots.ts` `toSlotMeta`: `menu` replaces `panel` (a Secondary still
  wins: `const menu = secondary.length > 0 ? undefined : declaredMenu`), and a
  menu item has no `href`.
- `mobileSlots.ts`: `NavigatorSlotMeta.menu?: ReactElement<NavigatorMenuProps>`
  replaces `panel`.
- `NavigatorItem.tsx`: delete the `Popover` branch. When `menu` is set, render

```tsx
    <NavigatorMenuHost
      surface='rail'
      value={value}
      menu={menu}
      label={typeof labelText === 'string' ? labelText : undefined}
      trigger={
        <NavigatorDestination
          dataCurrent={openMenu === menuId('rail', value)}
          className={finalClassName}
        >
          {content}
        </NavigatorDestination>
      }
    />
```

  and gate every route item's currency on `openMenu === null` (same rule the
  tab bar already applies through `disclosureOpen`). Keep the
  Secondary-and-Menu dev warning, reworded to "…declares both a
  Navigator.Secondary and a Navigator.Menu. The Menu is ignored — an item with
  sub-navigation is a section, not a menu."
- `NavigatorPrimary.tsx`: `disclosureOpen = overflowOpen || openMenu !== null`.
  Delete the `openPanel` Escape effect, `panelSlots`/`panelKey`/`setPanelItems`,
  and every `openPanel`/`setOpenPanel` use. A tab (or the pinned circle) whose
  slot has a `menu` renders through the host:

```tsx
  const renderTab = (tab: NavigatorSlotMeta, tabProps: NavigatorTabProps) =>
    tab.menu ? (
      <NavigatorMenuHost
        key={tab.value}
        surface='bar'
        value={tab.value}
        menu={tab.menu}
        label={typeof tab.label === 'string' ? tab.label : undefined}
        trigger={
          <NavigatorTab
            {...tabProps}
            href={undefined}
            active={openMenu === menuId('bar', tab.value)}
            onSelect={undefined}
          />
        }
      />
    ) : (
      <NavigatorTab key={tab.value} {...tabProps} />
    )
```

  `selectDestination` loses its panel branch; it calls `setOpenMenu(null)`
  where it called `setOpenPanel(null)`.
- `NavigatorOverflowItems.tsx`: a slot with `menu` renders a row that is a menu
  trigger. `List.Item` renders its own `<li>` and can't be a trigger, so build
  the row from List's exported classes:

```tsx
import {
  listItemContentClass,
  listItemLeadingClass,
  listItemTitleClass,
  listItemVariants
} from '../List/variants'

  const renderMenuRow = (slot: NavigatorSlotMeta) => (
    <li key={slot.value}>
      <NavigatorMenuHost
        surface='overflow'
        value={slot.value}
        menu={slot.menu!}
        label={typeof slot.label === 'string' ? slot.label : undefined}
        trigger={
          <button
            type='button'
            data-slot='list-item'
            className={listItemVariants({ selected: openMenu === menuId('overflow', slot.value) })}
          >
            {slot.icon ? (
              <span className={listItemLeadingClass}>
                {presentNavIcon(slot.icon, 'size-5')}
              </span>
            ) : null}
            <span className={listItemContentClass}>
              <span className={listItemTitleClass}>{slot.label}</span>
            </span>
          </button>
        }
      />
    </li>
  )
```

  and remove the `setOpenPanel` branch from the ordinary row's `onClick`.
  (`presentNavIcon`'s two-argument form lands in Task 10; until then pass
  `presentNavIcon(slot.icon, false, 'size-5')`.)
- `NavigatorContent.tsx`: delete the `openPanelSlot` block, the
  `NavigatorPanelPane` import and render, and `panelItems`/`openPanel` from
  the context read.
- `variants.ts`: delete `navigatorPanelPaneVariants`.
- `index.tsx`: remove `Panel`/`NavigatorPanelProps`; add
  `Menu: typeof NavigatorMenu`, `MenuItem: typeof NavigatorMenuItem`,
  the assignments, and
  `export type { NavigatorMenuProps } from './NavigatorMenu'`,
  `export type { NavigatorMenuItemProps } from './NavigatorMenuItem'`, plus
  `navigatorMenuPopupVariants`, `navigatorMenuItemVariants`.
- `git rm …/NavigatorPanel.tsx …/NavigatorPanelPane.tsx`.

- [ ] **Step 5: Migrate `Navigator.test.tsx`**

Delete `describe('Navigator.Panel')` (≈3012-3089),
`describe('Navigator.Panel below md')` (≈3091-3266), the Panel tests in
`describe('mobile tab bar')` (≈1738-1848), the `panel items` sub-describe of
section memory (≈4527-4570) and `describe('a panel item is not a page')`
(≈4573-4690) — `NavigatorMenu.test.tsx` covers the replacement behaviour.
Rewrite `describe('Panel + Secondary precedence')` (≈3268-3326) with
`Navigator.Menu` and the new warning text. Then add to
`NavigatorMenu.test.tsx`:

```tsx
  it('opens a folded menu below its row in the More pane', async () => {
    const user = userEvent.setup()
    render(
      <Navigator value='/a'>
        <Navigator.Primary aria-label='Main'>
          {['/a', '/b', '/c', '/d', '/e'].map((v) => (
            <Navigator.Item key={v} value={v} href={v}>
              {v}
            </Navigator.Item>
          ))}
          <Navigator.Item value='account' visibilityPriority='low'>
            Account
            <Navigator.Menu>
              <Navigator.MenuItem href='/profile'>Profile</Navigator.MenuItem>
            </Navigator.Menu>
          </Navigator.Item>
        </Navigator.Primary>
        <Navigator.Content />
      </Navigator>
    )
    await flushViewportMeasurement()
    await user.click(within(bar()).getByRole('button', { name: 'More' }))
    const pane = document.querySelector('[data-slot="pane"][id]') as HTMLElement
    await user.click(within(pane).getByRole('button', { name: 'Account' }))
    expect((await screen.findByRole('menu')).closest('[data-side]')).toHaveAttribute(
      'data-side',
      'bottom'
    )
  })

  it('keeps Secondary and warns when an item declares both', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(
      <Navigator value='/x/one'>
        <Navigator.Primary aria-label='Main'>
          <Navigator.Item value='/x' href='/x'>
            X
            <Navigator.Secondary aria-label='X pages'>
              <Navigator.Item value='/x/one' href='/x/one'>One</Navigator.Item>
            </Navigator.Secondary>
            <Navigator.Menu>
              <Navigator.MenuItem>Ignored</Navigator.MenuItem>
            </Navigator.Menu>
          </Navigator.Item>
        </Navigator.Primary>
      </Navigator>
    )
    await flushViewportMeasurement()
    expect(within(rail()).getByRole('link', { name: 'X' })).toBeInTheDocument()
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('The Menu is ignored'))
  })
```

Run: `cd packages/components && pnpm vitest run src/components/Navigator`
Expected: PASS; `NavigatorMenu.test.tsx` act warnings 0; `Navigator.test.tsx` ≤ 2.

If `data-side` reports a physical side (`right`) for `inline-end` in jsdom,
assert what Base UI actually reports and note it in the task report — the
browser check in Task 16 is the real test of placement.

- [ ] **Step 6: Commit**

```bash
git add packages/components/src/components/Navigator packages/components/src/index.tsx
git commit -m "feat(navigator)!: Navigator.Menu on Base UI Menu replaces Navigator.Panel"
```

---

## Task 4: `Navigator.Overflow` becomes `Navigator.OverflowPane`, a list pane at every size

**Files:**
- Rename: `…/Navigator/NavigatorOverflow.tsx` → `NavigatorOverflowPane.tsx`
- Modify: `NavigatorContent.tsx`, `NavigatorOverflowItems.tsx`,
  `NavigatorContext.ts`, `NavigatorRoot.tsx`, `NavigatorPrimary.tsx`,
  `variants.ts`, `index.tsx`, `Navigator.test.tsx`,
  `packages/components/src/index.tsx`

**Interfaces:**
- Produces: `Navigator.OverflowPane` / `NavigatorOverflowPaneProps` (same props
  as before); context `overflowItems: { bar: NavigatorSlotMeta[]; rail: NavigatorSlotMeta[] }`
  and `setOverflowItems(surface: 'bar' | 'rail', next: NavigatorSlotMeta[])`
  (Task 8 writes `rail`); context `overflowOpener: RefObject<HTMLElement | null>`
  (the More control that opened the pane, for returning focus).
- D5 (including its focus condition), D6.

- [ ] **Step 1: Write the failing tests**

In `Navigator.test.tsx`, rename `describe('Navigator.Overflow')` to
`describe('Navigator.OverflowPane')` and replace every `Navigator.Overflow`
with `Navigator.OverflowPane` in it. Add:

```tsx
  it('is a list pane that leads the columns from lg', async () => {
    render(overflowNav('/a'))
    await flushViewportMeasurement()
    const more = document.querySelector('[data-slot="pane"][id]')!
    expect(more).toHaveClass('lg:-order-1')
    expect(more).not.toHaveClass('md:hidden')
  })

  it('titles the generated pane in its header, like a section pane', async () => {
    render(overflowNav('/a'))
    await flushViewportMeasurement()
    const more = document.querySelector('[data-slot="pane"][id]') as HTMLElement
    expect(
      within(more).getByRole('heading', { name: 'More' })
    ).toHaveAttribute('data-slot', 'pane-title')
  })

  it('moves focus to the More pane title on open, and back on Escape', async () => {
    const user = userEvent.setup()
    const { container } = render(overflowNav('/a'))
    await flushViewportMeasurement()
    const more = within(tabBarOf(container)!).getByRole('button', { name: 'More' })
    await user.click(more)
    const pane = document.querySelector('[data-slot="pane"][id]') as HTMLElement
    expect(within(pane).getByRole('heading', { name: 'More' })).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(more).toHaveFocus()
  })

  it('focuses a declared OverflowPane with no title itself', async () => {
    const user = userEvent.setup()
    const { container } = render(
      overflowNav('/a', (
        <Navigator.OverflowPane aria-label='More'>
          <Navigator.OverflowItems />
        </Navigator.OverflowPane>
      ))
    )
    await flushViewportMeasurement()
    await user.click(within(tabBarOf(container)!).getByRole('button', { name: 'More' }))
    expect(document.querySelector('[data-slot="pane"][id]')).toHaveFocus()
  })

  it("renders the bar's folded rows below md only", async () => {
    render(overflowNav('/a'))
    await flushViewportMeasurement()
    const lists = document.querySelectorAll(
      '[data-slot="pane"][id] [data-slot="navigator-overflow-items"]'
    )
    expect(lists[0]).toHaveClass('md:hidden')
  })
```

(`overflowNav(value, extra?)` is the describe's existing fixture — check that
its second argument is placed inside `Navigator.Content` and adjust the call if
not; define `tabBarOf` in the describe if it isn't in scope.) Run:
`cd packages/components && pnpm vitest run src/components/Navigator/Navigator.test.tsx -t OverflowPane`
Expected: FAIL.

- [ ] **Step 2: Rename and re-role**

```bash
git mv packages/components/src/components/Navigator/NavigatorOverflow.tsx \
  packages/components/src/components/Navigator/NavigatorOverflowPane.tsx
```

In it: `NavigatorOverflowPane`, `NavigatorOverflowPaneProps`,
`displayName = 'Navigator.OverflowPane'`, `role='list'` instead of `'detail'`,
and every warning string says `Navigator.OverflowPane`. Update the JSDoc: it is
the More pane at every size — a pushed full-screen pane while stacked, the
leading list column from `lg`.

`variants.ts`: `navigatorOverflowVariants = cva(['lg:-order-1'])` with the D5
comment ("Rendered after the consumer's panes so it stays the deepest `current`
when stacked; `order` moves it to the leading column once panes are columns.").

`NavigatorContent.tsx`: the generated fallback becomes

```tsx
        <NavigatorOverflowPane>
          <PaneHeader>
            <PaneTitle>{OVERFLOW_LABEL}</PaneTitle>
          </PaneHeader>
          <NavigatorOverflowItems />
        </NavigatorOverflowPane>
```

(import `PaneTitle` from `../Pane/PaneTitle`; drop `PaneBodyTitle`), and the
declared-overflow scan matches `NavigatorOverflowPane`.

- [ ] **Step 2b: Focus into the pane**

In `NavigatorOverflowPane.tsx`, move focus when the pane opens — in a layout
effect so it lands before paint, keyed on the open transition only:

```tsx
  const paneRef = useRef<HTMLElement | null>(null)
  const wasOpen = useRef(overflowOpen)
  useIsomorphicLayoutEffect(() => {
    const opened = overflowOpen && !wasOpen.current
    wasOpen.current = overflowOpen
    if (!opened || !paneRef.current) return
    // After the detail in the DOM, so a keyboard user would otherwise stay behind.
    const title = paneRef.current.querySelector<HTMLElement>('[data-slot="pane-title"]')
    const target = title ?? paneRef.current
    target.tabIndex = -1
    target.focus({ preventScroll: true })
  }, [overflowOpen])
```

and pass `ref={paneRef}` to `PaneRoot` (it forwards). For Escape, record the
opener: `NavigatorContext` gains `overflowOpener: RefObject<HTMLElement | null>`
(a ref created in `NavigatorRoot`); the More tab and the rail More tile set
`overflowOpener.current = event.currentTarget` before opening. The existing
Escape effect in `NavigatorPrimary` closes the pane and then calls
`overflowOpener.current?.focus()`. Closing by selecting a row navigates, so it
doesn't restore focus.

- [ ] **Step 3: Two row sets**

`NavigatorContext.ts` / `NavigatorRoot.tsx`: `overflowItems` becomes
`{ bar, rail }`, default `{ bar: [], rail: [] }`, with

```ts
  const setOverflowItems = useCallback(
    (surface: 'bar' | 'rail', next: NavigatorSlotMeta[]) =>
      setOverflowItemsState((current) => ({ ...current, [surface]: next })),
    []
  )
```

`NavigatorPrimary.tsx` calls `setOverflowItems('bar', folded)`. The fallback
condition in `NavigatorContent` becomes
`overflowItems.bar.length + overflowItems.rail.length > 0`, and the
"folded with no host" warning reads `overflowItems.bar`.

`NavigatorOverflowItems.tsx` renders both sets, each gated to the surface that
folded it (D6), with `data-slot='navigator-overflow-items'` on each `List`:

```tsx
  return (
    <>
      {renderSet(overflowItems.bar, 'md:hidden')}
      {renderSet(overflowItems.rail, 'max-md:hidden')}
    </>
  )
```

where `renderSet(slots, gate)` returns `null` for an empty set and otherwise
the existing `List` of runs with `className={cn(gate, className)}`.

- [ ] **Step 4: Exports and tests**

`index.tsx`: `OverflowPane: typeof NavigatorOverflowPane`,
`Navigator.OverflowPane = NavigatorOverflowPane`,
`export type { NavigatorOverflowPaneProps } from './NavigatorOverflowPane'`;
remove `Overflow`/`NavigatorOverflowProps`.
`grep -rn "Navigator.Overflow\b\|NavigatorOverflow\b\|NavigatorOverflowProps" packages docs/src`
→ only `OverflowPane`/`OverflowItems` hits remain (docs page is Task 13).

Run: `cd packages/components && pnpm vitest run src/components/Navigator`
Expected: PASS. Existing tests that looked for the generated pane's
`pane-body-title` now look for `pane-title` — update them.

- [ ] **Step 5: Commit**

```bash
git add packages/components/src/components/Navigator packages/components/src/index.tsx
git commit -m "feat(navigator)!: rename Overflow to OverflowPane and make it a list pane at every size"
```

---

## Task 5: Sub-pages open in a generated section pane; the nested rail and the strip go

**Files:**
- Create: `…/Navigator/NavigatorSectionPane.tsx`,
  `NavigatorSecondaryItems.tsx`, `NavigatorSectionPane.test.tsx`
- Modify: `NavigatorSecondary.tsx`, `NavigatorContext.ts`, `NavigatorRoot.tsx`,
  `NavigatorPrimary.tsx`, `NavigatorItem.tsx`, `NavigatorGroup.tsx`,
  `NavigatorContent.tsx`, `useTopPaneChrome.tsx`, `splitSecondary.ts`,
  `variants.ts`, `index.tsx`, `Navigator.test.tsx`
- Modify: `…/Pane/PaneChromeContext.ts`, `…/Pane/PaneHeader.tsx`,
  `…/Pane/Pane.test.tsx`
- Modify: `docs/src/app/debug/rsc-smoke/NavigatorCanary.tsx`
- Delete: `NavigatorPaneChrome.tsx`, `NavigatorPresentationContext.ts`

**Interfaces:**
- Produces:

```ts
// NavigatorSecondaryProps
{ 'aria-label': string; searchable?: boolean; className?: string; children?: ReactNode }
// context (replaces secondaryNav/setSecondaryNav and hasNesting/setHasNesting)
export type NavigatorActiveSection = {
  value: string
  /** The section route; undefined only for a routeless section. */
  href?: string
  label: ReactNode
  secondary: NavigatorSecondaryProps
}
activeSection: NavigatorActiveSection | null
setActiveSection: (next: NavigatorActiveSection | null) => void
// splitSecondary.ts
export function textOf(node: ReactNode): string
// NavigatorSecondaryItems (internal here, public in Task 6)
export type NavigatorSecondaryItemsProps = { className?: string; query?: string }
// the generated pane carries data-navigator-section={section.value}
```

- D8 (never `current`).

- [ ] **Step 1: Write the failing tests**

`NavigatorSectionPane.test.tsx`:

```tsx
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { Navigator } from '.'
import { Pane } from '../Pane'
import { textOf } from './splitSecondary'

async function flushViewportMeasurement() {
  await act(async () => {
    await Promise.resolve()
  })
}

const FakeIcon = () => <svg data-testid='fake-icon' />
const panes = () =>
  Array.from(document.querySelectorAll<HTMLElement>('[data-slot="pane"]'))
const sectionPane = () =>
  document.querySelector<HTMLElement>('[data-slot="pane"][data-navigator-section]')
const rail = () =>
  document.querySelector('[data-slot="navigator-rail"]') as HTMLElement

function Docs({
  value = '/components/button',
  searchable = true,
  detailCurrent = true
}: {
  value?: string
  searchable?: boolean
  detailCurrent?: boolean
}) {
  return (
    <Navigator value={value}>
      <Navigator.Primary aria-label='Docs'>
        <Navigator.Item value='/start' href='/start' icon={<FakeIcon />}>
          Get started
        </Navigator.Item>
        <Navigator.Item value='/components' href='/components' icon={<FakeIcon />}>
          Components
          <Navigator.Secondary aria-label='Components' searchable={searchable}>
            <Navigator.Group>
              <Navigator.GroupTitle>Actions</Navigator.GroupTitle>
              <Navigator.Item value='/components/button' href='/components/button'>
                Button
              </Navigator.Item>
              <Navigator.Item value='/components/icon-button' href='/components/icon-button'>
                Icon button
              </Navigator.Item>
            </Navigator.Group>
            <Navigator.Group>
              <Navigator.GroupTitle>Forms</Navigator.GroupTitle>
              <Navigator.Item value='/components/input' href='/components/input'>
                Input
              </Navigator.Item>
            </Navigator.Group>
          </Navigator.Secondary>
        </Navigator.Item>
      </Navigator.Primary>
      <Navigator.Content>
        <Pane role='detail' current={detailCurrent}>
          Detail
        </Pane>
      </Navigator.Content>
    </Navigator>
  )
}

describe('generated section pane', () => {
  it('leads the stack as a list pane titled with the section label', async () => {
    render(<Docs />)
    await flushViewportMeasurement()
    const pane = sectionPane()!
    expect(panes()[0]).toBe(pane)
    expect(within(pane).getByRole('heading', { name: 'Components', level: 2 })).toHaveAttribute(
      'data-slot',
      'pane-title'
    )
    expect(pane).toHaveAttribute('data-stack-position', 'behind')
    expect(panes()[1]).toHaveAttribute('data-stack-position', 'top')
  })

  it('is the top of the stack when no consumer pane is current', async () => {
    render(<Docs value='/components' detailCurrent={false} />)
    await flushViewportMeasurement()
    expect(sectionPane()).toHaveAttribute('data-stack-position', 'top')
  })

  it('keeps groups and marks the current row', async () => {
    render(<Docs />)
    await flushViewportMeasurement()
    const pane = sectionPane()!
    expect(within(pane).getByText('Actions')).toBeInTheDocument()
    expect(within(pane).getByText('Forms')).toBeInTheDocument()
    expect(within(pane).getByRole('link', { name: 'Button' })).toHaveAttribute(
      'aria-current',
      'page'
    )
    expect(within(pane).getByRole('navigation', { name: 'Components' })).toBeInTheDocument()
  })

  it('lights the section tile as the section, not the page', async () => {
    render(<Docs />)
    await flushViewportMeasurement()
    expect(within(rail()).getByRole('link', { name: 'Components' })).toHaveAttribute(
      'aria-current',
      'true'
    )
  })

  it('never renders sub-pages in the rail', async () => {
    render(<Docs />)
    await flushViewportMeasurement()
    expect(within(rail()).queryByText('Button')).toBeNull()
  })

  it('filters rows by label and hides groups left empty', async () => {
    const user = userEvent.setup()
    render(<Docs />)
    await flushViewportMeasurement()
    const pane = sectionPane()!
    await user.type(within(pane).getByRole('searchbox'), 'inp')
    expect(within(pane).getByRole('link', { name: 'Input' })).toBeInTheDocument()
    expect(within(pane).queryByRole('link', { name: 'Button' })).toBeNull()
    expect(within(pane).queryByText('Actions')).toBeNull()
    await user.clear(within(pane).getByRole('searchbox'))
    await user.type(within(pane).getByRole('searchbox'), 'zzz')
    expect(within(pane).getByText('No matches')).toBeInTheDocument()
  })

  it('offers no search unless the Secondary is searchable', async () => {
    render(<Docs searchable={false} />)
    await flushViewportMeasurement()
    expect(within(sectionPane()!).queryByRole('searchbox')).toBeNull()
  })

  it('mounts only for the active section, and not for a section without Secondary', async () => {
    render(<Docs value='/start' />)
    await flushViewportMeasurement()
    expect(sectionPane()).toBeNull()
  })
})

describe('textOf', () => {
  it('flattens strings, numbers and element children', () => {
    expect(textOf(['Icon ', <b key='b'>button</b>, 2])).toBe('Icon button2')
  })
})
```

Run: `cd packages/components && pnpm vitest run src/components/Navigator/NavigatorSectionPane.test.tsx`
Expected: FAIL — no `[data-navigator-section]` pane; `textOf` missing; the rail
still renders `Button`.

- [ ] **Step 2: `textOf` and the rows**

Append to `splitSecondary.ts`:

```ts
/** The plain text of a label, for search. Icons and other markup contribute nothing. */
export function textOf(node: ReactNode): string {
  if (node == null || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(textOf).join('')
  if (isValidElement<{ children?: ReactNode }>(node)) {
    return textOf(node.props.children)
  }
  return ''
}
```

`NavigatorSecondaryItems.tsx`:

```tsx
'use client'

import {
  Children,
  type ReactElement,
  type ReactNode,
  isValidElement,
  use
} from 'react'

import { List } from '../List'
import { NavigatorContext, isActiveValue } from './NavigatorContext'
import { NavigatorGroup } from './NavigatorGroup'
import { NavigatorGroupTitle } from './NavigatorGroupTitle'
import { NavigatorItem, type NavigatorItemProps } from './NavigatorItem'
import { presentNavIcon } from './presentNavIcon'
import { splitItemChildren, textOf } from './splitSecondary'

export type NavigatorSecondaryItemsProps = {
  className?: string
  /** Filters rows by label, case-insensitive. Groups left empty are hidden. */
  query?: string
}

/** The active section's sub-pages as a `List`, for composing a `Navigator.SecondaryPane`. */
export function NavigatorSecondaryItems({
  className,
  query = ''
}: NavigatorSecondaryItemsProps) {
  const { activeSection, value, setValue } = use(NavigatorContext)
  if (activeSection === null) return null

  const needle = query.trim().toLowerCase()
  const matches = (props: NavigatorItemProps) =>
    needle === '' ||
    textOf(splitItemChildren(props.children).label).toLowerCase().includes(needle)

  const row = (props: NavigatorItemProps) => (
    <List.Item
      key={props.value}
      title={splitItemChildren(props.children).label}
      leading={props.icon ? presentNavIcon(props.icon, false, 'size-5') : undefined}
      trailing={props.badge}
      href={props.href}
      chevron={false}
      current={isActiveValue(props.value, value) && 'page'}
      onClick={() => setValue(props.value)}
    />
  )

  const blocks: ReactNode[] = []
  let shown = 0
  Children.forEach(activeSection.secondary.children, (child, index) => {
    if (!isValidElement(child)) return
    if (child.type === NavigatorItem) {
      const props = child.props as NavigatorItemProps
      if (!matches(props)) return
      shown += 1
      blocks.push(row(props))
      return
    }
    if (child.type !== NavigatorGroup) return
    let title: ReactNode = null
    const rows: ReactNode[] = []
    Children.forEach(
      (child.props as { children?: ReactNode }).children,
      (grandChild) => {
        if (!isValidElement(grandChild)) return
        if (grandChild.type === NavigatorGroupTitle) {
          title = (grandChild as ReactElement<{ children?: ReactNode }>).props.children
        } else if (grandChild.type === NavigatorItem) {
          const props = grandChild.props as NavigatorItemProps
          if (matches(props)) rows.push(row(props))
        }
      }
    )
    if (rows.length === 0) return
    shown += rows.length
    blocks.push(
      <List.Group key={`group-${index}`}>
        {title !== null ? <List.GroupTitle>{title}</List.GroupTitle> : null}
        {rows}
      </List.Group>
    )
  })

  if (shown === 0 && needle !== '') {
    return <p className='px-4 py-3 text-sm text-subtle'>No matches</p>
  }

  return (
    <List data-slot='navigator-secondary-items' className={className}>
      {blocks}
    </List>
  )
}

NavigatorSecondaryItems.displayName = 'Navigator.SecondaryItems'
```

If `List` doesn't forward `data-slot`, wrap nothing — drop the attribute and
select by role in tests. (`presentNavIcon`'s signature drops `active` in Task
10; update this call then.)

- [ ] **Step 3: The generated pane**

`NavigatorSectionPane.tsx`:

```tsx
'use client'

import { useState } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { PaneHeader } from '../Pane/PaneHeader'
import { PaneRoot } from '../Pane/PaneRoot'
import { PaneSearch } from '../Pane/PaneSearch'
import { PaneTitle } from '../Pane/PaneTitle'
import type { NavigatorActiveSection } from './NavigatorContext'
import { NavigatorSecondaryItems } from './NavigatorSecondaryItems'
import { textOf } from './splitSecondary'

// Never `current`: first in the stack, so it is the root.
export function NavigatorSectionPane({
  section
}: {
  section: NavigatorActiveSection
}) {
  const [query, setQuery] = useState('')
  const { label, secondary } = section

  return (
    <PaneRoot role='list' data-navigator-section={section.value}>
      <PaneHeader>
        <PaneTitle>{label}</PaneTitle>
        {secondary.searchable ? (
          <PaneSearch
            value={query}
            onValueChange={setQuery}
            placeholder={`Search ${textOf(label).toLowerCase()}`}
          />
        ) : null}
      </PaneHeader>
      <nav
        aria-label={secondary['aria-label']}
        className={cn('pb-4', secondary.className)}
      >
        <NavigatorSecondaryItems query={query} />
      </nav>
    </PaneRoot>
  )
}

NavigatorSectionPane.displayName = 'NavigatorSectionPane'
```

- [ ] **Step 4: Publish the active section; stop rendering Secondary in the rail**

- `NavigatorSecondary.tsx`: returns `null`; props gain `searchable?: boolean`
  ("Adds a search field to the section's pane that filters rows by label.").
  Rewrite the JSDoc: a declaration read by `Navigator.Primary`; the section's
  sub-pages open in a list pane that `Navigator.Content` generates; override
  one section with `Navigator.SecondaryPane`. Remove `wrapRailRun`.
- `NavigatorContext.ts` / `NavigatorRoot.tsx`: replace `secondaryNav` +
  `hasNesting` (and their setters and the `NavigatorSecondaryNav` type) with
  `activeSection` / `setActiveSection` typed as above.
- `NavigatorPrimary.tsx`: the `activeSecondary` memo becomes `activeSection`,
  returning `{ value: itemProps.value, href: itemProps.href, label, secondary: nested.props }` for the
  first branch-active item with a Secondary (use `splitItemChildren` for
  `label`). The publishing effect calls `setActiveSection(activeSection)`.
  Delete `nests`, `setHasNesting`, `form` and `data-form`; the rail's class call
  becomes `navigatorRailVariants()`.
- `variants.ts`: `navigatorRailVariants` loses its `form` variant and uses
  `w-(--navigator-rail-nested)` until Task 8 replaces it. Delete
  `navigatorSecondaryVariants`, `navigatorChevronVariants`,
  `navigatorSecondaryStripVariants`, `navigatorSecondaryStripViewportVariants`,
  `navigatorSecondaryStripContentVariants`, the `strip` surface of
  `navigatorIndicatorVariants` (and `'strip'` from
  `NavigatorIndicatorSurface`), and the `tabsIndicatorSurfaceClass` /
  `tabsListVariants` import. Remove every `group-data-[form=compact]/rail:`
  class in the file.
- `NavigatorItem.tsx`: delete the chevron, the `isSection && isBranch ?
  secondary : null` render, the `presentation === 'strip'` branch and the
  `NavigatorPresentationContext`/`tabsTabVariants` imports. Currency collapses
  to two states — `active = isBranch` (a section is lit anywhere inside it) —
  and `aria-current` becomes `isCurrent ? 'page' : isBranch ? 'true' : undefined`.
  `navigatorItemVariants`' `state` variant becomes
  `active: { true: 'text-strong [&_[data-slot=navigator-item-icon]]:text-accent-11', false: 'text-subtle hover:bg-subtle' }`
  for now (Task 10 replaces the raw step).
- `NavigatorGroup.tsx`: delete the `strip` branch and its context import.
- `useTopPaneChrome.tsx`: delete `stripElement` and `headerExtras`; return
  `{ onViewportScroll, registerScroller }`.
- `Pane/PaneChromeContext.ts`: remove `headerExtras` from the type and from
  `PANE_CHROME_NONE`. `Pane/PaneHeader.tsx`: drop the `headerExtras` read and
  the `noChrome` term — `hasOtherContent = children != null || bodyTitle !== null`
  — and its render of `headerExtras`. Fix the comment above it.
- `NavigatorContent.tsx`: render the generated pane first, not while More is
  open (D5):

```tsx
  const { activeSection, overflowOpen } = use(NavigatorContext)
  const sectionPane =
    activeSection !== null && !overflowOpen ? (
      <NavigatorSectionPane key={activeSection.value} section={activeSection} />
    ) : null
  …
        <PaneContext value={null}>
          {sectionPane}
          {children}
          {fallbackOverflow}
        </PaneContext>
```

  `key` resets the search when the section changes.
- `git rm …/NavigatorPaneChrome.tsx …/NavigatorPresentationContext.ts`.
- `index.tsx`: remove the deleted variants from the export list.
- `NavigatorCanary.tsx`: the check that throws unless `data-form === 'nested'`
  and the one that looks for `[data-slot=navigator-secondary]
  [data-slot=navigator-group-list]` are replaced by one that throws unless a
  `[data-navigator-section] [data-slot="list-group"]` (List's group slot —
  confirm the name in `List/ListGroup.tsx`) exists after mount; give the canary
  a `Navigator.Content` and put its value on a sub-page so the pane mounts.

Run: `cd packages/components && pnpm vitest run src/components/Navigator/NavigatorSectionPane.test.tsx`
Expected: PASS.

- [ ] **Step 5: Migrate the old suites**

`Navigator.test.tsx` (plan-time line numbers; search by describe):

- **Delete**: form tests in `Navigator rail form` (≈814-869);
  `section chevron` (≈1235-1279); the tree-line accent tests in
  `active-state split` (≈1331-1374); strip and nested tests in
  `sliding indicator` (≈2286-2346, ≈2361-2479); `strip indicator surface`
  (≈2482-2496); in `Navigator.Secondary` the strip tests (≈2532-2557,
  2594-2606, 2631-2685) and nested-rail tests (≈2579-2592, 2608-2629,
  2687-2709); `rail list semantics`' nested li test (≈2798-2822);
  `Navigator.Group`'s strip test (≈2929-2957); `section nav in the pane
  header` strip tests (≈4016-4074).
- **Rewrite against the generated pane**: `pane stack` ≈169-252 (strip →
  section pane rows), `routeless primary` ≈1101-1128, `Navigator.Secondary`
  ≈2559-2577 and ≈2711-2771, `Primary group descent` ≈2981-3009,
  `descendant-aware active matching` ≈3355-3421 (sub-page rows and the
  `Components pages` nav now live in `sectionPane()`), `route-prefix section
  matching` ≈3504-3512, `nesting acceptance criteria` ≈4395-4428.
- **Pane-index shifts**: any test with a Secondary and a `Navigator.Content`
  now has the generated pane at index 0. Fix `panes()[n]`,
  `querySelectorAll('[data-slot="pane"]')[n]` and `scrollerOf` (first
  `pane-viewport`) in ≈3929-4013, ≈4076-4140 and the sites above.
- Remove the `navigatorSecondaryStripViewportVariants`,
  `tabsIndicatorSurfaceClass` and `tabsIndicatorVariants` imports and the
  `offsetParent` guard's use of the strip variant (≈4692-4706 — keep the test,
  point it at `navigatorRailViewportVariants`).

`Pane.test.tsx`: delete the `headerExtras` test in `orchestrator chrome`
(≈993-1004); `withChrome` fixtures drop `headerExtras`.

`grep -rn "strip\|nested\|data-form\|headerExtras\|secondaryNav\|hasNesting" packages/components/src/components/{Navigator,Pane}`
→ only unrelated words (e.g. "stripped") remain. Fix any comment that still
describes the deleted behaviour.

Run: `cd packages/components && pnpm vitest run src/components/Navigator src/components/Pane`
Expected: PASS. Act warnings: `Navigator.test.tsx` ≤ 2, `Pane.test.tsx` ≤ 2,
`NavigatorSectionPane.test.tsx` 0. If a generated pane's ScrollArea adds a
warning to an old test, add `await flushViewportMeasurement()` there.

- [ ] **Step 6: Commit**

```bash
git add packages/components/src/components/Navigator packages/components/src/components/Pane \
  docs/src/app/debug/rsc-smoke/NavigatorCanary.tsx
git commit -m "feat(navigator)!: open sub-pages in a generated section pane; remove the nested rail and strip"
```

---

## Task 6: `Navigator.SecondaryPane` and `Navigator.SecondaryItems`

**Files:**
- Create: `…/Navigator/NavigatorSecondaryPane.tsx`
- Modify: `NavigatorContext.ts`, `NavigatorRoot.tsx`, `NavigatorContent.tsx`,
  `index.tsx`, `NavigatorSectionPane.test.tsx`,
  `packages/components/src/index.tsx`

**Interfaces:**
- Consumes: `NavigatorSecondaryItems` (Task 5).
- Produces:

```ts
export type NavigatorSecondaryPaneProps = Omit<
  PaneRootProps,
  'role' | 'current' | 'primaryNav' | 'id'
> & { /** The section this pane replaces the generated pane for. */ value: string }
// context
declaredSecondaryPanes: ReadonlySet<string>
declareSecondaryPane: (value: string) => () => void // returns the undeclare
```

Mirrors `OverflowPane` + `OverflowItems`: a synchronous children scan catches
the unwrapped case on first render; the registration catches a wrapped one
after mount (D12: `SecondaryItems` takes `query`).

- [ ] **Step 1: Write the failing tests**

Append to `NavigatorSectionPane.test.tsx`:

```tsx
function Override({ wrapped = false }: { wrapped?: boolean }) {
  const pane = (
    <Navigator.SecondaryPane value='/components'>
      <p>Promo</p>
      <Navigator.SecondaryItems query='in' />
    </Navigator.SecondaryPane>
  )
  const Wrapper = ({ children }: { children: React.ReactNode }) => <>{children}</>
  return (
    <Navigator value='/components/button'>
      <Navigator.Primary aria-label='Docs'>
        <Navigator.Item value='/components' href='/components'>
          Components
          <Navigator.Secondary aria-label='Components'>
            <Navigator.Item value='/components/button' href='/components/button'>Button</Navigator.Item>
            <Navigator.Item value='/components/input' href='/components/input'>Input</Navigator.Item>
          </Navigator.Secondary>
        </Navigator.Item>
        <Navigator.Item value='/start' href='/start'>Start</Navigator.Item>
      </Navigator.Primary>
      <Navigator.Content>
        {wrapped ? <Wrapper>{pane}</Wrapper> : pane}
        <Pane role='detail' current>Detail</Pane>
      </Navigator.Content>
    </Navigator>
  )
}

describe('Navigator.SecondaryPane', () => {
  it("replaces that section's generated pane", async () => {
    render(<Override />)
    await flushViewportMeasurement()
    const lists = document.querySelectorAll('[data-navigator-section]')
    expect(lists).toHaveLength(1)
    expect(within(lists[0] as HTMLElement).getByText('Promo')).toBeInTheDocument()
  })

  it('filters SecondaryItems by query', async () => {
    render(<Override />)
    await flushViewportMeasurement()
    const pane = sectionPane()!
    expect(within(pane).getByRole('link', { name: 'Input' })).toBeInTheDocument()
    expect(within(pane).queryByRole('link', { name: 'Button' })).toBeNull()
  })

  it('still suppresses the generated pane when wrapped', async () => {
    render(<Override wrapped />)
    await flushViewportMeasurement()
    expect(document.querySelectorAll('[data-navigator-section]')).toHaveLength(1)
    expect(screen.getByText('Promo')).toBeInTheDocument()
  })

  it('renders nothing while its section is not active', async () => {
    const { rerender } = render(<Override />)
    await flushViewportMeasurement()
    rerender(
      <Navigator value='/start'>
        <Navigator.Primary aria-label='Docs'>
          <Navigator.Item value='/start' href='/start'>Start</Navigator.Item>
        </Navigator.Primary>
        <Navigator.Content>
          <Navigator.SecondaryPane value='/components'><p>Promo</p></Navigator.SecondaryPane>
        </Navigator.Content>
      </Navigator>
    )
    await flushViewportMeasurement()
    expect(screen.queryByText('Promo')).toBeNull()
  })
})
```

Run the file. Expected: FAIL — `Navigator.SecondaryPane` undefined.

- [ ] **Step 2: Implement**

`NavigatorSecondaryPane.tsx`:

```tsx
'use client'

import { use, useEffect } from 'react'

import { PaneRoot, type PaneRootProps } from '../Pane/PaneRoot'
import { NavigatorContext } from './NavigatorContext'

export type NavigatorSecondaryPaneProps = Omit<
  PaneRootProps,
  'role' | 'current' | 'primaryNav' | 'id'
> & {
  /** The section value whose generated pane this replaces. */
  value: string
}

/** Replaces one section's generated list pane; declare it before your detail pane. */
export function NavigatorSecondaryPane({
  value,
  ...props
}: NavigatorSecondaryPaneProps) {
  const { activeSection, overflowOpen, declareSecondaryPane } =
    use(NavigatorContext)

  useEffect(() => declareSecondaryPane(value), [value, declareSecondaryPane])

  if (activeSection?.value !== value || overflowOpen) return null
  return <PaneRoot role='list' data-navigator-section={value} {...props} />
}

NavigatorSecondaryPane.displayName = 'Navigator.SecondaryPane'
```

`NavigatorRoot.tsx`:

```tsx
  const [declaredSecondaryPanes, setDeclared] = useState<ReadonlySet<string>>(
    () => new Set()
  )
  const declareSecondaryPane = useCallback((value: string) => {
    setDeclared((current) => new Set(current).add(value))
    return () =>
      setDeclared((current) => {
        const next = new Set(current)
        next.delete(value)
        return next
      })
  }, [])
```

(add both to the context value and its type, defaults `new Set()` / `() => () => {}`).

`NavigatorContent.tsx`:

```tsx
  const overridden =
    activeSection !== null &&
    (declaredSecondaryPanes.has(activeSection.value) ||
      Children.toArray(children).some(
        (child) =>
          isValidElement<{ value?: string }>(child) &&
          child.type === NavigatorSecondaryPane &&
          child.props.value === activeSection.value
      ))
  const sectionPane =
    activeSection !== null && !overflowOpen && !overridden ? (…) : null
```

`index.tsx`: `SecondaryPane`, `SecondaryItems` attachments and
`export type { NavigatorSecondaryPaneProps }`,
`export type { NavigatorSecondaryItemsProps }`; barrel adds both types.

Run: `cd packages/components && pnpm vitest run src/components/Navigator`
Expected: PASS, 0 act warnings in `NavigatorSectionPane.test.tsx`.

- [ ] **Step 3: Commit**

```bash
git add packages/components/src/components/Navigator packages/components/src/index.tsx
git commit -m "feat(navigator): override a section's pane with SecondaryPane and SecondaryItems"
```

---

## Task 7: Section routes decide depth; Back links to the section; `showList` (D7)

**Files:**
- Modify: `…/Navigator/paneStack.ts`, `paneStack.test.ts`,
  `NavigatorContext.ts`, `NavigatorRoot.tsx`, `NavigatorContent.tsx`,
  `useTopPaneChrome.tsx`, `NavigatorPrimary.tsx`, `NavigatorItem.tsx`,
  `NavigatorSectionPane.test.tsx`, `Navigator.test.tsx`
- Modify: `…/Pane/PaneChromeContext.ts`, `…/Pane/PaneHeader.tsx`,
  `…/Pane/Pane.test.tsx`

**Interfaces:**
- Consumes: `NavigatorActiveSection.href` (Task 5).
- Produces:

```ts
// paneStack.ts
export function deriveTopIndex(entries: readonly PaneEntry[], revealRoot?: boolean): number
export function derivePositions(entries: readonly PaneEntry[], revealRoot?: boolean): (PaneStackPosition | null)[]
// PaneChromeContextValue gains
backHref?: string // orchestrator-supplied Back link; the header's own backHref/onBack win
// NavigatorRootProps gains (D7c)
showList?: boolean
onShowListChange?: (next: boolean) => void
// context
showList: boolean
onShowListChange?: (next: boolean) => void
stackAtRoot: boolean
setStackAtRoot: (next: boolean) => void // published by Content
```

The URL is the only source of truth for depth. Navigator derives "list on top"
from the value (the section route) or from `showList` (which the app derives
from its URL); it never holds that state itself.

- [ ] **Step 1: Failing pure tests**

Append to `paneStack.test.ts`:

```ts
describe('revealRoot', () => {
  const list = { role: 'list', current: false, primaryNav: 'auto' } as const
  const detail = { role: 'detail', current: true, primaryNav: 'auto' } as const
  const inspector = { role: 'inspector', current: false, primaryNav: 'auto' } as const

  it('makes the root the top and everything after it ahead', () => {
    expect(derivePositions([list, detail], true)).toEqual(['top', 'ahead'])
  })

  it('skips a leading inspector', () => {
    expect(derivePositions([inspector, list, detail], true)).toEqual([
      null,
      'top',
      'ahead'
    ])
  })

  it('changes nothing when off', () => {
    expect(derivePositions([list, detail])).toEqual(['behind', 'top'])
  })
})
```

Run: `cd packages/components && pnpm vitest run src/components/Navigator/paneStack.test.ts`
Expected: FAIL.

- [ ] **Step 2: Implement the pure change**

```ts
export function deriveTopIndex(
  entries: readonly PaneEntry[],
  revealRoot = false
): number {
  if (revealRoot) {
    const root = deriveRootIndex(entries)
    if (root !== -1) return root
  }
  // existing loop unchanged
}

export function derivePositions(
  entries: readonly PaneEntry[],
  revealRoot = false
): (PaneStackPosition | null)[] {
  const top = deriveTopIndex(entries, revealRoot)
  // existing map unchanged
}
```

`deriveTopIndex`'s JSDoc gains: "…or the root, when the orchestrator reveals it
— on a section's own route, or when the app asks for the list (`showList`)."
Run: PASS.

- [ ] **Step 3: Failing integration tests**

Append to `NavigatorSectionPane.test.tsx`:

```tsx
function Routed({
  value,
  showList,
  onShowListChange,
  detailBackHref
}: {
  value: string
  showList?: boolean
  onShowListChange?: (next: boolean) => void
  detailBackHref?: string
}) {
  return (
    <Navigator value={value} showList={showList} onShowListChange={onShowListChange}>
      <Navigator.Primary aria-label='Docs'>
        <Navigator.Item value='/components' href='/components'>
          Components
          <Navigator.Secondary aria-label='Components'>
            <Navigator.Item value='/components/a' href='/components/a'>A</Navigator.Item>
            <Navigator.Item value='/components/b' href='/components/b'>B</Navigator.Item>
          </Navigator.Secondary>
        </Navigator.Item>
      </Navigator.Primary>
      <Navigator.Content>
        <Pane role='detail' current>
          <Pane.Header backHref={detailBackHref} />
          Detail
        </Pane>
      </Navigator.Content>
    </Navigator>
  )
}

const tabBar = () =>
  document.querySelector('[data-slot="navigator-tab-bar"]') as HTMLElement

describe('section routes', () => {
  it('puts the list on top on the section route, even with a current detail', async () => {
    render(<Routed value='/components' />)
    await flushViewportMeasurement()
    expect(sectionPane()).toHaveAttribute('data-stack-position', 'top')
    expect(panes()[1]).toHaveAttribute('data-stack-position', 'ahead')
  })

  it('puts the page on top on a sub-page, with Back linking to the section route', async () => {
    render(<Routed value='/components/a' />)
    await flushViewportMeasurement()
    const detail = panes()[1]!
    expect(detail).toHaveAttribute('data-stack-position', 'top')
    expect(within(detail).getByRole('link', { name: 'Back' })).toHaveAttribute(
      'href',
      '/components'
    )
  })

  it("lets a consumer's backHref win", async () => {
    render(<Routed value='/components/a' detailBackHref='/elsewhere' />)
    await flushViewportMeasurement()
    expect(within(panes()[1]!).getByRole('link', { name: 'Back' })).toHaveAttribute(
      'href',
      '/elsewhere'
    )
  })

  it('shows the list over a sub-page while showList is set', async () => {
    render(<Routed value='/components/a' showList />)
    await flushViewportMeasurement()
    expect(sectionPane()).toHaveAttribute('data-stack-position', 'top')
    expect(within(sectionPane()!).getByRole('link', { name: 'A' })).toHaveAttribute(
      'aria-current',
      'page'
    )
  })

  it('links the active tab to the section route when showList is not wired', async () => {
    render(<Routed value='/components/a' />)
    await flushViewportMeasurement()
    expect(within(tabBar()).getByRole('link', { name: 'Components' })).toHaveAttribute(
      'href',
      '/components'
    )
  })

  it('asks for the list instead when onShowListChange is wired', async () => {
    const user = userEvent.setup()
    const onShowListChange = vi.fn()
    render(<Routed value='/components/a' onShowListChange={onShowListChange} />)
    await flushViewportMeasurement()
    await user.click(within(tabBar()).getByRole('link', { name: 'Components' }))
    expect(onShowListChange).toHaveBeenCalledWith(true)
  })

  it('asks to hide the list when the active tab is tapped again', async () => {
    const user = userEvent.setup()
    const onShowListChange = vi.fn()
    render(<Routed value='/components/a' showList onShowListChange={onShowListChange} />)
    await flushViewportMeasurement()
    await user.click(within(tabBar()).getByRole('link', { name: 'Components' }))
    expect(onShowListChange).toHaveBeenCalledWith(false)
  })

  it('links an inactive section tab to its route, never a remembered page', async () => {
    const { rerender } = render(<Routed value='/components/b' />)
    await flushViewportMeasurement()
    rerender(
      <Navigator value='/other'>
        <Navigator.Primary aria-label='Docs'>
          <Navigator.Item value='/components' href='/components'>
            Components
            <Navigator.Secondary aria-label='Components'>
              <Navigator.Item value='/components/b' href='/components/b'>B</Navigator.Item>
            </Navigator.Secondary>
          </Navigator.Item>
          <Navigator.Item value='/other' href='/other'>Other</Navigator.Item>
        </Navigator.Primary>
      </Navigator>
    )
    await flushViewportMeasurement()
    expect(within(tabBar()).getByRole('link', { name: 'Components' })).toHaveAttribute(
      'href',
      '/components'
    )
  })

  it('warns when a section has no route', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(
      <Navigator value='/x/one'>
        <Navigator.Primary aria-label='Docs'>
          <Navigator.Item value='/x'>
            X
            <Navigator.Secondary aria-label='X pages'>
              <Navigator.Item value='/x/one' href='/x/one'>One</Navigator.Item>
            </Navigator.Secondary>
          </Navigator.Item>
        </Navigator.Primary>
      </Navigator>
    )
    await flushViewportMeasurement()
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('its own route'))
    warn.mockRestore()
  })
})
```

Add `vi` to the file's vitest import. In `Pane.test.tsx`'s `orchestrator
chrome` describe, using its `withChrome` helper (≈931-945; adapt to its actual
signature):

```tsx
  it('draws a Back link from orchestrator chrome, never a Close', async () => {
    render(
      withChrome(
        <Pane role='detail'>
          <Pane.Header />
        </Pane>,
        { onViewportScroll: () => {}, registerScroller: () => {}, backHref: '/section' }
      )
    )
    await flushViewportMeasurement()
    expect(screen.getByRole('link', { name: 'Back' })).toHaveAttribute('href', '/section')
    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull()
  })
```

Run both files. Expected: FAIL.

The existing section-memory tests in `Navigator.test.tsx`
(`per-section stack memory`, ≈4449-4522) that expect a Secondary section's tab
to retarget to a remembered page contradict D7a — rewrite them onto an item
*without* a Secondary sitting over un-declared sub-routes (the case memory
still serves), and keep one assertion that a Secondary section is never
retargeted.

- [ ] **Step 4: Implement**

- `PaneChromeContext.ts`: add `backHref?: string` with the comment "An
  orchestrator's Back link — the section route above a sub-page. The header's
  own `backHref` and `onBack` still win."
- `PaneHeader.tsx`:

```tsx
  const chrome = use(PaneChromeContext)
  // A consumer's onBack is a handler and outranks the orchestrator's link.
  const resolvedBackHref = backHref ?? (onBack === undefined ? chrome.backHref : undefined)
  const hasTarget = resolvedBackHref !== undefined || onBack !== undefined
```

  render the Back `IconButton` with `href={resolvedBackHref}` in the link
  branch; `closeHandler` stays `onClose ?? onBack` (a link never supplies
  Close).
- `NavigatorRoot.tsx`: accept `showList` and `onShowListChange` (JSDoc as in
  D7c), expose `showList: showList ?? false` and `onShowListChange` on context,
  plus `const [stackAtRoot, setStackAtRoot] = useState(true)`.
- `NavigatorContent.tsx`:

```tsx
  const onSectionRoute =
    activeSection !== null && isActiveValue(activeSection.value, value)
  const revealing =
    activeSection !== null && !overflowOpen && (onSectionRoute || showList)
  const positions = useMemo(
    () => derivePositions(ordered, revealing),
    [ordered, revealing]
  )
  const atRoot = topIndex === rootIndex
  useEffect(() => {
    setStackAtRoot(atRoot)
  }, [atRoot, setStackAtRoot])
```

  (keep `latest.current` fed from the new `positions`).
- `useTopPaneChrome.tsx`: when `activeSection?.href !== undefined &&
  !overflowOpen && !stackAtRoot`, include `backHref: activeSection.href` in the
  memoised value.
- Section tabs and tiles (`NavigatorPrimary` for tabs, `NavigatorItem` for rail
  tiles): an item whose slot has `descendants.length > 0` links to its declared
  `href` (D7a), not `rememberedHref(…)`; items without a Secondary keep
  `rememberedHref`. Delete the `rememberSection` effect's recording for
  branch sections that own a Secondary (they don't need it); keep it for the
  prefix-matched case.
- `selectDestination`, on an active, expanded tab that owns the active section:

```ts
    const ownsSection = activeSection?.value === tab.value
    if (ownsSection && onShowListChange && !isActiveValue(tab.value, activeValue)) {
      event.preventDefault()
      onShowListChange(!showList)
      return
    }
    if (ownsSection && isActiveValue(tab.value, activeValue)) {
      event.preventDefault()
      scrollActivePaneToTop()
      return
    }
```

  Without `onShowListChange`, the tab's `href` is the section route, so the
  link navigates there by itself — no manual branch needed. Sections without a
  Secondary keep today's landing/scroll behaviour.
- D7b warning in `NavigatorPrimary` (effect, `isDev()`), listing every item
  with descendants and no `href`:

```ts
  const routeless = [...collected.automatic, ...collected.pinnedSlots]
    .filter((slot) => slot.descendants.length > 0 && slot.declaredHref === undefined)
    .map((slot) => slot.value)
    .join(', ')
  useEffect(() => {
    if (!isDev() || routeless === '') return
    console.warn(
      `[Roadie] Navigator.Item ${routeless} declares a Navigator.Secondary ` +
        'but no href. Every section needs its own route: it shows the ' +
        "section's list pane, and it is where Back goes from a sub-page."
    )
  }, [routeless])
```

  `NavigatorSlotMeta` gains `declaredHref?: string` (the item's own `href`,
  set in `toSlotMeta`), because `href` there already falls back to the first
  sub-page.

Run: `cd packages/components && pnpm vitest run src/components/Navigator src/components/Pane`
Expected: PASS. The `active-tab tap: scroll vs navigate-up` describe
(≈3929-4013) needs its expectations for Secondary sections updated: the tab
now links to the section route, and with `onShowListChange` wired it calls it.

- [ ] **Step 5: Commit**

```bash
git add packages/components/src/components/Navigator packages/components/src/components/Pane
git commit -m "feat(navigator): section routes decide depth; Back links to the section; showList"
```

---

## Task 8: The capsule rail — brand, centred cluster, pinned — and capacity from height

**Files:**
- Create: `…/Navigator/railCapacity.ts`, `railCapacity.test.ts`,
  `useRailCapacity.ts`, `capsules.tsx`, `NavigatorFoldedContext.ts`,
  `NavigatorRail.test.tsx`
- Modify: `NavigatorPrimary.tsx`, `NavigatorGroup.tsx`, `NavigatorGroupTitle.tsx`,
  `NavigatorItem.tsx`, `NavigatorBrand.tsx`, `variants.ts`, `index.tsx`,
  `Navigator.test.tsx`
- Modify: `packages/core/src/css/layout.css`
- Modify: `docs/src/components/Navigation.tsx` (Brand wordmark class only)
- Delete: `…/Navigator/railList.tsx`

**Interfaces:**
- Consumes: `collectSlots` / `RailEntry` (Task 2), `rankSlots` (Task 1),
  `setOverflowItems('rail', …)` (Task 4).
- Produces:

```ts
// railCapacity.ts — rem throughout
export const RAIL_METRICS: { tile: 3; tileGap: 0.25; capsulePad: 0.25; capsuleGap: 0.75; clusterPad: 0.5 }
export type RailMetrics = typeof RAIL_METRICS
export type RailCapsule = { key: string; slots: { value: string; priority: NavigatorVisibilityPriority }[] }
export function capsuleHeight(tiles: number, metrics?: RailMetrics): number
export function clusterHeight(tileCounts: number[], metrics?: RailMetrics): number
export function fitRailCluster(
  capsules: RailCapsule[],
  available: number,          // rem; <= 0 means unmeasured → fold nothing
  fixed?: number[],           // never-folding capsules (tile counts)
  metrics?: RailMetrics
): { folded: Set<string> }
// capsules.tsx
export function railCapsules(entries: RailEntry[]): RailCapsule[]
export function wrapCapsules(entries: RailEntry[], folded: ReadonlySet<string>): ReactNode[]
// useRailCapacity.ts
export function useRailCapacity(
  viewportRef: RefObject<HTMLElement | null>,
  capsules: RailCapsule[],
  fixed: number[],
  enabled: boolean
): ReadonlySet<string>
// DOM
// [data-slot=navigator-rail][data-expanded] > [data-slot=navigator-rail-brand]
//   + [data-slot=navigator-rail-cluster] (ScrollArea; viewport [data-slot=navigator-rail-cluster-viewport])
//   + [data-slot=navigator-rail-pinned]
// every capsule: <ul data-slot='navigator-capsule'>
```

- D2, D9, D10, D11.

- [ ] **Step 1: Failing pure tests**

`railCapacity.test.ts` (worked numbers: a capsule of n tiles is
`3n + 0.25(n−1) + 0.5` rem; the cluster adds `0.75` between capsules and `1`
of padding):

```ts
import { describe, expect, it } from 'vitest'

import {
  RAIL_METRICS,
  capsuleHeight,
  clusterHeight,
  fitRailCluster
} from './railCapacity'
import {
  navigatorCapsuleVariants,
  navigatorItemVariants,
  navigatorRailClusterContentVariants
} from './variants'

const s = (value: string, priority: 'low' | 'automatic' | 'high' = 'automatic') => ({
  value,
  priority
})
const folded = (result: { folded: Set<string> }) => [...result.folded].sort()

describe('rail arithmetic', () => {
  it('measures capsules and the cluster', () => {
    expect(capsuleHeight(1)).toBe(3.5)
    expect(capsuleHeight(5)).toBe(16.5)
    expect(clusterHeight([2, 3])).toBe(6.75 + 10 + 0.75 + 1)
    expect(clusterHeight([2, 0])).toBe(6.75 + 1)
  })

  it('folds nothing when everything fits', () => {
    expect(folded(fitRailCluster([{ key: 'r', slots: 'abcde'.split('').map((v) => s(v)) }], 17.5))).toEqual([])
  })

  it('folds two, not one, when the More tile costs more than a tile saves', () => {
    expect(
      folded(fitRailCluster([{ key: 'r', slots: 'abcde'.split('').map((v) => s(v)) }], 17.4))
    ).toEqual(['d', 'e'])
  })

  it('folds lowest rank first, across capsules', () => {
    expect(
      folded(
        fitRailCluster(
          [
            { key: 'g1', slots: [s('a'), s('b')] },
            { key: 'g2', slots: [s('c'), s('d'), s('e', 'low')] }
          ],
          18
        )
      )
    ).toEqual(['d', 'e'])
  })

  it('keeps a high-priority item even when it is last', () => {
    expect(
      folded(fitRailCluster([{ key: 'r', slots: [s('a'), s('b'), s('c', 'high')] }], 10.5))
    ).toEqual(['a', 'b'])
  })

  it('drops an emptied capsule and its gap from the arithmetic', () => {
    expect(
      folded(
        fitRailCluster(
          [
            { key: 'g1', slots: [s('a'), s('b'), s('c')] },
            { key: 'g2', slots: [s('d', 'low')] }
          ],
          12
        )
      )
    ).toEqual(['c', 'd'])
  })

  it('counts a fixed capsule it can never fold', () => {
    const capsules = [{ key: 'r', slots: [s('a'), s('b')] }]
    expect(folded(fitRailCluster(capsules, 12, [1]))).toEqual([])
    expect(folded(fitRailCluster(capsules, 11.9, [1]))).toEqual(['a', 'b'])
  })

  it('folds nothing while unmeasured', () => {
    expect(folded(fitRailCluster([{ key: 'r', slots: [s('a')] }], 0))).toEqual([])
  })

  it('matches the classes that draw the rail', () => {
    expect(RAIL_METRICS).toEqual({
      tile: 3,
      tileGap: 0.25,
      capsulePad: 0.25,
      capsuleGap: 0.75,
      clusterPad: 0.5
    })
    expect(navigatorItemVariants()).toContain('size-12')
    expect(navigatorCapsuleVariants()).toContain('p-1')
    expect(navigatorCapsuleVariants()).toContain('gap-1')
    expect(navigatorRailClusterContentVariants()).toContain('gap-3')
    expect(navigatorRailClusterContentVariants()).toContain('py-2')
  })
})
```

Run: `cd packages/components && pnpm vitest run src/components/Navigator/railCapacity.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 2: Implement `railCapacity.ts`**

```ts
import { type NavigatorVisibilityPriority, rankSlots } from './mobileSlots'

// Mirrors the rail's classes — size-12 tiles, a capsule's p-1 and gap-1, the
// cluster's gap-3 and py-2. `railCapacity.test.ts` pins the pairing.
export const RAIL_METRICS = {
  tile: 3,
  tileGap: 0.25,
  capsulePad: 0.25,
  capsuleGap: 0.75,
  clusterPad: 0.5
} as const

export type RailMetrics = typeof RAIL_METRICS

export type RailCapsule = {
  key: string
  slots: { value: string; priority: NavigatorVisibilityPriority }[]
}

export function capsuleHeight(tiles: number, m: RailMetrics = RAIL_METRICS) {
  if (tiles <= 0) return 0
  return tiles * m.tile + (tiles - 1) * m.tileGap + 2 * m.capsulePad
}

export function clusterHeight(counts: number[], m: RailMetrics = RAIL_METRICS) {
  const present = counts.filter((n) => n > 0)
  return (
    present.reduce((sum, n) => sum + capsuleHeight(n, m), 0) +
    Math.max(0, present.length - 1) * m.capsuleGap +
    2 * m.clusterPad
  )
}

export function fitRailCluster(
  capsules: RailCapsule[],
  available: number,
  fixed: number[] = [],
  m: RailMetrics = RAIL_METRICS
): { folded: Set<string> } {
  const all = capsules.flatMap((capsule) => capsule.slots)
  if (available <= 0) return { folded: new Set() }
  const ranked = rankSlots(all)
  for (let keep = all.length; keep >= 0; keep -= 1) {
    const kept = new Set(ranked.slice(0, keep).map((slot) => slot.value))
    const counts = capsules.map(
      (capsule) => capsule.slots.filter((slot) => kept.has(slot.value)).length
    )
    const more = keep < all.length ? [1] : []
    if (clusterHeight([...counts, ...fixed, ...more], m) <= available) {
      return {
        folded: new Set(all.filter((slot) => !kept.has(slot.value)).map((slot) => slot.value))
      }
    }
  }
  return { folded: new Set(all.map((slot) => slot.value)) }
}
```

The metrics-vs-classes test still fails until step 4 adds the variants. Run:
the arithmetic tests PASS.

- [ ] **Step 3: Failing rail tests**

`NavigatorRail.test.tsx`:

```tsx
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Navigator } from '.'

async function flushViewportMeasurement() {
  await act(async () => {
    await Promise.resolve()
  })
}

const FakeIcon = () => <svg data-testid='fake-icon' />
const rail = () => document.querySelector('[data-slot="navigator-rail"]') as HTMLElement
const region = (name: string) =>
  rail().querySelector(`[data-slot="navigator-rail-${name}"]`) as HTMLElement

// Only the cluster viewport's observer is driven; every other observer (the
// ScrollArea's, the indicator's) stays inert so their callbacks never see a
// fabricated entry.
const observers = new Map<Element, ResizeObserverCallback>()
class StubResizeObserver {
  constructor(private callback: ResizeObserverCallback) {}
  observe(target: Element) {
    observers.set(target, this.callback)
  }
  unobserve() {}
  disconnect() {}
}
const reportClusterHeight = (px: number) => {
  const viewport = rail().querySelector('[data-slot="navigator-rail-cluster-viewport"]')!
  act(() =>
    observers.get(viewport)?.(
      [{ contentRect: { height: px } } as ResizeObserverEntry],
      {} as ResizeObserver
    )
  )
}

beforeEach(() => {
  observers.clear()
  vi.stubGlobal('ResizeObserver', StubResizeObserver)
})
afterEach(() => vi.unstubAllGlobals())

function Six({ value = '/a', lowGroup = false }: { value?: string; lowGroup?: boolean }) {
  return (
    <Navigator value={value}>
      <Navigator.Primary aria-label='Main'>
        <Navigator.Brand>Logo</Navigator.Brand>
        {['/a', '/b', '/c', '/d'].map((v) => (
          <Navigator.Item key={v} value={v} href={v} icon={<FakeIcon />}>
            {v}
          </Navigator.Item>
        ))}
        <Navigator.Group visibilityPriority={lowGroup ? 'low' : undefined}>
          <Navigator.GroupTitle>Extra</Navigator.GroupTitle>
          <Navigator.Item value='/e' href='/e' icon={<FakeIcon />}>/e</Navigator.Item>
          <Navigator.Item value='/f' href='/f' icon={<FakeIcon />}>/f</Navigator.Item>
        </Navigator.Group>
        <Navigator.Item value='/me' href='/me' icon={<FakeIcon />} placement='pinned'>
          Me
        </Navigator.Item>
      </Navigator.Primary>
      <Navigator.Content />
    </Navigator>
  )
}

describe('rail regions', () => {
  it('puts brand on top, the cluster between, pinned at the bottom', async () => {
    render(<Six />)
    await flushViewportMeasurement()
    const children = Array.from(rail().children).map((el) => el.getAttribute('data-slot'))
    expect(children).toEqual([
      'navigator-rail-brand',
      'navigator-rail-cluster',
      'navigator-rail-pinned'
    ])
    expect(within(region('brand')).getByText('Logo')).toBeInTheDocument()
    expect(within(region('pinned')).getByRole('link', { name: 'Me' })).toBeInTheDocument()
    expect(within(region('cluster')).queryByRole('link', { name: 'Me' })).toBeNull()
  })

  it('draws a capsule per group and one for each run of loose items', async () => {
    render(<Six />)
    await flushViewportMeasurement()
    expect(region('cluster').querySelectorAll('[data-slot="navigator-capsule"]')).toHaveLength(2)
    expect(within(region('cluster')).getByRole('list', { name: 'Extra' })).toBeInTheDocument()
  })

  it('keeps group titles for screen readers only while collapsed', async () => {
    render(<Six />)
    await flushViewportMeasurement()
    expect(within(region('cluster')).getByText('Extra')).toHaveClass('sr-only')
    expect(rail()).not.toHaveAttribute('data-expanded')
  })

  it('folds nothing until the cluster has been measured', async () => {
    render(<Six />)
    await flushViewportMeasurement()
    expect(within(region('cluster')).queryByRole('button', { name: 'More' })).toBeNull()
  })
})

describe('rail capacity', () => {
  it('folds the lowest-ranked items into a More tile at the end of the cluster', async () => {
    const user = userEvent.setup()
    render(<Six />)
    await flushViewportMeasurement()
    // 12rem at 16px: two tiles + More fit (6.75 + 3.5 + 0.75 + 1 = 12).
    reportClusterHeight(192)
    const cluster = region('cluster')
    expect(within(cluster).getAllByRole('link')).toHaveLength(2)
    const more = within(cluster).getByRole('button', { name: 'More' })
    await user.click(more)
    expect(more).toHaveAttribute('aria-expanded', 'true')
    const railRows = document.querySelector(
      '[data-slot="pane"][id] [data-slot="navigator-overflow-items"].max-md\\:hidden'
    ) as HTMLElement
    expect(within(railRows).getAllByRole('link')).toHaveLength(4)
  })

  it('removes a capsule whose items all fold', async () => {
    render(<Six lowGroup />)
    await flushViewportMeasurement()
    // Room for the four loose tiles and More: 13.25 + 3.5 + 0.75 + 1 = 18.5rem.
    reportClusterHeight(18.5 * 16)
    expect(within(region('cluster')).queryByRole('list', { name: 'Extra' })).toBeNull()
  })

  it('lights More while the current section is folded', async () => {
    render(<Six value='/f' />)
    await flushViewportMeasurement()
    reportClusterHeight(192)
    expect(within(region('cluster')).getByRole('button', { name: 'More' })).toHaveAttribute(
      'data-current'
    )
  })
})
```

Run the file. Expected: FAIL — no regions, no capsules.

- [ ] **Step 4: Variants**

Replace in `variants.ts` (keep the file's comment style — say *why*):

```ts
// The cluster is the 1fr row, so it centres between brand and pinned.
export const navigatorRailVariants = cva([
  'group/rail hidden min-h-0 md:col-start-1 md:row-start-1 md:grid',
  'grid-rows-[auto_minmax(0,1fr)_auto] gap-3 py-3 w-20'
])

export const navigatorRailBrandVariants = cva(['grid justify-items-center px-3'])

export const navigatorRailClusterVariants = cva(['min-h-0'])

// `relative` positions the cluster's pill; the viewport is what scrolls.
export const navigatorRailClusterViewportVariants = cva(['relative size-full'])

// `min-h-full` + `content-center` centres a short cluster; py-2 is
// RAIL_METRICS.clusterPad and keeps capsule shadows off the clip edge.
export const navigatorRailClusterContentVariants = cva([
  'grid min-h-full content-center justify-items-center gap-3 px-3 py-2'
])

export const navigatorRailPinnedVariants = cva([
  'relative grid justify-items-center gap-3 px-3'
])

// One floating capsule per group or run. p-1 and gap-1 are RAIL_METRICS.
export const navigatorCapsuleVariants = cva([
  'relative grid gap-1 p-1 rounded-full emphasis-raised'
])

// A rail tile. `text-subtle` always; the active tile's `intent-accent` turns
// it into the accent's subtle tone, so no raw scale step is needed.
export const navigatorItemVariants = cva(
  [
    'is-interactive relative z-[1] grid size-12 place-items-center rounded-full text-subtle',
    'motion-safe:transition-[background-color] motion-reduce:transition-none'
  ],
  {
    variants: {
      active: { true: 'intent-accent', false: 'hover:bg-subtle' }
    },
    defaultVariants: { active: false }
  }
)

export const navigatorGroupTitleVariants = cva([
  'sr-only px-3 pb-1 text-xs font-semibold text-subtler'
])

export const navigatorBrandVariants = cva(['flex items-center justify-center gap-2 py-1'])
```

Delete `navigatorRailViewportVariants`, `navigatorRailContentVariants`,
`navigatorGroupListVariants`, `navigatorRailListVariants`, and the old
`state` variant of `navigatorItemVariants`. `navigatorItemTrailingVariants`
stays for the badge (Task 12).

`packages/core/src/css/layout.css`: delete the whole
`/* Navigator rail widths … */ @theme { --navigator-rail-compact …; --navigator-rail-nested …; }`
block. `grep -rn "navigator-rail-" packages docs/src` → no hits.

- [ ] **Step 5: Capsules, fold context, capacity hook**

`NavigatorFoldedContext.ts`:

```ts
'use client'

import { createContext } from 'react'

// The rail's folded values, so a Group can drop its folded rows — the one
// piece of fold state a Group can't get from its own props.
export const NavigatorFoldedContext = createContext<ReadonlySet<string>>(new Set())
```

`capsules.tsx`:

```tsx
import { Fragment, type ReactNode } from 'react'

import type { RailEntry } from './collectSlots'
import type { RailCapsule } from './railCapacity'
import { navigatorCapsuleVariants } from './variants'

type ItemEntry = Extract<RailEntry, { kind: 'item' }>

// Must group exactly as wrapCapsules draws, or the arithmetic measures the wrong rail.
export function railCapsules(entries: RailEntry[]): RailCapsule[] {
  const capsules: RailCapsule[] = []
  let run: RailCapsule | null = null
  entries.forEach((entry, index) => {
    if (entry.kind === 'item') {
      run ??= { key: `run-${index}`, slots: [] }
      run.slots.push(entry.slot)
      return
    }
    if (run) capsules.push(run)
    run = null
    if (entry.kind === 'group') capsules.push({ key: entry.group.key, slots: entry.slots })
  })
  if (run) capsules.push(run)
  return capsules
}

/** Folded items drop out; a capsule left empty disappears. */
export function wrapCapsules(
  entries: RailEntry[],
  folded: ReadonlySet<string>
): ReactNode[] {
  const out: ReactNode[] = []
  let run: ItemEntry[] = []

  const flush = () => {
    const items = run.filter((entry) => !folded.has(entry.slot.value))
    run = []
    if (items.length === 0) return
    out.push(
      <ul
        key={`run-${out.length}`}
        data-slot='navigator-capsule'
        className={navigatorCapsuleVariants()}
      >
        {items.map((entry) => (
          <li key={entry.slot.value}>{entry.element}</li>
        ))}
      </ul>
    )
  }

  for (const entry of entries) {
    if (entry.kind === 'item') {
      run.push(entry)
      continue
    }
    flush()
    if (entry.kind === 'group' && entry.slots.every((slot) => folded.has(slot.value))) {
      continue
    }
    out.push(<Fragment key={`entry-${out.length}`}>{entry.element}</Fragment>)
  }
  flush()
  return out
}
```

(Task 9 adds the `toggle` entry kind; the `entry.kind === 'group'` guards are
written so that addition doesn't break them.)

`useRailCapacity.ts`:

```ts
'use client'

import { type RefObject, useEffect, useMemo, useState } from 'react'

import { type RailCapsule, fitRailCluster } from './railCapacity'

const NONE: ReadonlySet<string> = new Set()

const rootFontSize = () =>
  parseFloat(getComputedStyle(document.documentElement).fontSize) || 16

/** One observer on the cluster's viewport; everything else is arithmetic. */
export function useRailCapacity(
  viewportRef: RefObject<HTMLElement | null>,
  capsules: RailCapsule[],
  fixed: number[],
  enabled: boolean
): ReadonlySet<string> {
  const [available, setAvailable] = useState(0)

  useEffect(() => {
    const node = viewportRef.current
    if (!node || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setAvailable(entry.contentRect.height / rootFontSize())
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [viewportRef])

  // `capsules` is rebuilt every render; its identity is this string.
  const shape = `${capsules
    .map((c) => `${c.key}:${c.slots.map((s) => `${s.value}/${s.priority}`).join(',')}`)
    .join('|')}#${fixed.join(',')}`

  return useMemo(
    () => (enabled ? fitRailCluster(capsules, available, fixed).folded : NONE),
    [shape, available, enabled]
  )
}
```

- [ ] **Step 6: Render the rail**

`NavigatorPrimary.tsx` — replace the `ScrollArea`-as-`<nav>` rail with:

```tsx
  const clusterRef = useRef<HTMLDivElement>(null)
  const pinnedRef = useRef<HTMLDivElement>(null)
  const capsules = railCapsules(collected.cluster)
  const railFolded = useRailCapacity(clusterRef, capsules, [], true)
  const railFoldedSlots = collected.automatic.filter((slot) => railFolded.has(slot.value))
  const railFoldedKey = railFoldedSlots.map((slot) => slot.value).join(',')
  useEffect(() => {
    setOverflowItems('rail', railFoldedSlots)
  }, [railFoldedKey, setOverflowItems])
  const railMoreActive =
    overflowOpen ||
    (railFoldedSlots.some((slot) => isSectionActive(slot, activeValue)) &&
      !disclosureOpen)

  …
      <nav
        data-slot='navigator-rail'
        aria-label={ariaLabel}
        className={cn(navigatorRailVariants(), className)}
      >
        <div data-slot='navigator-rail-brand' className={navigatorRailBrandVariants()}>
          {collected.brand}
        </div>
        <ScrollArea data-slot='navigator-rail-cluster' className={navigatorRailClusterVariants()}>
          <ScrollArea.Viewport
            ref={clusterRef}
            data-slot='navigator-rail-cluster-viewport'
            className={navigatorRailClusterViewportVariants()}
          >
            <ScrollArea.Content
              fitWidth={false}
              className={navigatorRailClusterContentVariants()}
            >
              <NavigatorFoldedContext value={railFolded}>
                {wrapCapsules(collected.cluster, railFolded)}
              </NavigatorFoldedContext>
              {railFoldedSlots.length > 0 ? (
                <ul data-slot='navigator-capsule' className={navigatorCapsuleVariants()}>
                  <li>
                    <NavigatorDestination
                      ariaCurrent={railMoreActive ? 'true' : undefined}
                      dataCurrent={railMoreActive}
                      expanded={overflowOpen}
                      controls={overflowOpen ? overflowPaneId : undefined}
                      className={navigatorItemVariants({ active: railMoreActive })}
                      onClick={(event) => {
                        overflowOpener.current = event.currentTarget as HTMLElement
                        setOpenMenu(null)
                        setOverflowOpen(!overflowOpen)
                      }}
                    >
                      <span data-slot='navigator-item-icon'>
                        {presentNavIcon(<DotsThreeIcon />, false, 'size-6')}
                      </span>
                      <span className='sr-only'>{OVERFLOW_LABEL}</span>
                    </NavigatorDestination>
                  </li>
                </ul>
              ) : null}
            </ScrollArea.Content>
            <NavigatorIndicator trackRef={clusterRef} surface='rail' />
          </ScrollArea.Viewport>
          <ScrollArea.Scrollbar flush>
            <ScrollArea.Thumb />
          </ScrollArea.Scrollbar>
        </ScrollArea>
        <div
          ref={pinnedRef}
          data-slot='navigator-rail-pinned'
          className={navigatorRailPinnedVariants()}
        >
          {wrapCapsules(collected.pinned, new Set())}
          <NavigatorIndicator trackRef={pinnedRef} surface='rail' />
        </div>
      </nav>
```

Drop `railRef`, `wrapRailRun` and `navigatorRailViewportVariants`/
`navigatorRailContentVariants`. The Escape-closes-More effect stays (the More
pane now exists at every size).

`NavigatorGroup.tsx`: read `NavigatorFoldedContext`, skip rows whose element
`props.value` is folded, return `null` when none remain, and render the list as
`<ul data-slot='navigator-capsule' aria-labelledby=… className={cn(navigatorCapsuleVariants(), className)}>`
— one slot name for every capsule, loose or grouped. Existing tests that select
`navigator-group-list` switch to `navigator-capsule`.

`NavigatorItem.tsx`: the tile renders the icon and an `sr-only` label (the
accessible name stays inside the link; no `aria-label`), no badge trailing yet
(Task 12), class `navigatorItemVariants({ active })`.

`NavigatorBrand.tsx`: unchanged markup; its variants lose the compact classes
(done above).

`index.tsx`: export the new variants
(`navigatorRailBrandVariants`, `navigatorRailClusterVariants`,
`navigatorRailClusterViewportVariants`, `navigatorRailClusterContentVariants`,
`navigatorRailPinnedVariants`, `navigatorCapsuleVariants`), remove the deleted
ones. `git rm …/Navigator/railList.tsx`.

`docs/src/components/Navigation.tsx`: the Brand wordmark's
`group-data-[form=compact]/rail:hidden` becomes `hidden` (Task 9 adds
`navigator-expanded:inline`).

- [ ] **Step 7: Run and migrate**

Run: `cd packages/components && pnpm vitest run src/components/Navigator`

Expected new files PASS. In `Navigator.test.tsx`, rewrite the tests that read
the old rail DOM: `Navigator.Brand` (≈1132-1152: brand is in
`navigator-rail-brand`), `rail list semantics` (≈2775-2796: loose items are
`li`s of a `navigator-capsule` `ul`), and the offsetParent guard (≈4692-4706:
`navigatorRailClusterViewportVariants`). Delete assertions on
`navigator-rail-viewport` / `scroll-area-content` inside the rail. Act warnings
within budget.

- [ ] **Step 8: Commit**

```bash
git add packages/components/src/components/Navigator packages/core/src/css/layout.css \
  packages/components/src/index.tsx docs/src/components/Navigation.tsx
git commit -m "feat(navigator): capsule rail with brand, centred cluster and pinned items; fold by height"
```

---

## Task 9: Expanded rail and `Navigator.ExpandToggle`

**Files:**
- Create: `…/Navigator/NavigatorExpandToggle.tsx`
- Create: `packages/core/src/css/navigator.css`,
  `packages/core/src/css/navigator-variant.test.ts`,
  `packages/core/src/navigator/index.ts`, `packages/core/src/navigator/navigator.test.ts`
- Modify: `packages/core/src/css/roadie.css`, `packages/core/package.json`,
  `packages/core/tsdown.config.ts`, `.changeset/app-frame-core-css.md`
- Modify: `NavigatorRoot.tsx`, `NavigatorContext.ts`, `collectSlots.ts`,
  `collectSlots.test.tsx`, `capsules.tsx`, `NavigatorPrimary.tsx`,
  `NavigatorItem.tsx`, `NavigatorGroup.tsx`, `variants.ts`, `index.tsx`,
  `NavigatorRail.test.tsx`, `railCapacity.test.ts`,
  `packages/components/src/index.tsx`

**Interfaces:**
- Produces:

```ts
// NavigatorRootProps gains
expanded?: boolean
defaultExpanded?: boolean // default false
onExpandedChange?: (next: boolean) => void
// context
expanded: boolean; setExpanded: (next: boolean) => void; railId: string
// NavigatorExpandToggleProps
{ placement?: NavigatorPlacement /* default 'automatic' */; className?: string }
// RailEntry gains
| { kind: 'toggle'; element: ReactElement<NavigatorExpandToggleProps> }
// the rail renders data-expanded (present only while expanded); every expanded
// style is one `navigator-expanded:` class — no CVA `expanded` variant
// new constant: navigatorItemLabelClass
// core (@oztix/roadie-core/css): @custom-variant navigator-expanded (D14)
// core (@oztix/roadie-core/navigator):
export const NAVIGATOR_EXPANDED_SCOPE: string // the variant's selector list, for tests
```

- D3 (toggle never folds; counted as a fixed capsule when automatic), D14.

- [ ] **Step 0: The core variant, test first**

`packages/core/src/css/navigator-variant.test.ts` — compile the sheet with
Tailwind's own compiler (core depends on `tailwindcss` 4.3.3) and assert the
selector it emits:

```ts
import { readFileSync } from 'node:fs'

import { compile } from 'tailwindcss'
import { describe, expect, it } from 'vitest'

import { NAVIGATOR_EXPANDED_SCOPE } from '../navigator'

const sheet = readFileSync(new URL('./navigator.css', import.meta.url), 'utf8')
const squash = (css: string) => css.replace(/\s+/g, ' ')

describe('navigator-expanded', () => {
  it('compiles to the rail scope, wrapped in :where()', async () => {
    const compiler = await compile(`@tailwind utilities;\n${sheet}`)
    const css = squash(compiler.build(['navigator-expanded:grid']))
    expect(css).toContain(squash(`:where(${NAVIGATOR_EXPANDED_SCOPE})`))
    expect(css).toContain('display: grid')
  })
})
```

`packages/core/src/navigator/navigator.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import { NAVIGATOR_EXPANDED_SCOPE } from './index'

describe('NAVIGATOR_EXPANDED_SCOPE', () => {
  it('is scoped to the rail, by its own state or the document', () => {
    expect(NAVIGATOR_EXPANDED_SCOPE).toBe(
      '[data-slot=navigator-rail][data-expanded], [data-slot=navigator-rail][data-expanded] *, [data-navigator-expanded] [data-slot=navigator-rail][data-from-document], [data-navigator-expanded] [data-slot=navigator-rail][data-from-document] *'
    )
  })
})
```

Run: `pnpm --filter @oztix/roadie-core test`
Expected: FAIL — neither file exists.

`packages/core/src/navigator/index.ts`:

```ts
/** The `navigator-expanded` variant's selector list, for tests that assert it matches. */
export const NAVIGATOR_EXPANDED_SCOPE =
  '[data-slot=navigator-rail][data-expanded], [data-slot=navigator-rail][data-expanded] *, [data-navigator-expanded] [data-slot=navigator-rail][data-from-document], [data-navigator-expanded] [data-slot=navigator-rail][data-from-document] *'
```

`packages/core/src/css/navigator.css` (imported from `roadie.css` after
`layout.css`):

```css
/* Navigator: the one variant every expanded-rail style is written with. */
@custom-variant navigator-expanded (&:where([data-slot=navigator-rail][data-expanded], [data-slot=navigator-rail][data-expanded] *, [data-navigator-expanded] [data-slot=navigator-rail][data-from-document], [data-navigator-expanded] [data-slot=navigator-rail][data-from-document] *));
```

Tailwind v4.3.3's shorthand `@custom-variant name (selector);` splits the
parenthesised selector on top-level commas only, so the commas inside
`:where()` are safe (checked in `tailwindcss/dist/lib.js`). If the compile
test shows Tailwind rewrote the selector beyond whitespace, change
`NAVIGATOR_EXPANDED_SCOPE` and the sheet together — never loosen the test.

Wire the subpath: `packages/core/tsdown.config.ts` entry
`'navigator/index': './src/navigator/index.ts'`; `packages/core/package.json`
exports beside `./theme`:

```json
    "./navigator": {
      "types": "./dist/navigator/index.d.ts",
      "import": "./dist/navigator/index.js"
    },
```

No safelist entry: the variant only matters where component class strings
use it, and consumers compile those from `@oztix/roadie-core/css` plus
`@oztix/roadie-components/css` (which carries the components' `@source`).
`dist/roadie.compiled.css` is built from `safelist.html`, which contains no
Navigator classes, so it simply omits them, as it already does for every
component class.

Run: `pnpm --filter @oztix/roadie-core test && pnpm --filter @oztix/roadie-core build`
Expected: PASS; `ls packages/core/dist/navigator/index.js`.

`.changeset/app-frame-core-css.md` — append: "…and the `navigator-expanded`
variant, which Navigator's expanded rail is styled with, plus
`@oztix/roadie-core/navigator`."

- [ ] **Step 1: Failing tests**

Append to `NavigatorRail.test.tsx` (and import
`NAVIGATOR_EXPANDED_SCOPE` from `@oztix/roadie-core/navigator` and the variants
named below from `./variants` at the top of the file):

```tsx
function Expandable(props: {
  expanded?: boolean
  defaultExpanded?: boolean
  onExpandedChange?: (next: boolean) => void
}) {
  return (
    <Navigator value='/a' {...props}>
      <Navigator.Primary aria-label='Main'>
        <Navigator.Group>
          <Navigator.GroupTitle>Docs</Navigator.GroupTitle>
          <Navigator.Item value='/a' href='/a' icon={<FakeIcon />}>Alpha</Navigator.Item>
          <Navigator.Item value='/b' href='/b' icon={<FakeIcon />}>Beta</Navigator.Item>
          <Navigator.Item value='/c' href='/c' icon={<FakeIcon />}>Gamma</Navigator.Item>
        </Navigator.Group>
        <Navigator.ExpandToggle placement='pinned' />
      </Navigator.Primary>
      <Navigator.Content />
    </Navigator>
  )
}

describe('expanded rail', () => {
  it('toggles, uncontrolled, with a labelled button that controls the rail', async () => {
    const user = userEvent.setup()
    render(<Expandable />)
    await flushViewportMeasurement()
    const toggle = within(region('pinned')).getByRole('button', { name: 'Expand sidebar' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(toggle).toHaveAttribute('aria-controls', rail().id)
    await user.click(toggle)
    expect(rail()).toHaveAttribute('data-expanded')
    expect(toggle).toHaveAccessibleName('Collapse sidebar')
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
  })

  it('is controlled by expanded and reports changes', async () => {
    const user = userEvent.setup()
    const onExpandedChange = vi.fn()
    render(<Expandable expanded onExpandedChange={onExpandedChange} />)
    await flushViewportMeasurement()
    await user.click(within(region('pinned')).getByRole('button', { name: 'Collapse sidebar' }))
    expect(onExpandedChange).toHaveBeenCalledWith(false)
    expect(rail()).toHaveAttribute('data-expanded')
  })

  it('matches navigator-expanded inside the rail only while expanded', async () => {
    const scope = `:where(${NAVIGATOR_EXPANDED_SCOPE})`
    const { rerender } = render(<Expandable expanded />)
    await flushViewportMeasurement()
    expect(within(region('cluster')).getByText('Alpha').matches(scope)).toBe(true)
    expect(within(region('cluster')).getByText('Docs').matches(scope)).toBe(true)
    rerender(<Expandable expanded={false} />)
    expect(rail()).not.toHaveAttribute('data-expanded')
    expect(within(region('cluster')).getByText('Alpha').matches(scope)).toBe(false)
  })

  it('never expands a Navigator nested in an expanded one', async () => {
    const scope = `:where(${NAVIGATOR_EXPANDED_SCOPE})`
    render(
      <Navigator value='/a' expanded>
        <Navigator.Primary aria-label='Outer'>
          <Navigator.Item value='/a' href='/a'>Outer</Navigator.Item>
        </Navigator.Primary>
        <Navigator.Content>
          <Navigator value='/x'>
            <Navigator.Primary aria-label='Inner'>
              <Navigator.Item value='/x' href='/x'>Inner</Navigator.Item>
            </Navigator.Primary>
          </Navigator>
        </Navigator.Content>
      </Navigator>
    )
    await flushViewportMeasurement()
    const inner = screen.getByRole('navigation', { name: 'Inner' })
    expect(within(inner).getByText('Inner').matches(scope)).toBe(false)
  })

  it('writes each expanded style once, through the variant', () => {
    const classes = [
      navigatorRailVariants(),
      navigatorRailClusterContentVariants(),
      navigatorRailPinnedVariants(),
      navigatorCapsuleVariants(),
      navigatorItemVariants(),
      navigatorItemLabelClass,
      navigatorGroupTitleVariants()
    ].join(' ')
    expect(classes).toContain('navigator-expanded:w-60')
    expect(classes).toContain('navigator-expanded:not-sr-only')
    expect(classes).not.toMatch(/\[html\[|data-\[expanded|expanded=false/)
  })

  it('folds nothing while expanded', async () => {
    render(<Expandable defaultExpanded />)
    await flushViewportMeasurement()
    reportClusterHeight(40)
    expect(within(region('cluster')).getAllByRole('link')).toHaveLength(3)
    expect(within(region('cluster')).queryByRole('button', { name: 'More' })).toBeNull()
  })

  it('never renders the toggle on the phone bar', async () => {
    render(<Expandable />)
    await flushViewportMeasurement()
    const bar = document.querySelector('[data-slot="navigator-tab-bar"]') as HTMLElement
    expect(within(bar).queryByRole('button', { name: /sidebar/ })).toBeNull()
  })
})
```

Append to `collectSlots.test.tsx`:

```tsx
  it('places ExpandToggle by its placement without making it a destination', () => {
    const result = collectSlots(
      <>
        <Navigator.Item value='/a'>A</Navigator.Item>
        <Navigator.ExpandToggle placement='pinned' />
      </>
    )
    expect(result.pinned.map((entry) => entry.kind)).toEqual(['toggle'])
    expect(result.pinnedSlots).toEqual([])
  })
```

Run both files. Expected: FAIL.

- [ ] **Step 2: Root state**

`NavigatorRoot.tsx` — add the three props (JSDoc on `expanded`: "The large-
screen rail shows labels beside icons. Navigator never touches storage — persist
the choice yourself (a cookie reads on the server without a flash) and pass it
back."), and:

```tsx
  const [uncontrolledExpanded, setUncontrolledExpanded] = useState(
    defaultExpanded ?? false
  )
  const expanded = expandedProp ?? uncontrolledExpanded
  const setExpanded = useCallback(
    (next: boolean) => {
      if (expandedProp === undefined) setUncontrolledExpanded(next)
      onExpandedChange?.(next)
    },
    [expandedProp, onExpandedChange]
  )
  const railId = useId()
```

Add `expanded`, `setExpanded`, `railId` to context (defaults `false`, no-op,
`''`) and the memo deps.

- [ ] **Step 3: The toggle**

`NavigatorExpandToggle.tsx`:

```tsx
'use client'

import { use } from 'react'

import { SidebarSimpleIcon } from '@phosphor-icons/react'

import { cn } from '@oztix/roadie-core/utils'

import { NavigatorContext } from './NavigatorContext'
import type { NavigatorPlacement } from './mobileSlots'
import { presentNavIcon } from './presentNavIcon'
import { navigatorItemLabelClass, navigatorItemVariants } from './variants'

export type NavigatorExpandToggleProps = {
  /** Placed like an item; never folds into More. @default 'automatic' */
  placement?: NavigatorPlacement
  className?: string
}

export function NavigatorExpandToggle({ className }: NavigatorExpandToggleProps) {
  const { expanded, setExpanded, railId } = use(NavigatorContext)
  const label = expanded ? 'Collapse sidebar' : 'Expand sidebar'
  return (
    <button
      type='button'
      data-slot='navigator-expand-toggle'
      aria-expanded={expanded}
      aria-controls={railId}
      className={cn(navigatorItemVariants({ active: false }), className)}
      onClick={() => setExpanded(!expanded)}
    >
      <span data-slot='navigator-item-icon'>
        {presentNavIcon(<SidebarSimpleIcon />, false, 'size-6')}
      </span>
      <span className={navigatorItemLabelClass}>{label}</span>
    </button>
  )
}

NavigatorExpandToggle.displayName = 'Navigator.ExpandToggle'
```

`collectSlots.ts`: a `NavigatorExpandToggle` child becomes
`{ kind: 'toggle', element }`, pushed to `pinned` or `cluster` by
`element.props.placement ?? 'automatic'`, contributing no slot. Route it
through the same `pinnedBeforeCluster` check as items and groups (a pinned
toggle written before cluster items warns too).
`capsules.tsx`: `wrapCapsules` renders a toggle entry in its own
`navigator-capsule` `ul`; `railCapsules` skips it; add
`export const fixedCapsules = (entries: RailEntry[]) => entries.filter((e) => e.kind === 'toggle').map(() => 1)`.

- [ ] **Step 4: Expanded styles and wiring**

`variants.ts` — each expanded style sits beside its collapsed default,
written once with the variant:

```ts
navigatorRailVariants base:                'w-20 navigator-expanded:w-60'
navigatorRailClusterContentVariants base:  'content-center justify-items-center navigator-expanded:content-start navigator-expanded:justify-items-stretch'
navigatorRailPinnedVariants base:          'justify-items-center navigator-expanded:justify-items-stretch'
navigatorCapsuleVariants base:             'rounded-full navigator-expanded:rounded-4xl'
navigatorItemVariants base:                'size-12 place-items-center navigator-expanded:h-12 navigator-expanded:w-full navigator-expanded:grid-cols-[auto_1fr_auto] navigator-expanded:justify-items-start navigator-expanded:gap-3 navigator-expanded:px-3 navigator-expanded:text-sm navigator-expanded:font-semibold'
navigatorGroupTitleVariants base:          'sr-only navigator-expanded:not-sr-only …'

// `starting:` is @starting-style, so labels fade in as the rail snaps wide.
export const navigatorItemLabelClass =
  'sr-only navigator-expanded:not-sr-only navigator-expanded:truncate motion-safe:navigator-expanded:transition-opacity motion-safe:navigator-expanded:starting:opacity-0'
```

(Replace the classes they supersede in each base string rather than
appending: `w-20`, `rounded-full`, `size-12 place-items-center`,
`content-center justify-items-center` and `justify-items-center` each appear
once.) The class guard in `railCapacity.test.ts` keeps its no-argument calls —
the collapsed defaults are still in each base string.

`NavigatorPrimary.tsx`: read `expanded` and `railId`; the rail gets
`id={railId}` and `data-expanded={expanded ? '' : undefined}` — the only place
expanded reaches the DOM; capacity is
`useRailCapacity(clusterRef, capsules, fixedCapsules(collected.cluster), !expanded)`.
Tile labels (`NavigatorItem`, rail More, `NavigatorExpandToggle`) use
`navigatorItemLabelClass`. JS still reads `expanded` for behaviour — folding,
tooltips (Task 11), the toggle's name and `aria-expanded` — never for styling.
The tab bar never sees the toggle (it has no slot).

`docs/src/components/Navigation.tsx`: the Brand wordmark becomes
`hidden navigator-expanded:inline`.

`index.tsx`: `ExpandToggle` attachment, `NavigatorExpandToggleProps` type,
`navigatorItemLabelClass`; barrel adds the type.

Run: `cd packages/components && pnpm vitest run src/components/Navigator`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/css packages/core/src/navigator packages/core/package.json \
  packages/core/tsdown.config.ts .changeset/app-frame-core-css.md \
  packages/components/src/components/Navigator packages/components/src/index.tsx \
  docs/src/components/Navigation.tsx
git commit -m "feat(navigator): expanded rail styled through navigator-expanded, and Navigator.ExpandToggle"
```

---

## Task 9B: Optional pre-hydration expanded state for static sites (D14)

Server-rendered apps skip this task's feature entirely: read the cookie on the
server and pass `defaultExpanded` (or `expanded`); the rail's `data-expanded`
is in the server HTML, so `navigator-expanded:` styles paint on the first frame
with no script. This task is for static exports like the docs.

**Files:**
- Modify: `packages/core/src/navigator/index.ts` (created in Task 9),
  `packages/core/src/navigator/navigator.test.ts`,
  `.changeset/app-frame-core-css.md`
- Modify: `…/Navigator/NavigatorRoot.tsx`, `NavigatorContext.ts`,
  `NavigatorPrimary.tsx`, `NavigatorRail.test.tsx`

**Interfaces:**
- Consumes: `navigator-expanded` and `NAVIGATOR_EXPANDED_SCOPE` (Task 9) — the
  scope's second pair of selectors is what this task switches on.
- Produces (`@oztix/roadie-core/navigator`):

```ts
export const NAVIGATOR_EXPANDED_COOKIE = 'roadie-navigator-expanded'
export const NAVIGATOR_EXPANDED_ATTRIBUTE = 'data-navigator-expanded'
export function getNavigatorExpandedScript(options?: { cookieName?: string }): string
export function serializeNavigatorExpandedCookie(
  expanded: boolean,
  options?: { cookieName?: string }
): string
```

- Produces (components): `NavigatorRootProps.expandedFromDocument?: boolean`.
  When set, the rail renders `data-from-document`, which lets the variant match
  through `<html data-navigator-expanded>`; after mount Navigator keeps that
  attribute in sync with `expanded`. Nothing is duplicated in the class strings.

- [ ] **Step 1: Failing core tests**

Append to `packages/core/src/navigator/navigator.test.ts` (core tests run in
node — execute the script against a fake `document`):

```ts
import {
  NAVIGATOR_EXPANDED_ATTRIBUTE,
  NAVIGATOR_EXPANDED_COOKIE,
  getNavigatorExpandedScript,
  serializeNavigatorExpandedCookie
} from './index'

const runWith = (cookie: string, script = getNavigatorExpandedScript()) => {
  let attribute: string | null = null
  const document = {
    cookie,
    documentElement: {
      setAttribute: (name: string, value: string) => {
        if (name === NAVIGATOR_EXPANDED_ATTRIBUTE) attribute = value
      },
      removeAttribute: (name: string) => {
        if (name === NAVIGATOR_EXPANDED_ATTRIBUTE) attribute = null
      }
    }
  }
  new Function('document', script)(document)
  return attribute
}

describe('getNavigatorExpandedScript', () => {
  it('marks the document when the cookie says expanded', () => {
    expect(runWith(`a=1; ${NAVIGATOR_EXPANDED_COOKIE}=1`)).toBe('')
  })

  it('leaves it unmarked otherwise', () => {
    expect(runWith(`${NAVIGATOR_EXPANDED_COOKIE}=0`)).toBeNull()
    expect(runWith('')).toBeNull()
  })

  it('reads a custom cookie name', () => {
    expect(runWith('app-nav=1', getNavigatorExpandedScript({ cookieName: 'app-nav' }))).toBe('')
  })

  it('refuses a cookie name that could break out of the script', () => {
    expect(() => getNavigatorExpandedScript({ cookieName: "x';alert(1)//" })).toThrow()
  })

  it('never throws at runtime', () => {
    expect(() => new Function('document', getNavigatorExpandedScript())(undefined)).not.toThrow()
  })
})

describe('serializeNavigatorExpandedCookie', () => {
  it('writes a year-long, site-wide, lax cookie', () => {
    expect(serializeNavigatorExpandedCookie(true)).toBe(
      `${NAVIGATOR_EXPANDED_COOKIE}=1; path=/; max-age=31536000; samesite=lax`
    )
    expect(serializeNavigatorExpandedCookie(false, { cookieName: 'app-nav' })).toBe(
      'app-nav=0; path=/; max-age=31536000; samesite=lax'
    )
  })
})
```

Run: `pnpm --filter @oztix/roadie-core test`
Expected: FAIL — the functions don't exist yet.

- [ ] **Step 2: Implement core**

Add to `packages/core/src/navigator/index.ts`:

```ts
export const NAVIGATOR_EXPANDED_COOKIE = 'roadie-navigator-expanded'
export const NAVIGATOR_EXPANDED_ATTRIBUTE = 'data-navigator-expanded'

const COOKIE_NAME = /^[\w-]+$/

const nameOf = (options?: { cookieName?: string }) => {
  const name = options?.cookieName ?? NAVIGATOR_EXPANDED_COOKIE
  if (!COOKIE_NAME.test(name)) {
    throw new Error(`Invalid Navigator cookie name: ${name}`)
  }
  return name
}

/**
 * Optional blocking `<head>` script for static sites: paints a persisted
 * expanded rail before hydration. Pair with `<Navigator expandedFromDocument>`.
 *
 * @example
 * <script dangerouslySetInnerHTML={{ __html: getNavigatorExpandedScript() }} />
 */
export function getNavigatorExpandedScript(options?: {
  cookieName?: string
}): string {
  const name = nameOf(options)
  return `try{var d=document.documentElement;/(?:^|; )${name}=1(?:;|$)/.test(document.cookie)?d.setAttribute('${NAVIGATOR_EXPANDED_ATTRIBUTE}',''):d.removeAttribute('${NAVIGATOR_EXPANDED_ATTRIBUTE}')}catch(x){}`
}

/** The cookie string to write when the user toggles the rail. */
export function serializeNavigatorExpandedCookie(
  expanded: boolean,
  options?: { cookieName?: string }
): string {
  return `${nameOf(options)}=${expanded ? 1 : 0}; path=/; max-age=31536000; samesite=lax`
}
```

Run: `pnpm --filter @oztix/roadie-core test && pnpm --filter @oztix/roadie-core build`
Expected: PASS.

`.changeset/app-frame-core-css.md` — append: "`@oztix/roadie-core/navigator`
also exports `getNavigatorExpandedScript`, an optional head script that lets a
static site paint a persisted expanded rail before hydration, with the cookie
name and serializer it reads."

- [ ] **Step 3: Failing component tests**

Append to `NavigatorRail.test.tsx` (add `expandedFromDocument?: boolean` to
`Expandable`'s props; it already spreads them onto `Navigator`):

```tsx
describe('expanded from the document', () => {
  const scope = `:where(${NAVIGATOR_EXPANDED_SCOPE})`
  afterEach(() => document.documentElement.removeAttribute('data-navigator-expanded'))

  it('styles the rail expanded from the document attribute alone', async () => {
    document.documentElement.setAttribute('data-navigator-expanded', '')
    render(<Expandable expandedFromDocument expanded={false} />)
    await flushViewportMeasurement()
    expect(rail()).toHaveAttribute('data-from-document')
    expect(within(region('cluster')).getByText('Alpha').matches(scope)).toBe(true)
  })

  it('treats the rail as expanded until the app changes expanded', async () => {
    document.documentElement.setAttribute('data-navigator-expanded', '')
    render(<Expandable expandedFromDocument expanded={false} />)
    await flushViewportMeasurement()
    reportClusterHeight(40)
    expect(within(region('cluster')).queryByRole('button', { name: 'More' })).toBeNull()
  })

  it('keeps the attribute in sync after a toggle', async () => {
    const user = userEvent.setup()
    document.documentElement.setAttribute('data-navigator-expanded', '')
    render(<Expandable expandedFromDocument />)
    await flushViewportMeasurement()
    await user.click(within(region('pinned')).getByRole('button', { name: 'Collapse sidebar' }))
    expect(document.documentElement).not.toHaveAttribute('data-navigator-expanded')
    expect(within(region('cluster')).getByText('Alpha').matches(scope)).toBe(false)
  })

  it('ignores the document unless opted in', async () => {
    document.documentElement.setAttribute('data-navigator-expanded', '')
    render(<Expandable />)
    await flushViewportMeasurement()
    expect(rail()).not.toHaveAttribute('data-from-document')
    expect(within(region('cluster')).getByText('Alpha').matches(scope)).toBe(false)
  })
})
```

(`NAVIGATOR_EXPANDED_SCOPE` is already imported at the top of the file from
Task 9.) Run. Expected: FAIL.

- [ ] **Step 4: Implement**

`NavigatorRoot.tsx`:

```tsx
  // JS behaviour (folding, tooltips, the toggle) must agree with what the head
  // script painted until the app's own state takes over.
  const [documentExpanded, setDocumentExpanded] = useState(false)
  useIsomorphicLayoutEffect(() => {
    if (!expandedFromDocument) return
    setDocumentExpanded(document.documentElement.hasAttribute('data-navigator-expanded'))
  }, [])
  const expanded = (expandedProp ?? uncontrolledExpanded) || documentExpanded

  const setExpanded = useCallback(
    (next: boolean) => {
      setDocumentExpanded(false)
      if (expandedProp === undefined) setUncontrolledExpanded(next)
      onExpandedChange?.(next)
    },
    [expandedProp, onExpandedChange]
  )

  const mounted = useRef(false)
  useIsomorphicLayoutEffect(() => {
    // Skip mount: a server-snapshot `false` must not erase what the script painted.
    if (!mounted.current) {
      mounted.current = true
      return
    }
    if (!expandedFromDocument) return
    document.documentElement.toggleAttribute('data-navigator-expanded', expanded)
  }, [expanded, expandedFromDocument])
```

Expose `expandedFromDocument` on context; `NavigatorPrimary` renders the rail
with `data-from-document={expandedFromDocument ? '' : undefined}`. Prop JSDoc,
one sentence: "Follow `getNavigatorExpandedScript`'s attribute on `<html>`
before hydration, for static sites."

Run: `cd packages/components && pnpm vitest run src/components/Navigator`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/navigator .changeset/app-frame-core-css.md \
  packages/components/src/components/Navigator
git commit -m "feat(navigator): optional head script to paint the expanded rail before hydration"
```

---

## Task 10: Duotone icons, `text-subtle` + `intent-accent`, and the translate-only pill everywhere

**Files:**
- Modify: `…/Navigator/presentNavIcon.tsx`, `variants.ts`, `NavigatorItem.tsx`,
  `NavigatorTab.tsx`, `NavigatorPrimary.tsx`, `NavigatorOverflowItems.tsx`,
  `NavigatorSecondaryItems.tsx`, `NavigatorExpandToggle.tsx`,
  `Navigator.test.tsx`, `NavigatorRail.test.tsx`

**Interfaces:**
- Produces: `presentNavIcon(icon: ReactNode, size: string, dataSlot?: string): ReactNode`
  — the `active` parameter is gone; weight is always `duotone`.
- Spec §5 Colour, Icons, Pill.

- [ ] **Step 1: Failing tests**

In `Navigator.test.tsx`, replace the icon-weight/size tests in
`Navigator rail form` (≈937-1025) and `mobile tab bar` (≈1594-1640), and the
`active item surface` describe (≈1281-1322), with:

```tsx
describe('destination visuals', () => {
  const tree = (value = '/a') => (
    <Navigator value={value}>
      <Navigator.Primary aria-label='Main'>
        <Navigator.Item value='/a' href='/a' icon={<FakeIcon />}>A</Navigator.Item>
        <Navigator.Item value='/b' href='/b' icon={<FakeIcon />}>B</Navigator.Item>
      </Navigator.Primary>
    </Navigator>
  )

  it('renders every destination icon duotone at size-6', async () => {
    const { container } = render(tree())
    await flushViewportMeasurement()
    const icons = container.querySelectorAll('[data-testid="fake-icon"]')
    expect(icons.length).toBeGreaterThan(0)
    for (const icon of icons) {
      expect(icon).toHaveAttribute('data-weight', 'duotone')
      expect(icon).toHaveClass('size-6')
    }
  })

  it('colours the active destination through intent-accent, never a raw step', async () => {
    const { container } = render(tree())
    await flushViewportMeasurement()
    const active = container.querySelectorAll('[data-slot="navigator-item"][data-current]')
    expect(active.length).toBe(2) // rail tile and tab
    for (const item of active) {
      expect(item).toHaveClass('intent-accent', 'text-subtle')
      expect(item.className).not.toMatch(/accent-\d+/)
    }
  })

  it('bounces the icon as a rail tile becomes active', async () => {
    const { container } = render(tree())
    await flushViewportMeasurement()
    const railIcon = container.querySelector(
      '[data-slot="navigator-rail"] [data-current] [data-testid="fake-icon"]'
    )
    expect(railIcon).toHaveClass('animate-pop-tap')
  })

  it('keeps the tab bar icon-only, with the name inside the link', async () => {
    const { container } = render(tree())
    await flushViewportMeasurement()
    const tab = within(tabBarOf(container)!).getByRole('link', { name: 'A' })
    expect(tab).not.toHaveAttribute('aria-label')
    expect(within(tab).getByText('A')).toHaveClass('sr-only')
  })
})
```

(`tabBarOf` — define it in the describe as elsewhere in the file.)

In `describe('sliding indicator')` add:

```tsx
  it('slides the rail pill on translate only', () => {
    const classes = navigatorIndicatorVariants({ surface: 'rail', visible: true })
    expect(classes).toContain('motion-safe:data-[ready=true]:transition-[translate]')
    expect(classes).not.toMatch(/transition-\[[^\]]*(left|top|width|height)/)
    expect(classes).toContain('intent-accent')
  })
```

Run: `cd packages/components && pnpm vitest run src/components/Navigator/Navigator.test.tsx -t 'destination visuals|sliding indicator'`
Expected: FAIL — weights are `fill`/`bold`, tabs use `text-accent-11`, the tab
label is visible, the rail pill transitions `left,top,width,height`.

- [ ] **Step 2: Implement**

`presentNavIcon.tsx`:

```tsx
// Duotone is the Navigator exception to the bold default (AGENTS.md → Iconography).
export function presentNavIcon(
  icon: ReactNode,
  size: string,
  dataSlot?: string
): ReactNode {
  if (!isValidElement<NavIconProps>(icon)) return icon
  const el = icon as ReactElement<NavIconProps>
  return cloneElement(el, {
    weight: 'duotone',
    className: cn(el.props.className, size),
    ...(dataSlot ? { 'data-slot': dataSlot } : {})
  })
}
```

Update every call site to the two/three-argument form: rail tile and rail More
(`'size-6'`, plus `cn('size-6', active && 'animate-pop-tap')` on the tile),
`NavigatorTab` (`cn('size-6', active && 'animate-pop-tap')`,
`'navigator-tab-icon'`), `NavigatorExpandToggle` (`'size-6'`), More-pane and
section-pane rows (`'size-5'`, D13).

`variants.ts`:

- `navigatorTabVariants`: base adds `text-subtle`; `active: { true:
  'intent-accent', false: '' }`; delete the four colour `compoundVariants`
  (`text-accent-11`, `emphasis-subtler text-subtle`) — keep the two circle
  translate compounds. `expanded` presentation becomes
  `'pointer-events-auto px-1 py-3 scale-100 opacity-100'` (icon-only; the
  collapsed circle's `self-end translate-y-1` descent still lands because every
  presentation keeps the same vertical padding — re-check that comment and the
  bar-height reasoning in the block comment above `navigatorTabBarVariants`,
  and correct any number that changed). Delete the `text-center
  text-[0.625rem]/tight font-medium` label typography from the base.
- `navigatorIndicatorVariants`:

```ts
        // Every surface's destinations are now fixed-size or full-width rows,
        // so every pill only moves — boxed once at the track's origin and slid
        // on `translate`. Width/height still follow the measurement, but snap:
        // they change only when the rail itself snaps between widths.
        rail: [
          'intent-accent bg-[var(--intent-bg-subtle)] rounded-full',
          'left-0 top-0 h-[var(--active-tab-height)] w-[var(--active-tab-width)]',
          'translate-x-[var(--active-tab-left)] translate-y-[var(--active-tab-top)]',
          'motion-safe:data-[ready=true]:transition-[translate]'
        ].join(' '),
```

  and delete the "known, recorded exception" paragraph. `NavigatorIndicatorSurface`
  is `'tab' | 'rail'`.

`NavigatorTab.tsx`: the label span is always `sr-only` (the tab's accessible
name stays inside it). `NavigatorItem.tsx` / `NavigatorOverflowItems.tsx` /
`NavigatorSecondaryItems.tsx`: new `presentNavIcon` signature.

Run: `cd packages/components && pnpm vitest run src/components/Navigator`
Expected: PASS. `grep -rn "accent-1[01]\|accent-9\|weight: active" packages/components/src/components/Navigator`
→ no hits.

- [ ] **Step 3: Compile and read the emitted transitions**

Class strings lie about Tailwind v4 transitions. Build and inspect:

```bash
pnpm --filter @oztix/roadie-components build
```

Then, with the docs dev server (9614) at `/foundations/colors`, 1440×900, run
in the browser:

```js
() => {
  const pills = [...document.querySelectorAll('[data-slot="navigator-indicator"]')]
  return {
    innerWidth,
    pills: pills.map((p) => ({
      ready: p.dataset.ready,
      transitionProperty: getComputedStyle(p).transitionProperty
    }))
  }
}
```

Expected: every visible rail pill reports `translate` (not `left`, `top`,
`width`, `height`, and not `transform`).

- [ ] **Step 4: Commit**

```bash
git add packages/components/src/components/Navigator
git commit -m "feat(navigator): duotone icons, accent through intent, and a translate-only pill on every surface"
```

---

## Task 11: Collapsed labels in `Tooltip`

**Files:**
- Create: `…/Navigator/NavigatorTileTooltip.tsx`
- Modify: `NavigatorPrimary.tsx`, `NavigatorItem.tsx`,
  `NavigatorExpandToggle.tsx`, `NavigatorDestination.tsx` (already forwards,
  Task 3), `NavigatorRail.test.tsx`

**Interfaces:**
- Consumes: `Tooltip` (`@oztix/roadie-components/tooltip` on `main`, imported
  in-package as `../Tooltip`) with `Tooltip.Provider`, `Tooltip.Trigger render`,
  `Tooltip.Content side='inline-end'`, `disabled` on the root.
- Produces:

```ts
export function NavigatorTileTooltip(props: {
  label: ReactNode
  render: (asTrigger: (tile: ReactElement) => ReactElement) => ReactNode
}): ReactElement
```

A menu tile needs the tooltip trigger *inside* the menu trigger, and a route
tile needs it directly — the render callback serves both without two
components.

- [ ] **Step 1: Failing tests**

Append to `NavigatorRail.test.tsx`:

```tsx
describe('collapsed labels', () => {
  it('labels a tile in an aria-hidden tooltip, inline-end, on focus', async () => {
    const user = userEvent.setup()
    render(<Six />)
    await flushViewportMeasurement()
    await user.tab()
    const tile = within(region('cluster')).getByRole('link', { name: '/a' })
    expect(tile).toHaveFocus()
    expect(tile).not.toHaveAttribute('aria-label')
    const popup = await screen.findByText('/a', { selector: '[data-slot="tooltip-popup"]' }, { timeout: 2000 })
    expect(popup).toHaveAttribute('aria-hidden', 'true')
    expect(popup).toHaveClass('pointer-coarse:hidden')
    expect(popup.closest('[data-slot="tooltip-positioner"]')).toHaveAttribute('data-side', 'inline-end')
  })

  it('shows no tooltip while expanded', async () => {
    const user = userEvent.setup()
    render(<Expandable defaultExpanded />)
    await flushViewportMeasurement()
    await user.hover(within(region('cluster')).getByRole('link', { name: 'Alpha' }))
    await new Promise((resolve) => setTimeout(resolve, 700))
    expect(document.querySelector('[data-slot="tooltip-popup"]')).toBeNull()
  })

  it('never puts a tooltip on the phone bar', async () => {
    render(<Six />)
    await flushViewportMeasurement()
    const bar = document.querySelector('[data-slot="navigator-tab-bar"]')!
    expect(bar.querySelector('[data-slot="tooltip-trigger"]')).toBeNull()
  })
})
```

Run the file. Expected: FAIL — no tooltip. If focus doesn't open Base UI's
tooltip under jsdom, switch the first test to `user.hover` and keep the 2000ms
`findBy` timeout (the Provider's delay is below it); if neither opens it in
jsdom, keep only the structural assertions (trigger slot present on rail tiles,
absent on the bar) and verify opening in Task 16's browser pass — say so in the
task report.

- [ ] **Step 2: Implement**

`NavigatorTileTooltip.tsx`:

```tsx
'use client'

import { type ReactElement, type ReactNode, use } from 'react'

import { Tooltip } from '../Tooltip'
import { NavigatorContext } from './NavigatorContext'

// aria-hidden: the tile already carries its name as hidden text; both would announce twice.
export function NavigatorTileTooltip({
  label,
  render
}: {
  label: ReactNode
  render: (asTrigger: (tile: ReactElement) => ReactElement) => ReactNode
}) {
  const { expanded } = use(NavigatorContext)
  return (
    <Tooltip disabled={expanded}>
      {render((tile) => (
        <Tooltip.Trigger render={tile} />
      ))}
      <Tooltip.Content
        side='inline-end'
        aria-hidden
        className='pointer-coarse:hidden'
      >
        {label}
      </Tooltip.Content>
    </Tooltip>
  )
}
```

Wire it:

- `NavigatorPrimary.tsx`: wrap the whole `<nav data-slot='navigator-rail'>`
  contents in `<Tooltip.Provider>` so moving between tiles is instant after the
  first (Base UI's default group timeout).
- `NavigatorItem.tsx`: route tile →
  `<NavigatorTileTooltip label={label} render={(asTrigger) => asTrigger(tile)} />`;
  menu tile →
  `<NavigatorTileTooltip label={label} render={(asTrigger) => <NavigatorMenuHost … trigger={asTrigger(tile)} />} />`.
- The rail More tile and `NavigatorExpandToggle` use the same wrapper with
  labels `More` and the toggle's current label.
- The tab bar is untouched.

Run: `cd packages/components && pnpm vitest run src/components/Navigator`
Expected: PASS; act warnings 0 in the new files (tooltip opening schedules
state — wrap waits in `findBy`, never bare `setTimeout` assertions without
`act`; the "no tooltip while expanded" wait is an assertion of absence and must
not produce a warning — if it does, wrap the wait in `act`).

- [ ] **Step 3: Commit**

```bash
git add packages/components/src/components/Navigator
git commit -m "feat(navigator): label collapsed tiles with Tooltip"
```

---

## Task 12: A declared `badge` becomes a corner dot when collapsed

**Files:**
- Modify: `…/Navigator/NavigatorItem.tsx`, `mobileSlots.ts`, `collectSlots.ts`,
  `NavigatorTab.tsx`, `NavigatorPrimary.tsx`, `NavigatorOverflowItems.tsx`,
  `NavigatorSecondaryItems.tsx`, `variants.ts`, `NavigatorRail.test.tsx`

**Interfaces:**
- Consumes: `Badge` + `BadgeProps.hideLabel` (from `main`, `../Badge`).
- Produces: `NavigatorItemProps.badge?: ReactElement<BadgeProps>`;
  `NavigatorSlotMeta.badge?: ReactElement<BadgeProps>`; internal
  `badgeDot(badge: ReactElement<BadgeProps>): ReactElement` in `presentNavIcon.tsx`.

- [ ] **Step 1: Failing tests**

Append to `NavigatorRail.test.tsx`:

```tsx
import { Badge } from '../Badge'

function WithBadge(props: { defaultExpanded?: boolean }) {
  return (
    <Navigator value='/a' {...props}>
      <Navigator.Primary aria-label='Main'>
        <Navigator.Item value='/a' href='/a' icon={<FakeIcon />}>Home</Navigator.Item>
        <Navigator.Item
          value='/inbox'
          href='/inbox'
          icon={<FakeIcon />}
          badge={<Badge intent='danger' emphasis='strong'>3 unread</Badge>}
        >
          Inbox
        </Navigator.Item>
      </Navigator.Primary>
    </Navigator>
  )
}

describe('badges', () => {
  it('shrinks to a dot in the tile corner while collapsed, still announced', async () => {
    render(<WithBadge />)
    await flushViewportMeasurement()
    const tile = within(region('cluster')).getByRole('link', { name: /Inbox/ })
    const badge = tile.querySelector('[data-slot="badge"]')!
    expect(badge).toHaveClass('size-2.5', 'absolute', 'end-1', 'top-1')
    expect(within(tile).getByText('3 unread')).toHaveClass('sr-only')
    expect(tile).toHaveAccessibleName('Inbox 3 unread')
  })

  it('trails the label as declared when expanded', async () => {
    render(<WithBadge defaultExpanded />)
    await flushViewportMeasurement()
    const tile = within(region('cluster')).getByRole('link', { name: /Inbox/ })
    expect(within(tile).getByText('3 unread')).not.toHaveClass('sr-only')
  })

  it('is a dot on the phone bar', async () => {
    render(<WithBadge />)
    await flushViewportMeasurement()
    const bar = document.querySelector('[data-slot="navigator-tab-bar"]') as HTMLElement
    expect(
      within(bar).getByRole('link', { name: /Inbox/ }).querySelector('[data-slot="badge"]')
    ).toHaveClass('size-2.5')
  })

  it('accepts only a Badge element', () => {
    // @ts-expect-error — a string can't be given hideLabel
    ;<Navigator.Item value='/x' badge='3'>X</Navigator.Item>
  })
})
```

Run. Expected: FAIL (the tile has no badge; the `@ts-expect-error` is unused
until the type narrows — `pnpm typecheck` reports it).

- [ ] **Step 2: Implement**

`presentNavIcon.tsx` — add:

```tsx
export function badgeDot(badge: ReactElement<BadgeProps>): ReactElement {
  return cloneElement(badge, {
    hideLabel: true,
    className: cn(badge.props.className, 'absolute end-1 top-1')
  })
}
```

- `NavigatorItemProps.badge?: ReactElement<BadgeProps>` (JSDoc: "A `Badge`.
  Collapsed and on the phone bar it shrinks to a dot in the corner
  (`hideLabel`); expanded it trails the label as declared.").
- `NavigatorItem.tsx`: collapsed → `{badge ? badgeDot(badge) : null}` inside
  the tile (the tile is `relative`); expanded →
  `<span className={navigatorItemTrailingVariants()}>{badge}</span>` after the
  label. This is the one expanded difference chosen in JS rather
  than with `navigator-expanded:` — it changes the badge's structure
  (`hideLabel`), and rendering both forms would put its label in the
  accessibility tree twice wherever CSS hasn't loaded. On a static site the
  pre-hydration paint shows the dot until hydration.
- `toSlotMeta` copies `badge` onto the slot; `NavigatorTab` gets `badge` and
  renders `badgeDot(badge)` in every presentation (tab, circle, pinned) —
  `navigatorTabVariants` base already has `relative`.
- `NavigatorOverflowItems` / `NavigatorSecondaryItems`: `trailing={slot.badge}`
  / `trailing={props.badge}` as declared.

Run: `cd packages/components && pnpm vitest run src/components/Navigator && pnpm typecheck`
Expected: PASS, typecheck clean (the `@ts-expect-error` is now used).

- [ ] **Step 3: Commit**

```bash
git add packages/components/src/components/Navigator
git commit -m "feat(navigator): wear a declared badge as a corner dot when collapsed"
```

---

## Task 13: Component docs — Navigator, Pane, app shell, RSC canary

**Files:**
- Modify: `docs/src/app/components/navigator/page.mdx`
- Modify: `docs/src/app/components/pane/page.mdx`
- Modify: `docs/src/app/foundations/app-shell/page.tsx`
- Modify: `docs/src/app/debug/rsc-smoke/NavigatorCanary.tsx`,
  `docs/src/app/debug/rsc-smoke/page.tsx`

No prettier on MDX — edit by hand. The page has no `# Title` (Task 0).

- [ ] **Step 1: Navigator page — metadata, intro, anatomy**

Metadata `description` and the intro paragraph become:
"A full-height application frame — floating capsules in a rail on large
screens, a floating tab bar on phones — with one navigation model at every
size." Rewrite **Anatomy** (≈21-59) around this tree, keeping the existing
"Keep the whole tree in a client component" note but listing
`Navigator.Primary`, `Navigator.Secondary`, `Navigator.Group`, `Navigator.Menu`
and `Navigator.ExpandToggle` as the parts found by reference:

```tsx
<Navigator value={path} expanded={open} onExpandedChange={setOpen}>
  <Navigator.Primary aria-label='Documentation'>
    <Navigator.Brand>…</Navigator.Brand>
    <Navigator.Group visibilityPriority='high'>
      <Navigator.GroupTitle>Docs</Navigator.GroupTitle>
      <Navigator.Item value='/start' href='/start' icon={<HouseIcon />}>Get started</Navigator.Item>
      <Navigator.Item value='/components' icon={<CubeIcon />}>
        Components
        <Navigator.Secondary aria-label='Components' searchable>…</Navigator.Secondary>
      </Navigator.Item>
    </Navigator.Group>
    <Navigator.Item value='account' icon={<UserIcon />} placement='pinned' badge={<Badge intent='danger' emphasis='strong'>3</Badge>}>
      Account
      <Navigator.Menu>…</Navigator.Menu>
    </Navigator.Item>
    <Navigator.ExpandToggle placement='pinned' />
  </Navigator.Primary>
  <Navigator.Content>
    <Pane role='detail' current>…</Pane>
  </Navigator.Content>
</Navigator>
```

Replace every `group-data-[form=compact]/rail:hidden` on the page with
`hidden navigator-expanded:inline`.

- [ ] **Step 2: Navigator page — examples**

Keep the section order from `COMPONENT_DOC_TEMPLATE.md`. For every existing
example: delete `Navigator.End` wrappers (items gain `placement='pinned'`),
delete `tabs={[…]}`, rename `Navigator.Overflow` → `Navigator.OverflowPane`,
and pass icons bare (Navigator applies duotone). Then:

| Section | Action |
| --- | --- |
| Default (≈63-135) | keep; Account becomes `placement='pinned'`; prose: "Pinned items sit at the bottom of the rail and in the phone bar's trailing circle." |
| Nested (≈136-214) | **replace** with **Sections**: a `Navigator.Item` with an `href` and a `Navigator.Secondary`, and a detail pane; prose: "Every section has its own route. There, `Navigator.Content` generates the section's list pane — titled with the item's label, groups kept, the current row marked — beside your overview on a large screen and on top of it on a phone. A sub-page pushes over the list with a Back link to the section route." |
| — | **add Showing the list from the URL**: the Sections example driven by `showList`/`onShowListChange` from a `useState` standing in for a query string; prose: "Roadie never reads the URL. To let a phone user see the list over a sub-page without leaving it, derive `showList` from a query parameter and turn `onShowListChange` into a URL update — the docs use `?nav`. With it wired, tapping the active section's tab shows the list instead of going to the section route." Include the Next.js snippet from Task 14 Step 3–4 as a static `tsx` block (the `Suspense` + `useSearchParams` leaf and `router.push`). |
| — | **add Searchable**: the Sections example with `searchable` and two `Navigator.Group`s inside the Secondary |
| Grouping (≈215-283) | keep the example; rewrite the prose: "Each group is its own floating capsule, named by its `GroupTitle` for screen readers; consecutive loose items share one. Titles show when the rail is expanded and in the More pane." |
| Overflow (≈284-378) | rename to **Visibility priority**; the example gets eight items with `visibilityPriority='high'` on two and `'low'` on one; prose: "Whatever doesn't fit folds into More — on a phone past five slots, on a large screen when the window is too short. Priority decides membership, never order." Keep a short `Navigator.OverflowPane` + `Navigator.OverflowItems` sub-example ("Compose the More pane yourself"). |
| Tab slots (≈379-444) | **delete** |
| Panel (≈445-526) | **replace** with **Menu**: the Account item above with `Navigator.Menu` / `Navigator.MenuItem href` / `onClick`; prose from spec §4 (keyboard, anchoring, never navigates, "if it needs a screen's worth of content, it's a destination with its own pane"). |
| — | **add Expanded**: a controlled example with `useState` and `Navigator.ExpandToggle placement='pinned'`; prose: "Navigator never touches storage. Persist the choice in a cookie; if you render on the server, read it there and pass `defaultExpanded` — the first paint is already right, no script needed. On a static site, optionally add `getNavigatorExpandedScript()` from `@oztix/roadie-core/navigator` to `<head>` and set `expandedFromDocument`." Add a static `tsx` block for each (server: `defaultExpanded={cookies().get(NAVIGATOR_EXPANDED_COOKIE)?.value === '1'}`; static: the head script plus `serializeNavigatorExpandedCookie` in `onExpandedChange`). Then a short "Styling the expanded rail" note: custom content in the rail (a Brand wordmark) uses the `navigator-expanded:` variant, e.g. `hidden navigator-expanded:inline`. |
| — | **add Badges**: the Inbox item from Task 12; prose: "A declared `Badge` shrinks to a dot in the corner while collapsed and on the phone bar, and trails the label when expanded. Write the full meaning — its label is still announced." |
| — | **add Section pane override**: `Navigator.SecondaryPane value='/components'` with a promo `Card` above `Navigator.SecondaryItems`; prose: "Replace one section's generated pane. Declare it before your detail pane." |
| Panes, Pane header, Pane surfaces (≈527-764) | keep; delete the prose about the section nav in the pane header (≈626-627) |
| Long sections (≈710-748) | **delete** — sub-pages always open in a pane now |
| Guidelines (≈765-788) | replace the `Navigator.End` guideline with "Put pinned items last" (D2); add Do "Use a Menu for a handful of actions" / Don't "Put a screen's worth of content in a Menu"; add Do "Pass bare icons — Navigator renders destinations duotone at `size-6`" |
| Accessibility (≈789-798) | rewrite: landmark keeps its `aria-label`; capsules are lists named by their group title; every tile's name is visually hidden text inside it, and the tooltip is `aria-hidden`; `ExpandToggle` is a button with `aria-expanded`/`aria-controls`, "Expand sidebar"/"Collapse sidebar"; tab order follows the rail's regions — brand, cluster, pinned; menus are Base UI menus (arrow keys, typeahead, Escape returns focus); covered panes are hidden from assistive tech below `lg`. |

The live examples must still render in the `h-[30rem]` boxes the page already
uses. Check the icons each example uses are in `CodePreview`'s scope.

- [ ] **Step 3: Pane page, app shell, canary**

- `pane/page.mdx`: ≈453 "mobile section nav" → "the section's list pane";
  ≈160 "the way the rail does" → reword without the rail comparison.
- `foundations/app-shell/page.tsx`: ≈84-86 list the parts found by reference
  (add `Menu`, `ExpandToggle`); ≈230-232 add "and a section's sub-pages open in
  a list pane at the root of the stack".
- `NavigatorCanary.tsx`: after Task 5 it checks the generated pane. Add a
  pinned item and a `Navigator.Group`; the mount check also throws unless
  `[data-slot="navigator-rail-pinned"] [data-slot="navigator-item"]` and
  `[data-slot="navigator-rail-cluster"] [data-slot="navigator-capsule"]` exist.
- `rsc-smoke/page.tsx` ≈603: the prose names `Primary`, `Secondary`, `Group`,
  `Menu`, `ExpandToggle` as the reference-matched parts.

- [ ] **Step 4: Verify**

`pnpm --filter @oztix/roadie-components build`, then on 9614 open
`/components/navigator` at 1440×900: every example renders, no console errors,
the props table lists `Navigator.Menu`, `Navigator.MenuItem`,
`Navigator.ExpandToggle`, `Navigator.OverflowPane`, `Navigator.SecondaryPane`,
`Navigator.SecondaryItems` and the `placement`/`visibilityPriority` props with
their literal unions. Open `/debug/rsc-smoke`: the canary renders without
throwing. `pnpm typecheck && pnpm lint`.

- [ ] **Step 5: Commit**

```bash
git add docs/src/app/components/navigator/page.mdx docs/src/app/components/pane/page.mdx \
  docs/src/app/foundations/app-shell/page.tsx docs/src/app/debug/rsc-smoke
git commit -m "docs(navigator): document placement, priority, menus, section panes and the expanded rail"
```

---

## Task 14: Migrate the docs site onto the redesign

**Files:**
- Create: `docs/src/components/useExpandedCookie.ts`,
  `docs/src/components/NavListQuery.tsx`, `docs/src/app/foundations/page.tsx`,
  `docs/src/app/get-started/page.tsx`
- Modify: `docs/src/components/Navigation.tsx`, `docs/src/app/layout.tsx`,
  `docs/src/app/components/page.tsx`
- Delete: `docs/src/components/ComponentSkeleton.tsx`

**Interfaces:**
- Consumes: everything above; `@oztix/roadie-core/navigator` (Task 9B);
  `componentCategories: ComponentCategory[]` from
  `docs/src/lib/component-manifest.ts` (`{ name, components: { name, title }[], overviewHref? }`).
- D7, D7c, D14, D15.

- [ ] **Step 1: A route for every section**

Every item with a Secondary needs an `href` (D7). Today's section routes:

| Section | Route | State |
| --- | --- | --- |
| Get started | `/get-started` | **missing** — today its `href` is `/`, the home page (≈105-107) |
| Foundations | `/foundations` | **missing** — `getNavigationItems` gives it no `href` (≈144-149) |
| Tokens | `/tokens` | exists (`tokens/page.mdx`) |
| Components | `/components` | exists (`components/page.tsx`, an empty state) |
| Widgets | `/roadie-widgets` | exists (`roadie-widgets/page.mdx`) |

The home page `/` leaves the Get started section and stays a normal page
(D15). In `getNavigationItems`, change Get started's `href: '/'` to
`href: '/get-started'`; its sub-pages (`/overview/*`, `/migration`, the
external Changelog) are unchanged and match by exact value, so they don't need
to live under `/get-started/`. In `Navigation.tsx`, re-key `SECTION_ICONS`
from `'/'` to `'/get-started'` (the house icon stays). Nothing else treats `/`
as a section: `FooterNav` already skips `/`, and `not-found.tsx`'s Home link
and the Breadcrumb example rightly point at the home page. The static export
has no redirect layer and nothing links to `/get-started` yet, so no redirect is
needed — but grep before you finish:

```bash
grep -rn "href: '/'\|href='/'\|\['/'\]" docs/src
```

Expected: only the home-page links named above.

Create `docs/src/app/get-started/page.tsx` the same way as the Foundations page
below (metadata title `'Get started'`, description "Install Roadie and learn the
ideas behind it.", `RocketLaunchIcon` from `@phosphor-icons/react/ssr`, with the title "Choose a guide" and the description "How
to install Roadie, the philosophy behind it, and moving to v2.").

Create `docs/src/app/foundations/page.tsx`:

```tsx
import { CompassIcon } from '@phosphor-icons/react/ssr'

import { EmptyState } from '@oztix/roadie-components/empty-state'

export const metadata = {
  title: 'Foundations',
  description: 'The principles and conventions every Roadie component builds on.'
}

export default function FoundationsPage() {
  return (
    <EmptyState>
      <EmptyState.IconTile>
        <CompassIcon weight='bold' />
      </EmptyState.IconTile>
      <EmptyState.Title>Choose a foundation</EmptyState.Title>
      <EmptyState.Description>
        Layout, colour, type, motion and the rest of the system's groundwork.
      </EmptyState.Description>
    </EmptyState>
  )
}
```

In `docs/src/app/layout.tsx` `getNavigationItems`, give the Foundations
section `href: '/foundations'`. `getPageTitles` picks the new page's
`metadata.title` up from the filesystem; confirm `pageTitles['/foundations']`
is `'Foundations'`. `docs/src/app/components/page.tsx`: the description
becomes "Browse the list, or search it by name."

- [ ] **Step 2: Expanded state from the cookie (and the optional head script)**

`docs/src/components/useExpandedCookie.ts`:

```ts
'use client'

import { useCallback, useSyncExternalStore } from 'react'

import {
  NAVIGATOR_EXPANDED_COOKIE,
  serializeNavigatorExpandedCookie
} from '@oztix/roadie-core/navigator'

const listeners = new Set<() => void>()

const read = () =>
  document.cookie.split('; ').includes(`${NAVIGATOR_EXPANDED_COOKIE}=1`)

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useExpandedCookie() {
  const expanded = useSyncExternalStore(subscribe, read, () => false)
  const setExpanded = useCallback((next: boolean) => {
    document.cookie = serializeNavigatorExpandedCookie(next)
    listeners.forEach((listener) => listener())
  }, [])
  return [expanded, setExpanded] as const
}
```

`docs/src/app/layout.tsx` `<head>`, after the theme script:

```tsx
import { getNavigatorExpandedScript } from '@oztix/roadie-core/navigator'
// …
        <script dangerouslySetInnerHTML={{ __html: getNavigatorExpandedScript() }} />
```

- [ ] **Step 3: `?nav` shows the section list over a sub-page**

Next's `useSearchParams` in a prerendered page client-renders everything up to
the nearest `<Suspense>` (see
`docs/node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-search-params.md`),
so read it in a leaf that sits inside its own boundary rather than in
`DocsNavigator`, which wraps every page.

`docs/src/components/NavListQuery.tsx`:

```tsx
'use client'

import { useEffect } from 'react'

import { useSearchParams } from 'next/navigation'

export const NAV_LIST_PARAM = 'nav'

export function NavListQuery({ onChange }: { onChange: (next: boolean) => void }) {
  const showList = useSearchParams().has(NAV_LIST_PARAM)
  useEffect(() => {
    onChange(showList)
  }, [showList, onChange])
  return null
}
```

- [ ] **Step 4: `Navigation.tsx`**

1. Imports: drop `ComponentThumbnail`, and `List`/`ListIcon` if unused after
   the edit; add `Suspense`, `useRouter`, `useExpandedCookie`, `NavListQuery`,
   `NAV_LIST_PARAM`.
2. Delete `query`, `shownCategories`, `showComponentList` and the hand-authored
   `<Pane role='list' className='lg:w-72'>…</Pane>` (≈359-407).
3. State and wiring:

```tsx
  const router = useRouter()
  const [expanded, setExpanded] = useExpandedCookie()
  const [showList, setShowList] = useState(false)
  const handleShowListChange = useCallback(
    (next: boolean) => {
      router.push(next ? `${pathname}?${NAV_LIST_PARAM}` : pathname, { scroll: false })
    },
    [router, pathname]
  )

  return (
    <>
      <Suspense fallback={null}>
        <NavListQuery onChange={setShowList} />
      </Suspense>
      <Navigator
        value={value}
        onValueChange={handleValueChange}
        expanded={expanded}
        onExpandedChange={setExpanded}
        expandedFromDocument
        showList={showList}
        onShowListChange={handleShowListChange}
      >
        …
      </Navigator>
    </>
  )
```

   `router.push` (not `replace`), so the browser's Back undoes "show the list".
4. Sections: every section with sub-items gets a `Secondary` (D15) and its
   `href` (Step 1). Components is searchable and grouped by category:

```tsx
            <Navigator.Item
              key={section.href}
              value={section.href}
              href={section.href}
              icon={SECTION_ICONS[section.href] ?? <HouseIcon />}
            >
              {section.title}
              {section.href === '/components' ? (
                <Navigator.Secondary aria-label='Components' searchable>
                  {componentCategories.map((category) => (
                    <Navigator.Group key={category.name}>
                      <Navigator.GroupTitle>{category.name}</Navigator.GroupTitle>
                      {category.overviewHref ? (
                        <Navigator.Item value={category.overviewHref} href={category.overviewHref}>
                          Overview
                        </Navigator.Item>
                      ) : null}
                      {category.components.map((component) => (
                        <Navigator.Item
                          key={component.name}
                          value={`/components/${component.name}`}
                          href={`/components/${component.name}`}
                        >
                          {component.title}
                        </Navigator.Item>
                      ))}
                    </Navigator.Group>
                  ))}
                </Navigator.Secondary>
              ) : subItems.length > 0 ? (
                <Navigator.Secondary aria-label={`${section.title} pages`}>
                  {subItems.map((item) => (
                    <Navigator.Item key={item.href ?? item.title} value={item.href ?? item.title} href={item.href}>
                      {item.title}
                    </Navigator.Item>
                  ))}
                </Navigator.Secondary>
              ) : null}
            </Navigator.Item>
```

   The routeless `sectionPrefix` derivation (≈311-316) goes: every section now
   has a route, so `NavigationSection.href` becomes required and is the value. `Children.forEach` flattens
   the mapped arrays, so the walk still sees each Group and Item by reference.
5. Pinned, written last (Task 2 warns otherwise): the Appearance item
   (`placement='pinned'`), then `<Navigator.ExpandToggle placement='pinned' />`.
6. The Brand wordmark is `hidden navigator-expanded:inline` (Task 9); the
   variant already covers the pre-hydration case, so nothing is added here.
7. Detail pane: always `current` — Navigator puts the list on top on a section
   route and when `?nav` is set. Delete the `backHref` — Navigator links Back
   to the section route. Keep `Pane.Actions` with the On-this-page drawer.
8. Delete the comments at ≈330-332 and ≈356-357 (both describe code that no
   longer exists); add none.

- [ ] **Step 5: The landing thumbnails**

```bash
grep -rn "ComponentSkeleton\|ComponentThumbnail" docs/src
```

Expected: only `ComponentSkeleton.tsx` itself.
`git rm docs/src/components/ComponentSkeleton.tsx`.

- [ ] **Step 6: Verify**

`pnpm typecheck && pnpm lint`. With the dev server on 9614:

- 1440×900: `/components/button` shows the rail, the Components list (grouped,
  searchable, Button current) and the page; "inp" filters to Input.
  `/foundations` shows the Foundations list beside its empty state.
- Toggle ExpandToggle, reload with the cache disabled and the network throttled
  to "Slow 4G": the very first paint is already expanded — no collapsed frame.
  Collapse, reload: first paint collapsed.
- 390×844: tapping Components lands on `/components` with the list on top. Tap
  a row → the page pushes with a Back link to `/components`. On the page, tap
  the Components tab → the URL becomes `/components/button?nav` and the list
  covers the page with Button marked current; browser Back → the page again.
  Tap Get started → `/get-started` shows its list; open `/` → the home page
  shows with no list over it and no section tile lit.
- No console warnings from Navigator (routeless sections, pinned order).

- [ ] **Step 7: Commit**

```bash
git add docs/src/components/Navigation.tsx docs/src/components/useExpandedCookie.ts \
  docs/src/components/NavListQuery.tsx docs/src/app/layout.tsx \
  docs/src/app/foundations/page.tsx docs/src/app/get-started/page.tsx \
  docs/src/app/components/page.tsx \
  docs/src/components/ComponentSkeleton.tsx
git commit -m "docs: build the docs navigation on section routes, section panes and the expanded rail"
```

---

## Task 15: AGENTS.md exception, compound patterns, changesets

**Files:**
- Modify: `AGENTS.md`, `docs/contributing/COMPOUND_PATTERNS.md`,
  `docs/src/app/foundations/iconography/page.tsx`,
  `.changeset/navigator-list.md`

- [ ] **Step 1: AGENTS.md → Iconography**

Replace the **Weight** bullet with:

```md
- **Weight:** `bold` by default. `fill` only for active/selected states, and
  `duotone` only for large decorative icons above 48px, such as inside a big
  `IconTile` or an `EmptyState`. Never Regular, Thin or Light.
  **Exception:** `Navigator` destinations render `duotone` at `size-6` —
  Navigator applies it, so pass the bare icon. Everything else stays bold.
```

Also in AGENTS.md → Linking, add `Navigator.Item` and `Navigator.MenuItem` to
the `href` list (List.Item arrived from `main` in PR 2) and to the "`href`-only
— no `render` prop" note.

- [ ] **Step 2: Iconography foundation page**

In `docs/src/app/foundations/iconography/page.tsx`, add the same exception to
the weight guidance (one sentence and a link to `/components/navigator`).

- [ ] **Step 3: COMPOUND_PATTERNS.md §1.2 "One exception, by name"**

Rewrite the paragraph: `Navigator.Primary`'s walk matches `Navigator.Item`,
`Navigator.Group` (one level deep), `Navigator.Brand` and
`Navigator.ExpandToggle`; an item's children are matched for
`Navigator.Secondary` and `Navigator.Menu`; `Navigator.Secondary`'s rows are
matched for `Navigator.Item` and `Navigator.Group`. Same soundness argument,
same server-component caveat.

- [ ] **Step 4: Changeset**

Re-read `.changeset/navigator-list.md` (Task 0) against what shipped and add a
last paragraph naming the parts: "`Navigator.Menu`/`MenuItem`,
`Navigator.ExpandToggle`, `Navigator.OverflowPane`/`OverflowItems`,
`Navigator.SecondaryPane`/`SecondaryItems`; `showList`/`onShowListChange` to
show a section's list from the URL; `expandedFromDocument` with
`getNavigatorExpandedScript` from `@oztix/roadie-core/navigator`." Navigator and Pane are unreleased,
so there is no migration note.

- [ ] **Step 5: Commit**

```bash
git add AGENTS.md docs/contributing/COMPOUND_PATTERNS.md \
  docs/src/app/foundations/iconography/page.tsx .changeset/navigator-list.md
git commit -m "docs: record the Navigator duotone exception and its reference-matched parts"
```

---

## Task 16: Browser verification per breakpoint, then by hand

No code unless a check fails — a failure goes back to the task that owns it,
fixed TDD, and this task re-runs from the top.

**Setup:** `pnpm --filter @oztix/roadie-components build`; docs dev server on
9614; Playwright MCP. Every probe returns `innerWidth`.

- [ ] **Step 1: 1440×900 — centring, tooltips, pill, menus**

On `/foundations/colors`:

```js
() => {
  const rect = (s) => document.querySelector(s)?.getBoundingClientRect()
  const brand = rect('[data-slot="navigator-rail-brand"]')
  const pinned = rect('[data-slot="navigator-rail-pinned"]')
  const capsules = [...document.querySelectorAll('[data-slot="navigator-rail-cluster"] [data-slot="navigator-capsule"]')].map((c) => c.getBoundingClientRect())
  const top = Math.min(...capsules.map((c) => c.top))
  const bottom = Math.max(...capsules.map((c) => c.bottom))
  return { innerWidth, above: top - brand.bottom, below: pinned.top - bottom }
}
```

Expected: `above` and `below` within 2px of each other (centred between brand
and pinned, not the viewport). Then: hover a tile → tooltip inline-end after
the delay; slide to the next tile → instant; Tab through the rail → tooltip on
focus; click Foundations then Tokens → the pill slides vertically between
capsules; open Appearance's menu if it has one, or the Account example on
`/components/navigator` → the menu opens inline-end of the tile.

- [ ] **Step 2: Shorten the window — overflow into More**

Resize to 1440×620, 1440×480, 1440×360, running the centring probe plus
`document.querySelectorAll('[data-slot="navigator-rail-cluster"] [data-slot="navigator-item"]').length`
each time. Expected: the count falls as height falls, a More tile appears at the
end of the cluster, nothing overlaps brand or pinned, and resizing produces no
visible flicker (watch a screen recording or take screenshots mid-resize). Open
More → the More pane is the leading column with the rail's folded rows only.

- [ ] **Step 3: Expanded**

Click ExpandToggle at 1440×500: labels fade in, the rail snaps wide, capsules
top-align under the brand, the cluster scrolls while brand and pinned stay put,
More disappears (nothing folds), the pill tracks full-width rows, tooltips no
longer appear. Menus still open inline-end of their row.

- [ ] **Step 3b: Expanded before hydration**

With the rail expanded, reload `/foundations/colors` with the cache disabled
and "Slow 4G" throttling, taking a screenshot as soon as anything paints:
the first paint shows the expanded rail. Collapse, reload: the first paint is
collapsed. A Navigator example on `/components/navigator` stays collapsed while
the site rail is expanded. Then confirm in the compiled CSS that the variant
came through, by probing the live stylesheet:

```js
() => ({
  innerWidth,
  variantRules: [...document.styleSheets]
    .flatMap((sheet) => { try { return [...sheet.cssRules] } catch { return [] } })
    .filter((rule) => rule.selectorText?.includes('data-from-document')).length
})
```

Expected: a non-zero count — every `navigator-expanded:` class the components
use compiled to a rule scoped to the rail.

- [ ] **Step 4: 900×900 — rail with stacked panes**

On `/components/button`: rail visible, the Components list pane and the detail
stack (only the detail visible); Back in the detail header is a link to
`/components`, where the list is on top; tapping a row pushes the detail again. Probe that covered panes report
`getComputedStyle(pane).visibility === 'hidden'`.

- [ ] **Step 5: 1600×900 — columns**

List pane, detail and (from `2xl`, 1536) the inspector sit side by side; the
list pane is 24rem; More, when opened from the keyboard (shorten the window
until it appears, then Tab to it and press Enter), takes the leading column
instead of the section pane and focus lands on its "More" title; Escape
returns focus to the More tile.

- [ ] **Step 6: 390×844 — the phone bar**

Icon-only bar, five slots at most, More shows the ellipsis, the pinned item is a
circle on the trailing edge, badges are corner dots. Tap Components → the URL is
`/components` and its list pane is on top; tap a row → the detail pushes with a
Back link to `/components`; tap the active Components tab → the URL gains
`?nav` and the list covers the page with the row current; browser Back → the
page; tap the tab again with the list showing → `?nav` is removed. Scroll the detail → the bar collapses to the active circle
and the pinned circle (D4), and the middle stays transparent to taps (the Phase
3 `elementFromPoint` probe, `docs/plans/2026-07-28-navigator-phase-3-tab-bar-plan.md`
Task 1 Step 1). Open a pinned item's menu → it opens above the tab. Open More,
then a folded menu row → the menu opens below the row. No tooltips anywhere.

- [ ] **Step 7: By hand**

- macOS "Reduce motion" on: the pill jumps, labels appear without fading, panes
  swap without sliding, menus and tooltips appear without scaling.
- A touch device: swipe a `Drawer` (the docs' On-this-page drawer) closed; a
  long-press on a rail tile at tablet width shows no tooltip.
- VoiceOver on the rail: capsules announce as lists named by their group, a
  collapsed tile reads its label once (not twice), a badge reads its label, the
  ExpandToggle announces its state.

- [ ] **Step 8: Final gate and report**

```bash
cd packages/components && pnpm vitest run 2>&1 | tee /tmp/nav-final.txt | tail -5
grep -c "not wrapped in act" /tmp/nav-final.txt
cd ../.. && pnpm typecheck && pnpm lint
```

Expected: green, act-warning count ≤ the Task 0 baseline. Report every
breakpoint's probe output and any by-hand check not done.

---

## Spec coverage

| Spec section | Task |
| --- | --- |
| Delivery (rebase, stripped titles) | 0 |
| §1 Large collapsed: brand, capsules, pinned, centred cluster, tooltips | 8, 11 |
| §1 Large expanded: labels, top-aligned, scrolls, nothing folds | 9 |
| §1 Small: floating bar, groups flatten, pinned circle, ellipsis More, no ExpandToggle | 2, 9, 10 |
| §2 Removed: End, `tabs`, Panel, Overflow rename, nested rail, strip | 2, 3, 4, 5 |
| §2 New: `placement`, `visibilityPriority` | 1, 2 |
| §2 New: `expanded`/`defaultExpanded`/`onExpandedChange`, `ExpandToggle`; persisted state without a flash | 9, 9B, 14 |
| §2 New: `searchable`; `SecondaryPane` + `SecondaryItems`; `Menu` + `MenuItem` | 5, 6, 3 |
| §2 GroupTitle visible expanded / in More, sr-only collapsed | 8, 9, 4 |
| §3 Ranking pure function; small capacity; large capacity from height; expanded no fold | 1, 2, 8, 9 |
| §3 Edges: folded Menu row anchors to row; folded current section lights More; ≤5 no More | 3, 8, 2 |
| §4 Section selection, generated pane, stacking, one pane at a time, no pane without Secondary, override, currency; section routes, Back link, `showList` | 5, 6, 7, 14 |
| §4 Menu behaviour, anchoring, never navigates, Secondary wins | 3 |
| §5 Colour, duotone, More/Expand icons, pop-tap, AGENTS exception | 10, 9, 15 |
| §5 Pill everywhere | 10 |
| §5 Tooltip labels, hidden accessible names | 11 |
| §5 Badge `hideLabel` corner dot | 12 |
| §5 Surfaces, expand/collapse motion | 8, 9, 10 |
| §5 Accessibility | 3, 8, 9, 11, 13, 16 |
| Deleted code | 2, 3, 5, 8 |
| Docs-site migration | 14 |
| Testing: unit, browser per breakpoint, by hand | every task; 16 |

## Settled questions

The user answered the four open questions on 2026-09-12; the decisions above
and the tasks now carry the answers. What was decided in carrying them out —
review before implementation starts:

1. **Every section has a route (D7).** On the section route the list pane is
   on top on stacked layouts, whatever the consumer's detail pane says, so the
   docs detail pane is simply always `current`. *Settled by the user:* Get
   started moves to `/get-started` so the home page `/` is never covered by a
   list (D15, Task 14).
2. **Section memory retires for sectioned items (D7a).** A section tab always
   links to its route; memory only retargets items without a Secondary.
   *Approved by the user as a deliberate decision.*
3. **Routeless sections still work, with a dev warning (D7b)**, rather than
   failing — no Back is supplied for them.
4. **`showList` / `onShowListChange` (D7c).** Opt-in: without the callback, the
   active section tab links to the section route; with it, the tab asks for the
   list over the current page. Selecting a row clears it by navigating. The
   docs name the parameter `nav` and use `router.push`, so browser Back undoes
   it. `useSearchParams` sits in its own `<Suspense>` leaf so the docs stay
   prerendered.
5. **Expanded styling is one `navigator-expanded` variant (D14).** *Settled by
   the user.* Every expanded style is written once; the variant, shipped in
   `@oztix/roadie-core/css`, matches a rail that has `data-expanded` or — for
   static sites that opt in — `<html data-navigator-expanded>` plus
   `data-from-document` on the rail. It is scoped to the rail, not the root, so
   nested example Navigators never follow the site rail. The head script at
   `@oztix/roadie-core/navigator` (a subpath beside `/theme`) is optional; SSR
   apps pass `defaultExpanded` from the cookie instead (Tasks 9, 9B, 14).
6. **Pinned-first warning (D2)** covers pinned Items, Groups and a pinned
   ExpandToggle.
7. **More pane focus (D5)** goes to its `Pane.Title` (or the pane when it has
   none) on open; Escape returns focus to whichever More control opened it.
