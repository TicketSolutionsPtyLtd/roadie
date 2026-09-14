# Pane columns — design

Approved in conversation on 2026-09-14, from the proposal at
`.superpowers/sdd/2026-09-12-navigator-section-roots-plan/pane-columns-proposal.md`
(prototype: `/Users/lukebrooker/.claude/jobs/5c8e278a/tmp/panes/`). All ten
open questions were settled with the recommended answers; they are folded in
below. Extends `2026-09-11-navigator-redesign-design.md` §4 and
`2026-09-12-navigator-section-roots-design.md`, and replaces the viewport-`lg`
arrangement rule in both.

## Goal

The **container** decides how many pane columns fit, the **left-most pane
drops first**, and **one rule** picks the header's leading button at every
width, phones included. The server render is exact, and nothing measures or
observes.

## 1. What decides how many columns fit

`Navigator.Content` becomes a size container named `panes`. Its panes lay out
in an inner row, `data-slot='navigator-panes'`, so the row's own padding can
depend on the tier (a container can't query itself).

Tokens, as TypeScript constants in `paneColumns.ts` (container conditions
can't read `var()`, so they compile to literals):

| Constant | Value | Meaning |
| --- | --- | --- |
| `PARENT_TRACKS` | see below | Each parent track's minimum, share and maximum, by tier and depth |
| `PANE_MIN_FILL` | `28rem` | Minimum for the right-most (filling) column |
| `PANE_INSPECTOR` | `14rem` | The inspector track (today's `w-56`) |
| `PANE_GAP` | `0.75rem` | Column gap and row padding (today's `gap-3` / `p-3`) |
| `PANE_ROW_PADDING` | `1.5rem` | Both sides of the row's padding |
| `PANE_MAX_COLUMNS` | `3` | Cap on navigation columns (HIG, iPad) |
| `PANE_MAX_DEPTH` | `3` | Depths 0–3: four levels |

Tiers, measured on Content's inline size:

| `C` | Condition | ≈ viewport with an 80px rail |
| --- | --- | --- |
| 1 (stacked) | below 46.25rem | below about 840px |
| 2 | `≥ 46.25rem` (740px) | 1024 |
| 3 | `≥ 67rem` (1072px), from the root; `≥ 71rem` (1136px) once the window slides past it | 1280, and 1440 with the sidebar expanded |

Formula: `tier = Σ parent minimums + 28 + (C−1)·0.75 + 1.5` rem, the parents
being the visible columns left of the fill. There is no tier 4: the window
never shows more than three navigation columns. Below a row's tier the
left-most pane drops, so a detail in the middle column is never squeezed under
its minimum: it becomes the left column of two instead.

**Sizing is by position and depth.** The right-most visible column fills
(`flex: 1 1 0`). Every visible column to its left takes a parent track of
`min(C, N)` columns, N the stack levels in the row, so a two-level row keeps
the wider `C=2` list at `C=3`. The row's root (depth 0) navigates and takes
the narrow track; a pane under it holds content and takes the wider one.
Depth, not `role`: `role` is a default depth, and a page-first root that
lists its own items is a root.

| Tier | Root | Under the root |
| --- | --- | --- |
| `C=2` | `16rem`, `40cqi`, `24rem` | `16rem`, `40cqi`, `28rem` |
| `C=3` | `16rem`, `25cqi`, `20rem` | `20rem`, `30cqi`, `28rem` |

(minimum, share, maximum). Each track is
`clamp(min, min(share, (100cqi − reserved) × min / Σ min), max)`: the room
beside the fill's minimum is split by the parents' minimums, so every parent
reaches its own at the tier and the fill never drops below 28rem. Two columns
keep one floor, because below it the parent leaves the screen rather than
handing its room to a pane beside it. A 30% share is the largest that leaves
the fill growing from the `C=3` tier (20rem at 67rem).

Measured on a Tickets → event → ticket row (Content beside an 80px
navigation at 1000, 1200 and 1440, and a 240px one at 1440):

| Content | Before | After |
| --- | --- | --- |
| 920px | 368 \| 528 | 368 \| 528 |
| 1120px | 280 \| 280 \| 524 | 277 \| 336 \| 471 |
| 1360px | 320 \| 320 \| 684 | 320 \| 408 \| 596 |
| 1200px | 300 \| 300 \| 564 | 300 \| 360 \| 504 |

When a sub-detail opens, the detail stops being "the detail" and becomes a
parent column, and keeps the wider track.

## 2. Which panes show

Every stack pane has a **depth**: 0 the root, 1 the detail, 2 the sub-detail,
3 the deepest allowed. **T** is the depth of the deepest `current` pane, or 0
when the root is revealed (section route, `showList`, More open). Each pane
gets a **rank**:

```
behind or top (d ≤ T):  rank = T − d        top = 0, its parent = 1, …
ahead (d > T):          rank = d            after every behind pane
visible  ⇔  rank < C
```

Behind panes outrank ahead panes, so the window is contiguous: context before
placeholders.

```
Tickets → Glamping → Sam (Sam current, T=2)

C=1                     C=2                               C=3
┌────────────────┐      ┌──────────┬──────────────────┐   ┌────────┬────────┬───────────────┐
│ ‹              │      │ ‹        │ ✕                │   │ Tickets│Glamping│ ✕             │
│ Sam Okafor     │      │ Glamping │ Sam Okafor       │   │        │        │ Sam Okafor    │
└────────────────┘      └──────────┴──────────────────┘   └────────┴────────┴───────────────┘

Tickets → Glamping, root revealed (?nav) or a placeholder detail (T=0)

C=1                     C=2
┌────────────────┐      ┌──────────┬──────────────────┐
│ Tickets        │      │ Tickets  │ Glamping / empty │   ahead pane fills leftover columns,
└────────────────┘      └──────────┴──────────────────┘   no Back, no Close
```

- **Depth after registration is compacted.** Once panes have registered,
  they are ordered by declared `depth` (or the role default), DOM order
  breaking ties, and numbered from 0, so there are never holes. The same
  declared or default depth is what the server and hydrating renders write,
  and that is what makes the server HTML exact for the cases that need it.
- **The inspector is never ranked.** It shows only when every stack level that
  exists fits beside it, and it yields first: `inspectorTier(N)` is the
  narrowest Content at which the fill keeps 28rem beside the parent tracks'
  actual widths, not their minimums, whichever pane is the top — 46.25rem
  with one level, 69rem with two, 93.75rem with three and 101.75rem with
  four. It takes a column only once the row has
  columns: the stacked tier positions its panes absolutely, so a one-level
  row waits for the two-column tier. It never outranks the root. Its
  small-screen affordance stays the consumer's `Drawer`, and Roadie ships a `pane-inspector-yielded:` variant from the same
  conditions so the trigger shows exactly when the column is gone.
- **More** opens as a revealed depth-0 pane (T=0), the same mechanism as
  `showList`. While open it replaces the row's other depth-0 pane; closed, it
  is not drawn at all. It never takes a rank: the consumer's panes keep their
  depths, so a page-first detail stays depth 1 (`More | detail` from `C=2`).
- **Four levels** (depths 0–3) work by sliding the window: A → B → C → D with
  D current at `C=3` shows `B | C | D`, Back on B to A. A fifth stack pane is a
  dev warning; that is a navigation design problem, not a layout one.
- **A stack with one pane** (a page-first section's own route, a standalone
  docs example) has that pane as depth 0: root, filling, no buttons.

## 3. Header buttons

One leading cell, at most one glyph, decided from the same `(C, T, depth, N)`
table:

| Pane is… | Leading cell |
| --- | --- |
| Root (depth 0) | nothing, ever |
| **Left-most visible**, non-root, at or behind top | **Back** `‹` |
| Top, with its parent visible to its left | **Close** `✕` |
| A middle column (parent visible, not top) | nothing |
| Ahead (unreached or placeholder) | nothing |
| Inspector | the consumer's own, unchanged |

- **Phones use the same rule.** At `C=1` the only visible pane is the top, so
  it is the left-most visible and gets Back — the same pane and the same Back
  as today, stated once instead of `lg:hidden` / `max-lg:hidden`.
- **Back goes to the parent route, one level up** (`backHref` → the parent
  route; `onBack` as a handler). On Glamping in `Glamping | Sam` that is
  `/tickets`, which unmounts Sam; the browser's Back restores him. One meaning
  at every width, it works before hydration and it always changes the view.
  There is no reveal-in-place.
- **Close goes to the same target as that pane's Back.** It only ever draws
  where going up *is* closing that column, so `backHref` may now drive Close
  as a link. `onClose` still overrides; `onBack` is unchanged. A ✕ never draws
  on a middle column.
- **Targets for non-top panes.** Each pane's own `Pane.Header backHref` /
  `onBack`. The orchestrator supplies the section route to the **depth-1**
  pane under a generated (or overridden) section list, whether or not it is
  the top, except while that pane is `ahead`. Scroll chrome stays top-only.
- **The label.** Back is always the round icon button; `backLabel` (the orchestrator fills it for the depth-1 pane from the active section) only names it `Back to Tickets`.
- **The header collapse.** A header whose only content is the leading cell
  hides with it, through a third variable, so a middle column's header with no
  title disappears in the same tier.

## 4. Mechanism: CSS decides, JS declares

**Markup facts.** JS writes three attributes and never measures:

| Attribute | On | Meaning |
| --- | --- | --- |
| `data-depth="0..3" \| "deep"` | every non-inspector pane | resolved depth (declared or role default before registration, DOM order between equals after); `deep` past 3 |
| `data-current` | a pane | `current` (More: `overflowOpen`) |
| `data-reveal` | the row | the root is revealed: section route, `showList`, or More open with a pane to show |
| `data-stack` | a pane inside an orchestrator | participates in the stack (never an inspector, never a pane inside another pane's content) |
| `data-level="0|1"` | the row and each stack pane | nesting level, from context |
| `data-overflow` | the More pane, and the row while More is open | More's identity, and More open with a pane to show |

**Generated CSS.** `packages/components/src/css/pane-columns.css` is emitted
by `scripts/generate-pane-columns.mjs` from `paneColumns.ts` — the one table —
and imported by `components.css`. A test regenerates it in memory and fails if
the committed file drifts. Per `(level, C, N, T, depth)` one rule, keyed with
`@container panes (width >= tier)` plus `:has([data-stack][data-depth=k]…)` on
the row, sets three custom properties (`--pane-back`, `--pane-close`,
`--pane-edge`, each `grid` or `none`) and the geometry (stacked: `translate`
and `visibility`; columns: `position: relative`, `flex`, `order`). The header
and its two cells read the properties as their `display`. Each row's
rules sit under its own tier, ascending, so a wider tier wins; a row with fewer
levels than three is left to the two-column rules it already fills. Two levels
× 122 combinations (two root bases) is 244 pane rules plus the statics, about
4KB gzipped. The file is
wrapped in `@layer components`, so Tailwind utilities on a pane (a consumer's
`className`, the `data-instant` transition cut) still win, while the `!important`
on `position` beats Base UI's inline `position: relative`. The rules that hide
(a closed More, the root under an open More, a yielded inspector) are
`display: none !important`, so a display utility can't keep them on screen; a
shown inspector gets no display from the sheet and keeps the consumer's.

**Standalone defaults.** A pane with no orchestrator sets the same properties
from its own depth: depth 0 draws nothing, any other depth draws Back and
never Close. Standalone docs examples with a Back target show it at every
width, which matches their demos.

**Transitions.** In the stacked tier push and pop slide as today, derived from
depth and T. In column tiers nothing animates: `transition: none` on every
column, so a narrowing that drops a column and a navigation that pushes one
both cut. View Transitions for column shifts are a later, additive step. Two
things to verify in the real build, not the prototype: crossing from `C=2` to
`C=1` must not play a stray slide on the dropped column (the fallback is to
enable stacked transitions only during a navigation, inverting today's
`data-instant` into `data-pushing`), and a nested Navigator's panes must not
be counted by the outer row (the level attribute scopes both the `:has()`
counts and the subject).

**What JS keeps.** `positionOf` / `chromeOf` / `isRootOf` stay for
width-independent concerns — scroll chrome, `primaryNav`, `data-stack-position`
for tests and consumers — and `depthOf` joins them. `paneStack.ts` gains
`provisionalDepth` and `resolveDepths`; `paneColumns.ts` owns the table, and a
test checks the two agree (JS `top`/`behind`/`ahead` equal the table's `C=1`
states for every stack it can produce).

## 5. API impact

- **New `Pane depth?: 0 | 1 | 2 | 3`.** Defaults: `list` → 0, `detail` → 1,
  the generated section pane, a `SecondaryPane` override and More → 0,
  `inspector` → none. A sub-detail declares `depth={2}`. After registration
  depths compact (§2); a pane whose resolved depth is deeper than it declared
  gets a dev warning.
- **New `Pane.Header backLabel?: string`.** Back's accessible name only; Back
  is always the round icon button. The orchestrator fills it for the depth-1
  pane under a section list.
- **Changed `Pane.Header backHref`.** Also drives Close where Close shows.
- **Changed `Pane.current`.** It decides T, and so which columns are in the
  window at every width — it no longer "does nothing above `lg`".
- **New `pane-inspector-yielded:` variant** (`@oztix/roadie-components/css`),
  read from the row of the nearest `Navigator.Content`, one per level.
- **No `minWidth` prop.** Container conditions can't read `var()`; the tokens
  are build-time constants.
- **Migration of the viewport rules:**

  | Today | Becomes |
  | --- | --- |
  | `paneVariants.stackPosition` `max-lg:*` | the stacked tier, generated from depth and T |
  | Content `lg:flex lg:p-3 lg:ps-0`, `gap-3` | the row, column tiers |
  | list `lg:w-[clamp(16rem,40%,24rem)]`, detail `lg:flex-1` | parent track and fill, by position |
  | inspector `2xl:w-56 max-2xl:hidden` | the inspector rule, `inspectorTier(N)` |
  | Header Back `lg:hidden` / Close `max-lg:hidden`, `edgeOnly` | `display: var(--pane-back / --pane-close / --pane-edge)` |
  | Overflow `lg:-order-1 lg:hidden` | `data-overflow` on the pane and the row |
  | Consumer `2xl:hidden` on the inspector drawer trigger | `hidden pane-inspector-yielded:inline-flex` |

  The nav form (`md`: rail or tab bar), `max-md:pb-24`, and whatever the Pane
  pass ships at `md` for stacked panes (inset, radius) stay on the viewport:
  page-level layout is media queries, component-level is container queries.

## 6. Docs

- Pane: delete "a docs example's breakpoints are still the viewport's" —
  frames respond to their own width. Rewrite Roles (inspector), Stacking and
  "Closing a column" around the §3 table; say `backLabel` names Back; add the
  guideline "render a placeholder detail on the root route (Mail's 'No message
  selected'), or the list fills the row alone". Update Guidelines and
  Accessibility.
- Navigator: "Panes", "Pane header" and "Pane surfaces and the mobile stack"
  stop saying `lg`; the docs site's inspector trigger uses the variant.
- Changeset: `depth`, `backLabel`, Close from `backHref`, the variant.

## 7. Edge cases

- **Two undeclared `detail`s** both default to depth 1 in the server render;
  after registration DOM order makes them 1 and 2, with a dev warning. Declare
  `depth={2}` to make the server render exact.
- **A page-first section's own route** renders the page alone: provisional
  depth 1 (role default), resolved 0. Nothing visible changes and no warning
  fires (the pane resolved shallower, not deeper).
- **A fifth stack pane** (resolved depth 4) is written `data-depth="deep"`: it slides in like a push and covers the row above every column while current, draws Back and never Close, and warns once in development.
- **A third nesting level** likewise warns; two levels are generated.
- **`onClose` with no Back target** draws Close only; the header hides with it
  where Close does not show.
- **Reduced motion:** the stacked transition is inside
  `prefers-reduced-motion: no-preference`.

## 8. Testing

- `paneColumns.test.ts`: the tier thresholds; the prototype's evidence table
  (visible panes and buttons at 375, 760, 932, 1188, 1348 for three levels,
  two levels, and the revealed root); agreement with `derivePositions`; the
  committed CSS equals the render.
- `paneStack.test.ts`: `provisionalDepth` and `resolveDepths`.
- `Pane.test.tsx`: `data-depth` / `data-stack` / `data-current` / `data-level`;
  standalone defaults; Back from depth, Close from `backHref`; `backLabel` as
  Back's `aria-label`; the header's edge-only display variable.
- Navigator tests: the row's `data-reveal` / `data-overflow`; More's
  attributes; the depth-1 pane's `backHref` and `backLabel` under a section
  list, including a three-level stack; the nested level attribute; server
  render of depths for declared and default cases, hydrating without a
  mismatch or an attribute change.
- Browser, at container widths 375, 760, 932, 1188 and 1348 (three levels,
  two levels, revealed root), the docs site at 390, 1024 and 1440, and a phone:
  visible panes, widths, which button draws and where it leads, the inspector
  and its trigger, the 2→1 narrowing, and a nested Navigator.
