# Pane columns Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `Navigator.Content` decides how many pane columns fit from its own
width, the left-most pane drops first, and one rule picks each header's
leading button (Back, Close or nothing) at every width — from CSS generated
out of one TypeScript table, so the server render is exact and nothing
measures.

**Architecture:** `paneColumns.ts` (in `Pane`) holds the tokens, the tier
formula and `paneCell(columns, top, depth, levels)`; a script renders it into
`src/css/pane-columns.css` (container queries plus `:has()` on
`data-depth` / `data-current` / `data-reveal`), and a test fails when the
committed file drifts. `Pane` gains `depth` and writes the attributes;
`Navigator.Content` resolves depths from DOM order after registration, wraps
its panes in a `data-slot='navigator-panes'` row and hands the section route
plus label to the depth-1 pane. `Pane.Header` renders Back and Close whenever
they have a target and lets three custom properties decide which one draws.

**Tech Stack:** React 19, TypeScript strict, Tailwind v4 (container queries,
`@custom-variant`), Node 24 (runs `.ts` modules with type stripping), Vitest +
React Testing Library (`renderToString` / `hydrateRoot` for SSR tests),
Next.js 16 static-export docs, Playwright MCP for browser checks.

**Spec:** `docs/plans/2026-09-14-pane-columns-design.md` (binding, approved).
Its source is
`.superpowers/sdd/2026-09-12-navigator-section-roots-plan/pane-columns-proposal.md`,
and the prototype is `/Users/lukebrooker/.claude/jobs/5c8e278a/tmp/panes/`
(`prototype.html`, `gen.mjs`). Read the spec in full; read the proposal's
"Prototype evidence" and the generator when a number needs checking.

**Depends on queued work that lands first, in order:**

1. **The Pane pass** — instant section switches on phones, and raised/inset
   panes at `md`. It changes `paneVariants`, `navigatorContentVariants` and
   the `data-instant` mechanism in `NavigatorContent`.
2. **The performance pass** on the React Compiler branch
   (`.claude/worktrees/compiler`, `perf/compiler`) — a context split,
   ResizeObserver deferral, a scroll sentinel, panes that slide then resize
   during expand, and `NavigatorContent` reading a `registered` snapshot
   instead of a ref plus version counter (`ac74e759`).

So this plan names **functions and behaviours, not line numbers**. Where a
task says "the effect that …" or "the memo that …", find it by what it does.
Before each task, `git status`, `git log -5`, and read the file as it is.

## Global Constraints

Every task's requirements implicitly include this section.

- **Repo and branch.** `/Users/lukebrooker/Code/roadie`, branch
  `feat/navigator-component`, local only — never push, never touch `origin`.
- **Never run destructive git commands:** no `git checkout <rev> -- .`,
  `git reset --hard`, `git clean`, `git stash` (the user has stashes), rebase or
  branch deletion. To compare against an older commit, use `git show <rev>:<path>`
  or a throwaway worktree.
- **Staging:** `git add -u` plus explicit new/renamed/deleted file paths. Never
  `git add` a directory, `.` or `-A` — `docs/src/app/debug/pane-stack/` is the
  user's untracked file if present; never stage, edit or delete it.
- **Commit messages end with:**
  ```
  Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01J2XyGkf7FffFKRf9Ej334a
  ```
- **Names.** `Navigator.Primary` is one component in two orientations —
  `data-slot="navigator-primary"` + `data-orientation="vertical" | "horizontal"`;
  parts `navigator-primary-*`; variants `navigatorPrimary…`; CSS vars
  `--navigator-primary-*`; `group/primary`; surfaces `'vertical' | 'horizontal'`.
  **The retired desktop term (regex `(^|[^t])r[a]il`) appears nowhere** in
  anything written — code, identifiers, tests, comments, docs, changesets, this
  plan. Gate: `grep -rniE '(^|[^t])r[a]il' packages/components/src docs/src docs/contributing AGENTS.md .changeset --exclude-dir=node_modules --exclude-dir=dist` prints nothing.
- **Comments are minimal — ideally none.** One terse line only for what the
  code can't say (a quirk, a workaround, a non-obvious why). Public-prop JSDoc
  is one short sentence (the docs Props table reads it), plus `@default` where
  it applies. Never narrate, restate code, or mention plans, tasks, decisions
  or branches. This wins over any comment text in this plan's snippets — trim
  when copying. Trim narrating comments in the existing lines each task edits.
- **Literal unions on public props; no `VariantProps<…>['key']` on public
  props.** `depth?: 0 | 1 | 2 | 3` is written inline and also exported as
  `PaneDepth`.
- **Dev warnings** are gated on `isDev()` from
  `packages/components/src/utils/isDev.ts` (`process.env.NODE_ENV` with a
  `typeof process` guard), and live in effects, never in render — React 19
  StrictMode double-invokes render.
- **Every rendered leaf carries a kebab-case `data-slot`.**
- **React 19 ref-as-prop.** No `forwardRef`; `ref` is an ordinary prop.
- **SSR parity.** The server render and the first client render must match:
  everything a depth, a position, a Back link or a label depends on is
  computed during render from props and context, never from an effect, a ref
  or `location`. `NavigatorServerRender.test.tsx` is the gate — every new
  render-time fact gets a `renderToString` assertion and a `hydrateRoot` case
  with `onRecoverableError` and `console.error` both unfired.
- **Roadie never reads `location`.** Depth comes from `depth`, `current`,
  `value` and `showList`, all derived by the app from its URL.
- **`Navigator` imports from `Pane`, never the reverse.** `paneColumns.ts`
  lives in `Pane` and imports nothing from `Navigator`; `paneStack.ts`
  (Navigator) imports from it.
- **No `matchMedia` and no `ResizeObserver` for layout in
  `packages/components/src`.** JS owns membership and depth; CSS owns which
  surface shows and how wide it is. The generated CSS is the only place a
  width appears.
- **Only `translate` / `scale` / `opacity` animate.** Column tiers animate
  nothing (`transition: none`).
- **Imports go at the top of files (merge duplicates).** Shared test helpers
  live in `packages/components/src/components/Navigator/testUtils.tsx`; every
  `Navigator.Primary` fixture includes `{testBrand}` from there, or Primary's
  no-brand warning fires and dirties stderr.
- **Tests:** `cd packages/components && pnpm vitest run <path>` (add `-t '<name>'`
  to narrow; the `pnpm --filter … test -- <file>` form does not filter).
  **Act-warning baseline is 0** for the whole suite, Navigator and Pane — keep
  it 0: `cd packages/components && pnpm vitest run src/components/Navigator src/components/Pane 2>&1 | grep -c "not wrapped in act"` prints `0`.
  Every test that renders a generated pane or a `Pane` must
  `await flushViewportMeasurement()`. Tests that assert pristine stderr
  (`vi.spyOn(console, 'error')`, `warn` spies asserting `not.toHaveBeenCalled`)
  must stay clean — a new dev warning that fires in an existing fixture is a
  defect in the fixture or the warning.
- **Prove every new assertion fails against the unfixed code** before
  implementing (the "run to verify it fails" steps are not optional).
- **`react-hooks/exhaustive-deps` is not registered** in `packages/components`
  — an `eslint-disable` for it is a lint error. `@typescript-eslint/no-unused-vars`
  ignores only *arguments* matching `^_`, not destructured rest siblings. On
  the compiler branch the React Compiler lint rules are on: no `??=` or `x++`
  inside callbacks, no reading refs during render.
- **Prettier** on every `.ts`/`.tsx`/`.mjs`/`.css` touched
  (`pnpm --filter @oztix/roadie-components exec prettier --write <files>` /
  `pnpm --filter docs exec prettier --write <files>`); **never run Prettier on
  `.mdx`** — edit by hand. The generated `pane-columns.css` is exempt: the
  script owns its formatting, and `.prettierignore` gets its path.
- **Docs are a static export** (`docs/next.config.mjs`: `output: 'export'`) —
  no `next/headers`. **Never run `pnpm --filter docs build`.** The docs resolve
  `@oztix/roadie-components` from `dist`: after changing `packages/components`,
  run `pnpm --filter @oztix/roadie-components build` before `pnpm typecheck`
  or the docs dev server sees the change.
- **Browser work** (Task 9 only): build the packages
  (`pnpm --filter @oztix/roadie-core build && pnpm --filter @oztix/roadie-components build`),
  then a docs dev server on port **9721** — but if one is already running
  (`lsof -iTCP -sTCP:LISTEN | grep node`), reuse it and never kill it (Next
  refuses a second in the same folder). Start with
  `pnpm --filter docs exec next dev --port 9721`; stop it when done. Use the
  Playwright MCP tools; every probe reports `innerWidth` (an all-zero rect
  earlier in this project was the hidden surface). The Playwright browser is
  shared — open a fresh page.
- **Verification gate at every commit:**
  `cd packages/components && pnpm vitest run src/components/Navigator src/components/Pane`,
  then `pnpm --filter @oztix/roadie-components test`, `pnpm typecheck`,
  `pnpm lint` at the root. If CI's typecheck disagrees with local, delete every
  `tsbuildinfo` (`find . -name "*.tsbuildinfo" -not -path "*/node_modules/*" -delete`)
  and re-run.
- **Keep `pnpm typecheck` green at every commit.** Changing a context field
  means migrating every reader in the same task.
- **Implementers never dispatch subagents or reviewers.** If something is
  unclear, report NEEDS_CONTEXT with specifics instead of guessing.
- **Other agents are committing on this checkout and in
  `.claude/worktrees/compiler`.** Before each task, `git status` and
  `git log -5`; build on what is there, never revert their hunks, and edit
  `.changeset/navigator-list.md` as it reads at that moment.

## Decisions recorded where the spec is ambiguous

- **S1 — Depth after registration is the pane's index among stack panes in
  DOM order**, full stop. A declared `depth` and the role default exist for
  the server render and the hydrating render only (`provisionalDepth`). The
  dev warning fires when a pane resolves *deeper* than it declared or
  defaulted; resolving shallower (a page-first section's root, whose `detail`
  defaults to 1 and resolves to 0) is silent, because nothing visible changes.
- **S2 — The generated CSS lives in `@oztix/roadie-components/css`**, as
  `packages/components/src/css/pane-columns.css` imported by `components.css`,
  in `@layer components`. Utilities (a consumer's `className`, the
  `data-instant` cut) keep winning; `position: absolute !important` in the
  stacked tier beats Base UI's inline `position: relative`. Core owns nothing
  here: the table is component code.
- **S3 — The generator is `scripts/generate-pane-columns.mjs`** (the existing
  scripts are `.mjs`), importing `../src/components/Pane/paneColumns.ts`
  directly — Node 24 strips types. So `paneColumns.ts` uses only erasable
  syntax and `import type`, and never imports a runtime value.
- **S4 — Cells are `display: grid | none` from static rules in the generated
  file**; the header's edge-only display is a cva variant carrying
  `[display:var(--pane-back)]` (etc.) in place of `grid`, because a plain rule
  in `@layer components` would lose to the header's `grid` utility.
- **S5 — Back's accessible name becomes `Back to <label>` when a label is
  present**, else `Back`. Tests that find Back by exact name are rewritten to
  `/^Back\b/` and `[aria-label^="Back"]` in Task 5.
- **S6 — The orchestrator's back chrome goes to the depth-1 pane unless its
  position is `ahead`.** Ahead panes never draw Back, and withholding it keeps
  the server-render tests that assert "no Back on the section route" true in
  the DOM, not just visually.
- **S7 — More.** The More pane keeps `role='list'`, `current={overflowOpen}`,
  provisional and resolved depth 0, and carries `data-overflow`. The row
  carries `data-overflow` while More is open, which also sets `data-reveal`.
  Static rules hide the More pane while closed and the row's other depth-0
  stack pane while it is open. `navigatorOverflowVariants` is deleted.
- **S8 — Row padding and gap in column tiers come from the generated CSS
  (`0.75rem` each).** If the Pane pass has put an `md:` inset on Content or
  the row for stacked panes, move it onto the row unchanged; the values agree
  and the thresholds already count 1.5rem of padding.
- **S9 — The Back label's container is the header** (`pane-header`), not the
  pane: the pane is a ScrollArea root whose inline size must stay free, and the
  label is a descendant of the header, which can query it.
- **S10 — `pane-inspector-yielded:` follows the outermost row** (level 0).
  A drawer trigger inside a nested Navigator is not a case this plan serves.
- **S11 — `useTopPaneChrome` loses `atRoot` and `backHref`;** it returns the
  scroll chrome only. `Navigator.Content` composes the back chrome per pane in
  `chromeOf`, from `listPaneShows`, `overflowOpen`, `activeSection` and the
  pane's depth and position.
- **S12 — The transition is `translate`, `opacity`, `visibility` over
  `var(--duration-slow) var(--ease-enter)`** inside
  `@media (prefers-reduced-motion: no-preference)`, replacing the
  `motion-safe:max-lg:*` classes one for one.

---

## File structure

**Created**

| File | Responsibility |
| --- | --- |
| `packages/components/src/components/Pane/paneColumns.ts` | tokens, `columnTier`, `inspectorTier`, `parentTrack`, `ROLE_DEPTH`, `paneCell`, `renderPaneColumnsCss` — the one table |
| `packages/components/src/components/Pane/paneColumns.test.ts` | tiers, the prototype's evidence table, agreement with `derivePositions`, the committed CSS is current |
| `packages/components/scripts/generate-pane-columns.mjs` | writes `src/css/pane-columns.css` from `renderPaneColumnsCss()` |
| `packages/components/src/css/pane-columns.css` | generated; never edited by hand |

**Modified**

| File | Change |
| --- | --- |
| `packages/components/package.json` | `generate:pane-css` script; `build` runs it |
| `packages/components/src/css/components.css` | `@import './pane-columns.css'` |
| `.prettierignore` | `packages/components/src/css/pane-columns.css` |
| `Pane/PaneStackContext.ts` | `PaneRegistration.depth`; `depthOf`, `level` |
| `Pane/PaneContext.ts` | `depth` |
| `Pane/PaneRoot.tsx` | `depth` prop, `PaneDepth`; `data-depth` / `data-stack` / `data-current` / `data-level` / `data-overflow` |
| `Pane/PaneChromeContext.ts` | `backLabel` |
| `Pane/PaneHeader.tsx` | `backLabel`; Back from depth; Close from `backHref`; header container; edge-only variant |
| `Pane/variants.ts` | drop `role` sizing and `stackPosition`; header/back/close variants read the properties; `paneBackLabelClass` |
| `Pane/index.tsx`, `packages/components/src/index.tsx` | export `PaneDepth` |
| `Navigator/paneStack.ts` | `provisionalDepth`, `resolveDepths` |
| `Navigator/NavigatorContent.tsx` | depths, level, the row, `depthOf`, per-depth back chrome, dev warnings |
| `Navigator/useTopPaneChrome.tsx` | scroll chrome only |
| `Navigator/NavigatorOverflowPane.tsx` | no classes |
| `Navigator/variants.ts` | Content is the container; `navigatorPanesVariants`; `navigatorOverflowVariants` deleted |
| `Pane/Pane.test.tsx`, `Navigator/paneStack.test.ts`, `Navigator/Navigator.test.tsx`, `Navigator/NavigatorPrimary.test.tsx`, `Navigator/NavigatorSectionPane.test.tsx`, `Navigator/NavigatorServerRender.test.tsx` | attributes instead of classes; depth cases; label names |
| `docs/src/app/components/pane/page.mdx` | Roles, Stacking, Closing a column, Back label, Guidelines, Accessibility |
| `docs/src/app/components/navigator/page.mdx` | Panes, Pane header, Pane surfaces and the mobile stack |
| `docs/src/components/Navigation.tsx` | inspector trigger uses `pane-inspector-yielded:` |
| `.changeset/navigator-list.md` | `depth`, `backLabel`, Close from `backHref`, the variant |

---

## Task 1: The table, the generator and the CSS

**Files:**
- Create: `packages/components/src/components/Pane/paneColumns.ts`
- Create: `packages/components/src/components/Pane/paneColumns.test.ts`
- Create: `packages/components/scripts/generate-pane-columns.mjs`
- Create: `packages/components/src/css/pane-columns.css` (generated)
- Modify: `packages/components/package.json` (scripts), `packages/components/src/css/components.css`, `.prettierignore`

**Interfaces:**
- Consumes: `PaneRole` from `./variants` (type only); `derivePositions`,
  `type PaneEntry` from `../Navigator/paneStack` (test only).
- Produces (Tasks 2–5 use these exact names):

```ts
// paneColumns.ts
export const PANE_MIN_PARENT = 16
export const PANE_MIN_FILL = 28
export const PANE_INSPECTOR = 14
export const PANE_GAP = 0.75
export const PANE_ROW_PADDING = 1.5
export const PANE_MAX_COLUMNS = 3
export const PANE_MAX_DEPTH = 3
export const PANE_MAX_LEVELS = 2
export type PaneDepth = 0 | 1 | 2 | 3
export const ROLE_DEPTH: Record<PaneRole, PaneDepth | null>
export function columnTier(columns: number): number
export function inspectorTier(levels: number): number
export function parentTrack(columns: number): string
export type PaneSlot = 'top' | 'parent' | 'fill' | 'behind' | 'ahead'
export type PaneCell = { slot: PaneSlot; back: boolean; close: boolean }
export function paneCell(columns: number, top: number, depth: number, levels: number): PaneCell
export function renderPaneColumnsCss(): string
```

The CSS contract every later task relies on — attributes it reads and
properties it writes:

| Reads | Writes |
| --- | --- |
| row `[data-slot="navigator-panes"][data-level="L"]` with `[data-reveal]`, `[data-overflow]` | row: `padding`, `gap` in column tiers |
| pane `[data-stack][data-level="L"][data-depth="0..3"]` with `[data-current]`, `[data-overflow]` | pane: `--pane-back`, `--pane-close`, `--pane-edge` (`grid` \| `none`); `position`, `inset`, `flex`, `order`, `translate`, `opacity`, `visibility`, `pointer-events`, `transition` |
| `[data-role="inspector"][data-level="L"]` | `display` |
| `[data-slot="pane"]` (standalone defaults, by `data-depth`) | the three properties |
| `[data-slot="pane-back"]`, `[data-slot="pane-close"]` | `display: var(--pane-back)` / `var(--pane-close)` |
| `@custom-variant pane-inspector-yielded` | four `@container panes (width < …)` branches on the level-0 row |

- [ ] **Step 1: Write the failing tests**

`packages/components/src/components/Pane/paneColumns.test.ts`:

```ts
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { type PaneEntry, derivePositions } from '../Navigator/paneStack'
import {
  PANE_MAX_DEPTH,
  columnTier,
  inspectorTier,
  paneCell,
  parentTrack,
  renderPaneColumnsCss
} from './paneColumns'

const cssPath = join(__dirname, '../../css/pane-columns.css')

// Content widths, in rem, that the prototype frames measured at 16px/rem.
const REM = 16
const columnsAt = (px: number) =>
  px / REM >= columnTier(3) ? 3 : px / REM >= columnTier(2) ? 2 : 1

const shown = (columns: number, top: number, levels: number) =>
  Array.from({ length: levels }, (_, depth) => paneCell(columns, top, depth, levels))
    .map((cell, depth) => ({ depth, ...cell }))
    .filter((cell) => cell.slot !== 'behind' && cell.slot !== 'ahead')
    .map(
      (cell) =>
        `${cell.depth}${cell.back ? '[Back]' : ''}${cell.close ? '[Close]' : ''}`
    )
    .join(' | ')

describe('tiers', () => {
  it('fits two columns at 46.25rem and three at 63rem', () => {
    expect(columnTier(1)).toBe(0)
    expect(columnTier(2)).toBe(46.25)
    expect(columnTier(3)).toBe(63)
  })

  it('fits the inspector once every level present fits beside it', () => {
    expect(inspectorTier(1)).toBe(44.25)
    expect(inspectorTier(2)).toBe(61)
    expect(inspectorTier(3)).toBe(77.75)
    expect(inspectorTier(4)).toBe(77.75)
  })

  it('never starves the fill below its minimum', () => {
    expect(parentTrack(2)).toBe(
      'clamp(16rem, min(40cqi, 100cqi - 30.25rem), 24rem)'
    )
    expect(parentTrack(3)).toBe(
      'clamp(16rem, min(25cqi, (100cqi - 31rem) / 2), 20rem)'
    )
  })
})

describe('paneCell — the prototype evidence', () => {
  it('Tickets → Glamping → Sam, Sam current', () => {
    expect(shown(columnsAt(375), 2, 3)).toBe('2[Back]')
    expect(shown(columnsAt(760), 2, 3)).toBe('1[Back] | 2[Close]')
    expect(shown(columnsAt(932), 2, 3)).toBe('1[Back] | 2[Close]')
    expect(shown(columnsAt(1188), 2, 3)).toBe('0 | 1 | 2[Close]')
    expect(shown(columnsAt(1348), 2, 3)).toBe('0 | 1 | 2[Close]')
  })

  it('two levels: Close on the detail, no Back', () => {
    expect(shown(columnsAt(760), 1, 2)).toBe('0 | 1[Close]')
    expect(shown(columnsAt(375), 1, 2)).toBe('1[Back]')
  })

  it('three levels with the root revealed: Sam parked ahead', () => {
    expect(shown(columnsAt(760), 0, 3)).toBe('0 | 1')
    expect(paneCell(2, 0, 2, 3)).toEqual({ slot: 'ahead', back: false, close: false })
  })

  it('slides the window over four levels', () => {
    expect(shown(3, 3, 4)).toBe('1[Back] | 2 | 3[Close]')
    expect(paneCell(3, 3, 0, 4).slot).toBe('behind')
  })

  it('draws nothing on a middle column or the root', () => {
    expect(paneCell(3, 2, 1, 3)).toEqual({ slot: 'parent', back: false, close: false })
    expect(paneCell(3, 2, 0, 3)).toEqual({ slot: 'parent', back: false, close: false })
  })

  it('fills with the right-most visible pane, whatever its role would say', () => {
    expect(paneCell(2, 2, 1, 3).slot).toBe('parent')
    expect(paneCell(2, 2, 2, 3).slot).toBe('fill')
  })
})

describe('agreement with derivePositions', () => {
  const entry = (current: boolean): PaneEntry => ({
    role: 'detail',
    current,
    primaryNav: 'auto'
  })

  it('names the same top, behind and ahead panes in the stacked tier', () => {
    for (let levels = 1; levels <= PANE_MAX_DEPTH + 1; levels += 1) {
      for (let top = 0; top < levels; top += 1) {
        const entries = Array.from({ length: levels }, (_, depth) =>
          entry(depth === top && top > 0)
        )
        const positions = derivePositions(entries, top === 0)
        positions.forEach((position, depth) => {
          expect(paneCell(1, top, depth, levels).slot).toBe(position)
        })
      }
    }
  })
})

describe('the generated stylesheet', () => {
  it('is what the table renders', () => {
    expect(readFileSync(cssPath, 'utf8')).toBe(renderPaneColumnsCss())
  })

  it('scopes every rule to a level', () => {
    const css = renderPaneColumnsCss()
    const paneRules = css.match(/\[data-stack\][^{]*\{/g) ?? []
    expect(paneRules.length).toBeGreaterThan(0)
    for (const rule of paneRules) expect(rule).toMatch(/\[data-level="[01]"\]/)
  })

  it('draws one button at most in every rule', () => {
    const css = renderPaneColumnsCss()
    expect(css).not.toMatch(/--pane-back: grid; --pane-close: grid/)
  })

  it('hides the More pane while closed and the other root while open', () => {
    const css = renderPaneColumnsCss()
    expect(css).toContain(
      '[data-slot="navigator-panes"]:not([data-overflow]) [data-stack][data-overflow] { display: none; }'
    )
    expect(css).toContain(
      '[data-slot="navigator-panes"][data-overflow] [data-stack][data-depth="0"]:not([data-overflow]) { display: none; }'
    )
  })

  it('offers the inspector variant with one branch per level count', () => {
    const css = renderPaneColumnsCss()
    expect(css.match(/@container panes \(width < /g)).toHaveLength(4)
    expect(css).toContain('@custom-variant pane-inspector-yielded {')
  })
})
```

Run: `cd packages/components && pnpm vitest run src/components/Pane/paneColumns.test.ts`
Expected: FAIL — `./paneColumns` does not exist.

- [ ] **Step 2: `paneColumns.ts`**

```ts
import type { PaneRole } from './variants'

export const PANE_MIN_PARENT = 16
export const PANE_MIN_FILL = 28
export const PANE_INSPECTOR = 14
export const PANE_GAP = 0.75
export const PANE_ROW_PADDING = 1.5
export const PANE_MAX_COLUMNS = 3
export const PANE_MAX_DEPTH = 3
export const PANE_MAX_LEVELS = 2

export type PaneDepth = 0 | 1 | 2 | 3

export const ROLE_DEPTH: Record<PaneRole, PaneDepth | null> = {
  list: 0,
  detail: 1,
  inspector: null
}

/** Content width, in rem, at which `columns` navigation columns fit. */
export function columnTier(columns: number): number {
  if (columns === 1) return 0
  return (
    (columns - 1) * PANE_MIN_PARENT +
    PANE_MIN_FILL +
    (columns - 1) * PANE_GAP +
    PANE_ROW_PADDING
  )
}

/** Content width, in rem, at which the inspector fits beside every level present. */
export function inspectorTier(levels: number): number {
  const stack =
    levels === 1
      ? PANE_MIN_FILL + PANE_ROW_PADDING
      : columnTier(Math.min(levels, PANE_MAX_COLUMNS))
  return stack + PANE_INSPECTOR + PANE_GAP
}

export function parentTrack(columns: number): string {
  if (columns === 2) {
    const reserved = PANE_MIN_FILL + PANE_GAP + PANE_ROW_PADDING
    return `clamp(${PANE_MIN_PARENT}rem, min(40cqi, 100cqi - ${reserved}rem), 24rem)`
  }
  const reserved = PANE_MIN_FILL + (columns - 1) * PANE_GAP + PANE_ROW_PADDING
  return `clamp(${PANE_MIN_PARENT}rem, min(25cqi, (100cqi - ${reserved}rem) / ${columns - 1}), 20rem)`
}

export type PaneSlot = 'top' | 'parent' | 'fill' | 'behind' | 'ahead'
export type PaneCell = { slot: PaneSlot; back: boolean; close: boolean }

/** One pane's slot and leading button, given the tier, the top depth and the levels present. */
export function paneCell(
  columns: number,
  top: number,
  depth: number,
  levels: number
): PaneCell {
  const rank = (d: number) => (d <= top ? top - d : d)
  const visible: number[] = []
  for (let d = 0; d < levels; d += 1) if (rank(d) < columns) visible.push(d)
  const leftmost = visible[0] ?? 0
  const rightmost = visible[visible.length - 1] ?? 0
  if (rank(depth) >= columns) {
    return { slot: depth <= top ? 'behind' : 'ahead', back: false, close: false }
  }
  return {
    slot: columns === 1 ? 'top' : depth === rightmost ? 'fill' : 'parent',
    back: depth === leftmost && depth >= 1 && depth <= top,
    close: depth === top && top >= 1 && leftmost < top
  }
}

const rem = (value: number) => `${value}rem`
const display = (on: boolean) => (on ? 'grid' : 'none')

const row = (level: number) =>
  `[data-slot="navigator-panes"][data-level="${level}"]`
const stackPane = (level: number, depth: number, extra = '') =>
  `[data-stack][data-level="${level}"][data-depth="${depth}"]${extra}`

const levelsIs = (level: number, levels: number) => {
  const has = `:has(${stackPane(level, levels - 1)})`
  return levels > PANE_MAX_DEPTH
    ? has
    : `${has}:not(:has(${stackPane(level, levels)}))`
}

const topIs = (level: number, top: number) => {
  if (top === 0) {
    return `:is([data-reveal], :not(:has([data-stack][data-level="${level}"][data-current])))`
  }
  const deeper: string[] = []
  for (let d = top + 1; d <= PANE_MAX_DEPTH; d += 1) {
    deeper.push(stackPane(level, d, '[data-current]'))
  }
  const not = deeper.length === 0 ? '' : `:not(:has(${deeper.join(', ')}))`
  return `:not([data-reveal]):has(${stackPane(level, top, '[data-current]')})${not}`
}

const COLUMN =
  'translate: none; opacity: 1; visibility: visible; pointer-events: auto; content-visibility: visible; transition: none;'

function geometry(columns: number, cell: PaneCell, depth: number): string {
  switch (cell.slot) {
    case 'behind':
      return `translate: -33% 0; opacity: 0.9; visibility: hidden; pointer-events: none; content-visibility: auto;${columns > 1 ? ' transition: none;' : ''}`
    case 'ahead':
      return `translate: 100% 0; opacity: 1; visibility: hidden; pointer-events: none; content-visibility: auto;${columns > 1 ? ' transition: none;' : ''}`
    case 'top':
      return 'translate: 0 0; opacity: 1; visibility: visible; pointer-events: auto; content-visibility: visible;'
    case 'fill':
      return `position: relative !important; inset: auto; flex: 1 1 0; order: ${depth}; ${COLUMN}`
    case 'parent':
      return `position: relative !important; inset: auto; flex: 0 0 ${parentTrack(columns)}; order: ${depth}; ${COLUMN}`
  }
}

function paneRule(
  level: number,
  columns: number,
  levels: number,
  top: number,
  depth: number
): string {
  const cell = paneCell(columns, top, depth, levels)
  const selector = `${row(level)}${topIs(level, top)}${levelsIs(level, levels)} ${stackPane(level, depth)}`
  const vars = `--pane-back: ${display(cell.back)}; --pane-close: ${display(cell.close)}; --pane-edge: ${display(cell.back || cell.close)};`
  return `  ${selector} { ${vars} ${geometry(columns, cell, depth)} }`
}

function tierRules(level: number, columns: number): string {
  const rules: string[] = []
  for (let levels = 1; levels <= PANE_MAX_DEPTH + 1; levels += 1) {
    for (let top = 0; top < levels; top += 1) {
      for (let depth = 0; depth < levels; depth += 1) {
        rules.push(paneRule(level, columns, levels, top, depth))
      }
    }
  }
  const body = rules.join('\n')
  if (columns === 1) return body
  return [
    `@container panes (width >= ${rem(columnTier(columns))}) {`,
    `  ${row(level)} { padding: ${rem(PANE_GAP)}; gap: ${rem(PANE_GAP)}; }`,
    `  @media (width >= 48rem) { [data-slot="navigator"]:has([data-slot="navigator-primary"][data-orientation="vertical"]) ${row(level)} { padding-inline-start: 0; } }`,
    body,
    '}'
  ].join('\n')
}

function inspectorRules(level: number): string {
  const rules: string[] = []
  for (let levels = 1; levels <= PANE_MAX_DEPTH + 1; levels += 1) {
    rules.push(
      `@container panes (width >= ${rem(inspectorTier(levels))}) { ${row(level)}${levelsIs(level, levels)} [data-role="inspector"][data-level="${level}"] { display: block; } }`
    )
  }
  return rules.join('\n')
}

function inspectorVariant(): string {
  const branches: string[] = []
  for (let levels = 1; levels <= PANE_MAX_DEPTH + 1; levels += 1) {
    branches.push(
      `  @container panes (width < ${rem(inspectorTier(levels))}) { ${row(0)}${levelsIs(0, levels)} & { @slot; } }`
    )
  }
  return `@custom-variant pane-inspector-yielded {\n${branches.join('\n')}\n}`
}

const STATIC = `  [data-slot="navigator-panes"] [data-stack] { position: absolute !important; inset: 0; --pane-back: none; --pane-close: none; --pane-edge: none; }
  @media (prefers-reduced-motion: no-preference) {
    [data-slot="navigator-panes"] [data-stack] { transition: translate var(--duration-slow) var(--ease-enter), opacity var(--duration-slow) var(--ease-enter), visibility var(--duration-slow) var(--ease-enter); }
  }
  [data-slot="navigator-panes"] [data-role="inspector"] { display: none; order: 99; flex: 0 0 ${rem(PANE_INSPECTOR)}; }
  [data-slot="navigator-panes"]:not([data-overflow]) [data-stack][data-overflow] { display: none; }
  [data-slot="navigator-panes"][data-overflow] [data-stack][data-depth="0"]:not([data-overflow]) { display: none; }
  [data-slot="pane"] { --pane-back: none; --pane-close: none; --pane-edge: none; }
  [data-slot="pane"]:not([data-stack]):not([data-depth="0"]) { --pane-back: grid; --pane-edge: grid; }
  [data-slot="pane-back"] { display: var(--pane-back); }
  [data-slot="pane-close"] { display: var(--pane-close); }`

/** The stylesheet `scripts/generate-pane-columns.mjs` writes. */
export function renderPaneColumnsCss(): string {
  const blocks: string[] = []
  for (let level = 0; level < PANE_MAX_LEVELS; level += 1) {
    for (let columns = 1; columns <= PANE_MAX_COLUMNS; columns += 1) {
      blocks.push(tierRules(level, columns))
    }
    blocks.push(inspectorRules(level))
  }
  return [
    '/* Generated by scripts/generate-pane-columns.mjs from paneColumns.ts. Do not edit. */',
    inspectorVariant(),
    '@layer components {',
    STATIC,
    blocks.join('\n'),
    '}',
    ''
  ].join('\n')
}
```

- [ ] **Step 3: The generator, the import and the scripts**

`packages/components/scripts/generate-pane-columns.mjs`:

```js
import { writeFileSync } from 'node:fs'

import { renderPaneColumnsCss } from '../src/components/Pane/paneColumns.ts'

const target = new URL('../src/css/pane-columns.css', import.meta.url)
writeFileSync(target, renderPaneColumnsCss())
console.log(`wrote ${target.pathname}`)
```

`packages/components/package.json` — in `scripts`, add
`"generate:pane-css": "node scripts/generate-pane-columns.mjs"` and change
`build` to
`"pnpm generate:exports && pnpm generate:pane-css && tsdown && pnpm check:dts && pnpm check:exports"`.

`packages/components/src/css/components.css` — append:

```css
@import './pane-columns.css';
```

`.prettierignore` — append under Build outputs:

```
packages/components/src/css/pane-columns.css
```

Generate: `cd packages/components && pnpm generate:pane-css`. The file must
exist and start with the "Generated by" comment.

- [ ] **Step 4: Prove the variant compiles**

Tailwind must accept the multi-branch `@custom-variant`. Write
`/tmp/pane-variant.css`:

```css
@import 'tailwindcss';
@import '/Users/lukebrooker/Code/roadie/packages/components/src/css/pane-columns.css';
```

and `/tmp/pane-variant.html`:

```html
<div class="hidden pane-inspector-yielded:inline-flex"></div>
```

Run: `cd packages/core && pnpm exec tailwindcss -i /tmp/pane-variant.css --content /tmp/pane-variant.html 2>&1 | grep -c '@container panes (width < '`
Expected: `4`. Also `… | grep -c 'display: inline-flex'` prints at least `4`.
If Tailwind rejects the variant body, report NEEDS_CONTEXT with its error
verbatim — do not restructure the variant.

- [ ] **Step 5: Run the tests**

Run: `cd packages/components && pnpm vitest run src/components/Pane/paneColumns.test.ts`
Expected: PASS. Then `pnpm --filter @oztix/roadie-components exec prettier --write src/components/Pane/paneColumns.ts src/components/Pane/paneColumns.test.ts scripts/generate-pane-columns.mjs src/css/components.css`, regenerate once more (`pnpm generate:pane-css`) and re-run the test, so the committed CSS is Prettier-independent. Gate: `pnpm --filter @oztix/roadie-components test`, root `pnpm typecheck && pnpm lint`.

- [ ] **Step 6: Commit**

```bash
git add -u
git add packages/components/src/components/Pane/paneColumns.ts \
  packages/components/src/components/Pane/paneColumns.test.ts \
  packages/components/scripts/generate-pane-columns.mjs \
  packages/components/src/css/pane-columns.css
git commit -m "feat(pane): the column table, and the stylesheet generated from it"
```

---

## Task 2: `depth` — the attributes the stylesheet reads

**Files:**
- Modify: `packages/components/src/components/Pane/PaneStackContext.ts`
- Modify: `packages/components/src/components/Pane/PaneContext.ts`
- Modify: `packages/components/src/components/Pane/PaneRoot.tsx`
- Modify: `packages/components/src/components/Pane/index.tsx`, `packages/components/src/index.tsx`
- Modify: `packages/components/src/components/Navigator/paneStack.ts`
- Modify: `packages/components/src/components/Navigator/NavigatorContent.tsx`
- Modify: `packages/components/src/components/Navigator/variants.ts`
- Test: `packages/components/src/components/Navigator/paneStack.test.ts`
- Test: `packages/components/src/components/Pane/Pane.test.tsx`
- Test: `packages/components/src/components/Navigator/Navigator.test.tsx`
- Test: `packages/components/src/components/Navigator/NavigatorServerRender.test.tsx`

**Interfaces:**
- Consumes: `ROLE_DEPTH`, `PANE_MAX_DEPTH`, `PANE_MAX_LEVELS`, `type PaneDepth`
  (Task 1); `orderByDocumentPosition`, `derivePositions` (unchanged).
- Produces:

```ts
// PaneStackContext.ts
export type PaneRegistration = {
  role: PaneRole
  current: boolean
  primaryNav: PanePrimaryNav
  kind: PaneKind
  depth?: PaneDepth
}
export type PaneStackContextValue = {
  register; unregister; positionOf; chromeOf; isRootOf   // unchanged
  /** Resolved from document order once registered; declared or role default before. `null` for an inspector. */
  depthOf: (id: string, entry: PaneRegistration) => number | null
  /** 0 for the outermost `Navigator.Content`. */
  level: number
}

// PaneContext.ts
depth: number | null

// paneStack.ts
export type DepthEntry = { role: PaneRole; kind: PaneKind; depth?: PaneDepth }
export function provisionalDepth(entry: DepthEntry): number | null
export function resolveDepths(entries: readonly DepthEntry[]): (number | null)[]

// PaneRoot.tsx — new prop
/** Where this pane sits in the drill-down: 0 is the root. Defaults from `role` — `list` 0, `detail` 1. */
depth?: 0 | 1 | 2 | 3

// Navigator/variants.ts
export const navigatorPanesVariants: ReturnType<typeof cva>
```

Rendered attributes (the CSS contract from Task 1): every pane inside an
orchestrator carries `data-level`; a non-inspector one also carries
`data-stack` and `data-depth`; `data-current` when `current`; `data-overflow`
on More. A standalone pane carries `data-depth` only. The row
(`data-slot='navigator-panes'`) carries `data-level`, `data-reveal` while the
root is revealed or More is open, and `data-overflow` while More is open.

- [ ] **Step 1: Failing unit tests for the depth helpers**

Append to `paneStack.test.ts` (its `entry` helper is in scope; add
`provisionalDepth, resolveDepths` to the import):

```ts
describe('provisionalDepth', () => {
  const pane = (role: 'list' | 'detail' | 'inspector', depth?: 0 | 1 | 2 | 3) =>
    ({ role, kind: 'pane', depth }) as const

  it('takes the declaration, else the role default', () => {
    expect(provisionalDepth(pane('list'))).toBe(0)
    expect(provisionalDepth(pane('detail'))).toBe(1)
    expect(provisionalDepth(pane('detail', 2))).toBe(2)
    expect(provisionalDepth(pane('inspector'))).toBeNull()
  })

  it('keeps the generated panes at the root', () => {
    expect(
      provisionalDepth({ role: 'list', kind: 'generated-section' })
    ).toBe(0)
    expect(provisionalDepth({ role: 'list', kind: 'section' })).toBe(0)
    expect(
      provisionalDepth({ role: 'list', kind: 'generated-overflow', depth: 2 })
    ).toBe(0)
  })
})

describe('resolveDepths', () => {
  it('counts stack panes up in document order, whatever they declared', () => {
    expect(
      resolveDepths([
        { role: 'list', kind: 'generated-section' },
        { role: 'detail', kind: 'pane', depth: 1 },
        { role: 'inspector', kind: 'pane' },
        { role: 'detail', kind: 'pane', depth: 1 }
      ])
    ).toEqual([0, 1, null, 2])
  })

  it('makes a lone detail the root', () => {
    expect(resolveDepths([{ role: 'detail', kind: 'pane' }])).toEqual([0])
  })

  it('keeps More at the root wherever it renders', () => {
    expect(
      resolveDepths([
        { role: 'list', kind: 'pane' },
        { role: 'detail', kind: 'pane' },
        { role: 'list', kind: 'generated-overflow' }
      ])
    ).toEqual([0, 1, 0])
  })
})
```

Run: `cd packages/components && pnpm vitest run src/components/Navigator/paneStack.test.ts -t 'Depth'`
Expected: FAIL — no such exports.

- [ ] **Step 2: Failing component tests**

Append to `Pane.test.tsx` (`renderPane`, `pane`, `flushViewportMeasurement`,
`Navigator`, `Pane` in scope):

```tsx
describe('depth attributes', () => {
  it('writes the role default on a standalone pane, with no stack membership', async () => {
    await renderPane(<Pane role='detail'>Alone</Pane>)
    expect(pane()).toHaveAttribute('data-depth', '1')
    expect(pane()).not.toHaveAttribute('data-stack')
    expect(pane()).not.toHaveAttribute('data-level')
  })

  it('writes a declared depth', async () => {
    await renderPane(
      <Pane role='detail' depth={2}>
        Sub
      </Pane>
    )
    expect(pane()).toHaveAttribute('data-depth', '2')
  })

  it('gives an inspector no depth', async () => {
    await renderPane(<Pane role='inspector'>Details</Pane>)
    expect(pane()).not.toHaveAttribute('data-depth')
  })

  it('resolves depth from document order inside a stack, and marks the current pane', async () => {
    render(
      <Navigator value='/a'>
        <Navigator.Content>
          <Pane role='list'>List</Pane>
          <Pane role='detail' current>
            Detail
          </Pane>
          <Pane role='detail' current>
            Sub
          </Pane>
          <Pane role='inspector'>Details</Pane>
        </Navigator.Content>
      </Navigator>
    )
    await flushViewportMeasurement()
    const panes = Array.from(document.querySelectorAll('[data-slot="pane"]'))
    expect(panes.map((p) => p.getAttribute('data-depth'))).toEqual([
      '0',
      '1',
      '2',
      null
    ])
    expect(panes.map((p) => p.hasAttribute('data-stack'))).toEqual([
      true,
      true,
      true,
      false
    ])
    expect(panes.map((p) => p.getAttribute('data-level'))).toEqual([
      '0',
      '0',
      '0',
      '0'
    ])
    expect(panes.map((p) => p.hasAttribute('data-current'))).toEqual([
      false,
      true,
      true,
      false
    ])
  })

  it('warns when a pane lands deeper than it declared', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(
      <Navigator value='/a'>
        <Navigator.Content>
          <Pane role='list'>List</Pane>
          <Pane role='detail' current>
            Detail
          </Pane>
          <Pane role='detail' depth={1} current>
            Sub
          </Pane>
        </Navigator.Content>
      </Navigator>
    )
    await flushViewportMeasurement()
    expect(
      warn.mock.calls.some((c) => String(c[0]).includes('depth={2}'))
    ).toBe(true)
    warn.mockRestore()
  })

  it('stays quiet when two undeclared details resolve by order', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(
      <Navigator value='/a'>
        <Navigator.Content>
          <Pane role='list'>List</Pane>
          <Pane role='detail' current>
            Detail
          </Pane>
          <Pane role='detail' current>
            Sub
          </Pane>
        </Navigator.Content>
      </Navigator>
    )
    await flushViewportMeasurement()
    expect(
      warn.mock.calls.some((c) => String(c[0]).includes('depth'))
    ).toBe(true)
    warn.mockRestore()
  })

  it('nests a second Navigator one level down', async () => {
    render(
      <Navigator value='/a'>
        <Navigator.Content>
          <Pane role='detail' current>
            Outer
            <Navigator value='/x'>
              <Navigator.Content>
                <Pane role='list'>Inner list</Pane>
                <Pane role='detail' current>
                  Inner detail
                </Pane>
              </Navigator.Content>
            </Navigator>
          </Pane>
        </Navigator.Content>
      </Navigator>
    )
    await flushViewportMeasurement()
    const rows = Array.from(
      document.querySelectorAll('[data-slot="navigator-panes"]')
    )
    expect(rows.map((r) => r.getAttribute('data-level'))).toEqual(['0', '1'])
    const panes = Array.from(document.querySelectorAll('[data-slot="pane"]'))
    expect(panes.map((p) => p.getAttribute('data-level'))).toEqual([
      '0',
      '1',
      '1'
    ])
    expect(panes.map((p) => p.getAttribute('data-depth'))).toEqual([
      '0',
      '0',
      '1'
    ])
  })
})
```

The "stays quiet" case above is deliberately named for what it asserts once
S1 is applied: two undeclared details **do** warn (the second resolved deeper
than its default of 1). Keep the assertion as written.

Append to `Navigator.test.tsx`, inside the describe that already renders
`overflowNav` (the "is a list pane that leads the columns from lg" test is
in it; `overflowNav`, `horizontalOf`, `flushViewportMeasurement`,
`userEvent`, `within` in scope):

```tsx
  it('marks the row and the More pane while More is open', async () => {
    const user = userEvent.setup()
    const { container } = render(overflowNav('/a'))
    await flushViewportMeasurement()
    const row = document.querySelector('[data-slot="navigator-panes"]')!
    const more = document.querySelector('[data-slot="pane"][id]')!
    expect(more).toHaveAttribute('data-overflow')
    expect(more).toHaveAttribute('data-depth', '0')
    expect(more).not.toHaveAttribute('data-current')
    expect(row).not.toHaveAttribute('data-overflow')
    expect(row).not.toHaveAttribute('data-reveal')
    await user.click(
      within(horizontalOf(container)!).getByRole('button', { name: 'More' })
    )
    expect(more).toHaveAttribute('data-current')
    expect(row).toHaveAttribute('data-overflow')
    expect(row).toHaveAttribute('data-reveal')
  })
```

Append to `NavigatorSectionPane.test.tsx` after the `section routes`
describe (`Routed`, `flushViewportMeasurement` in scope):

```tsx
describe('the row reveals the root', () => {
  const row = () => document.querySelector('[data-slot="navigator-panes"]')!

  it('on the section route and with showList, not on a sub-page', async () => {
    const { rerender } = render(<Routed value='/components' />)
    await flushViewportMeasurement()
    expect(row()).toHaveAttribute('data-reveal')
    rerender(<Routed value='/components/a' />)
    expect(row()).not.toHaveAttribute('data-reveal')
    rerender(<Routed value='/components/a' showList />)
    expect(row()).toHaveAttribute('data-reveal')
  })
})
```

Append to `NavigatorServerRender.test.tsx` (its `serverRender`, `paneOf`,
`testBrand`, `FakeIcon`, `flushViewportMeasurement`, `StrictMode`,
`hydrateRoot`, `act`, `vi`, `Root` in scope):

```tsx
const depths = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('[data-slot="pane"]')).map((pane) => [
    pane.getAttribute('data-navigator-section') ?? pane.getAttribute('data-role'),
    pane.getAttribute('data-depth'),
    pane.hasAttribute('data-current')
  ])

function ThreeLevels({ value }: { value: string }) {
  return (
    <Navigator value={value}>
      <Navigator.Primary aria-label='Docs'>
        {testBrand}
        <Navigator.Item value='/tickets' href='/tickets' icon={<FakeIcon />}>
          Tickets
          <Navigator.Secondary aria-label='Events'>
            <Navigator.Item value='/tickets/glamping' href='/tickets/glamping'>
              Glamping
            </Navigator.Item>
          </Navigator.Secondary>
        </Navigator.Item>
      </Navigator.Primary>
      <Navigator.Content>
        <Pane role='detail' current>
          <Pane.Header />
          Glamping
        </Pane>
        <Pane role='detail' depth={2} current>
          <Pane.Header backHref='/tickets/glamping' />
          Sam
        </Pane>
      </Navigator.Content>
    </Navigator>
  )
}

describe('Navigator server render of depths', () => {
  it('writes declared and default depths, and the reveal, before any pane registers', () => {
    const container = serverRender(<ThreeLevels value='/tickets/glamping' />)
    expect(depths(container)).toEqual([
      ['/tickets', '0', false],
      ['detail', '1', true],
      ['detail', '2', true]
    ])
    expect(
      container.querySelector('[data-slot="navigator-panes"]')
    ).not.toHaveAttribute('data-reveal')
    const revealed = serverRender(<ThreeLevels value='/tickets' />)
    expect(
      revealed.querySelector('[data-slot="navigator-panes"]')
    ).toHaveAttribute('data-reveal')
  })

  it('hydrates without a mismatch or a depth change', async () => {
    const ui = (
      <StrictMode>
        <ThreeLevels value='/tickets/glamping' />
      </StrictMode>
    )
    const host = serverRender(ui)
    const before = depths(host)
    const error = vi.spyOn(console, 'error')
    const recoverable = vi.fn()
    let root: Root | null = null
    await act(async () => {
      root = hydrateRoot(host, ui, { onRecoverableError: recoverable })
    })
    await flushViewportMeasurement()
    expect(recoverable).not.toHaveBeenCalled()
    expect(error).not.toHaveBeenCalled()
    expect(depths(host)).toEqual(before)
    act(() => root?.unmount())
    vi.restoreAllMocks()
  })
})
```

Run: `cd packages/components && pnpm vitest run src/components/Pane/Pane.test.tsx -t 'depth attributes' src/components/Navigator/NavigatorServerRender.test.tsx -t 'depths'`
Expected: FAIL — `depth` is not a prop (typecheck) and no `data-depth`.

- [ ] **Step 3: The depth helpers**

`paneStack.ts` — add the imports and functions:

```ts
import { type PaneDepth, ROLE_DEPTH } from '../Pane/paneColumns'
import type { PaneKind } from '../Pane/PaneStackContext'

export type DepthEntry = { role: PaneRole; kind: PaneKind; depth?: PaneDepth }

const isOverflow = (kind: PaneKind) =>
  kind === 'overflow' || kind === 'generated-overflow'

/** A pane's depth before it registers: declared, else its role's default. More is always the root. */
export function provisionalDepth({
  role,
  kind,
  depth
}: DepthEntry): number | null {
  if (role === 'inspector') return null
  if (isOverflow(kind)) return 0
  return depth ?? ROLE_DEPTH[role]
}

/** Depths once registered: stack panes count up in document order; More stays the root. */
export function resolveDepths(
  entries: readonly DepthEntry[]
): (number | null)[] {
  let next = 0
  return entries.map((entry) => {
    if (entry.role === 'inspector') return null
    if (isOverflow(entry.kind)) return 0
    const depth = next
    next += 1
    return depth
  })
}
```

(`PaneKind` may already be imported as a type there — merge.)

- [ ] **Step 4: The contexts**

`PaneStackContext.ts`:

```ts
import type { PaneDepth } from './paneColumns'

export type PaneRegistration = {
  role: PaneRole
  current: boolean
  primaryNav: PanePrimaryNav
  kind: PaneKind
  depth?: PaneDepth
}

export type PaneStackContextValue = {
  register: (id: string, node: HTMLElement, entry: PaneRegistration) => void
  unregister: (id: string) => void
  /** `entry` places a pane that has not registered yet, as in the server render. */
  positionOf: (id: string, entry: PaneRegistration) => PaneStackPosition | null
  chromeOf: (id: string, entry: PaneRegistration) => PaneChromeContextValue
  /** Is this the base of the stack — the one pane a Close would never suit. */
  isRootOf: (id: string) => boolean
  /** Resolved from document order once registered; declared or role default before. `null` for an inspector. */
  depthOf: (id: string, entry: PaneRegistration) => number | null
  /** 0 for the outermost `Navigator.Content`. */
  level: number
}
```

`PaneContext.ts` — add to `PaneContextValue` after `role`:

```ts
  /** 0 is the root of its stack, or a standalone `list`. `null` for an inspector. */
  depth: number | null
```

- [ ] **Step 5: `PaneRoot`**

Add the prop (after `current`):

```ts
  /**
   * Where this pane sits in the drill-down: 0 is the root. Defaults from
   * `role` — `list` 0, `detail` 1 — so a sub-detail declares `depth={2}`.
   * Document order decides once panes have mounted; the declaration makes
   * the server render exact.
   */
  depth?: 0 | 1 | 2 | 3
```

and rewrite the `current` JSDoc to: `The deepest \`current\` pane is the top
of the stack, which decides which panes are on screen at every width.`

Destructure `depth: declaredDepth`, register it
(`register(paneId, node, { role, current, primaryNav, kind, depth: declaredDepth })`,
deps plus `declaredDepth`), include it in `entry`, and compute:

```ts
  const depth =
    stack === null
      ? (declaredDepth ?? ROLE_DEPTH[role])
      : stack.depthOf(paneId, entry)
  const inStack = stack !== null && role !== 'inspector'
  const isOverflow = kind === 'overflow' || kind === 'generated-overflow'
```

(`import { ROLE_DEPTH } from './paneColumns'`.) Add `depth` to the
`context` memo and its deps. On the `ScrollArea` root add, after
`data-stack-position`:

```tsx
      data-depth={depth ?? undefined}
      data-stack={inStack ? '' : undefined}
      data-current={current ? '' : undefined}
      data-level={stack?.level}
      data-overflow={isOverflow ? '' : undefined}
```

Export the type: in `Pane/index.tsx` add
`export type { PaneDepth } from './paneColumns'`; in
`packages/components/src/index.tsx` add `type PaneDepth` to the Pane export
block.

- [ ] **Step 6: `Navigator.Content`**

Read the file as it is (the performance pass rewrote registration). Then:

1. Import `provisionalDepth, resolveDepths` from `./paneStack`,
   `PANE_MAX_DEPTH, PANE_MAX_LEVELS` from `../Pane/paneColumns`, and
   `navigatorPanesVariants` from `./variants`.
2. Read the parent stack for the level — `use(PaneStackContext)` is already
   the import; add near the top of the component:
   ```ts
   const parentStack = use(PaneStackContext)
   const level = parentStack === null ? 0 : parentStack.level + 1
   ```
3. After the memo that computes `positions`, add
   ```ts
   const depths = useMemo(() => resolveDepths(ordered), [ordered])
   ```
4. Beside `positionOf`, add (same closure style as `positionOf` has in the
   file — closing over `ordered`/`depths` on the compiler branch, over the
   `latest` ref before it):
   ```ts
   const depthOf = useCallback(
     (id: string, entry: PaneRegistration) => {
       const index = ordered.findIndex((pane) => pane.id === id)
       return index === -1 ? provisionalDepth(entry) : (depths[index] ?? null)
     },
     [ordered, depths]
   )
   ```
   and put `depthOf` and `level` into the `stackValue` memo and its deps.
5. Add the dev warning effect after the zero-pane warning:
   ```ts
   useEffect(() => {
     if (!isDev()) return
     if (level >= PANE_MAX_LEVELS) {
       console.warn(
         `[Roadie] Navigator.Content is nested ${level} deep; the pane columns stylesheet covers ${PANE_MAX_LEVELS} levels.`
       )
     }
     ordered.forEach((pane, index) => {
       const resolved = depths[index]
       const declared = provisionalDepth(pane)
       if (resolved === null || declared === null) return
       if (resolved > PANE_MAX_DEPTH) {
         console.warn(
           `[Roadie] A fifth stack pane (depth ${resolved}) has no column. Flatten the navigation.`
         )
       } else if (resolved > declared) {
         console.warn(
           `[Roadie] A Pane declared or defaulted to depth ${declared} but sits at depth ${resolved}. Declare depth={${resolved}} so the server render matches.`
         )
       }
     })
   }, [level, ordered, depths])
   ```
6. Wrap the panes in the row. The returned JSX becomes:
   ```tsx
    <main ref={ref} data-slot='navigator-content' className={cn(navigatorContentVariants(), className)} {...props}>
      <PaneStackContext value={stackValue}>
        <PaneContext value={null}>
          <div
            data-slot='navigator-panes'
            data-level={level}
            data-reveal={revealing || overflowOpen ? '' : undefined}
            data-overflow={overflowOpen ? '' : undefined}
            className={navigatorPanesVariants()}
          >
            {sectionPane}
            {children}
            {fallbackOverflow}
          </div>
        </PaneContext>
      </PaneStackContext>
    </main>
   ```

`Navigator/variants.ts` — add after `navigatorContentVariants`:

```ts
// The row the stylesheet keys on; column padding and gap are its business.
export const navigatorPanesVariants = cva([
  'relative flex h-full min-h-0 min-w-0 overflow-hidden'
])
```

(Content's own classes change in Task 3; leave them now.)

- [ ] **Step 7: Run**

Run: `cd packages/components && pnpm vitest run src/components/Pane src/components/Navigator`
Expected: PASS, including the pre-existing `provisionalPosition` agreement
cases; act count `0`. Then `pnpm test`, root `pnpm typecheck && pnpm lint`.
The `fakeStack` object in `Pane.test.tsx`'s "orchestrator chrome" describe
needs `depthOf: () => 1, level: 0` added — TypeScript tells you.

- [ ] **Step 8: Commit**

```bash
git add -u packages/components/src
git commit -m "feat(pane): depth, and the attributes the column stylesheet reads"
```

---

## Task 3: Geometry moves to the stylesheet

**Files:**
- Modify: `packages/components/src/components/Pane/variants.ts`
- Modify: `packages/components/src/components/Pane/PaneRoot.tsx`
- Modify: `packages/components/src/components/Navigator/variants.ts`
- Modify: `packages/components/src/components/Navigator/NavigatorOverflowPane.tsx`
- Test: `packages/components/src/components/Pane/Pane.test.tsx`
- Test: `packages/components/src/components/Navigator/Navigator.test.tsx`
- Test: `packages/components/src/components/Navigator/NavigatorPrimary.test.tsx`

**Interfaces:**
- Consumes: the attributes from Task 2; the stylesheet from Task 1.
- Produces: `paneVariants({ emphasis })` (no `role`, no `stackPosition`);
  `navigatorContentVariants()` is the `panes` container;
  `navigatorOverflowVariants` no longer exists.

- [ ] **Step 1: Rewrite the tests that pinned the moved classes**

In `Pane.test.tsx`:

- "caps a list pane at a share of the row…" → replace the body with
  `expect(pane()).not.toHaveClass('lg:w-[clamp(16rem,40%,24rem)]')` and
  rename it `'leaves column width to the stylesheet'`.
- In `describe('stack geometry')`, delete `expectSharedTransition` and the
  four class-asserting tests ("gives the top pane the shared stack
  geometry…", "parks the behind pane…", "parks the ahead pane…", "gives a
  standalone pane none of the stack geometry", "gives an inspector none of
  the stack geometry…") and replace them with:

```tsx
  it('writes no geometry classes; the stylesheet keys on the attributes', async () => {
    render(
      <Navigator value='/a'>
        <Navigator.Content>
          <Pane role='list'>List</Pane>
          <Pane role='detail' current>
            Detail
          </Pane>
          <Pane role='inspector'>Details</Pane>
        </Navigator.Content>
      </Navigator>
    )
    await flushViewportMeasurement()
    for (const el of paneEls()) {
      expect(el.className).not.toMatch(/max-lg:|lg:|2xl:/)
    }
    expect(paneEls()[0]).toHaveAttribute('data-stack-position', 'behind')
    expect(paneEls()[1]).toHaveAttribute('data-stack-position', 'top')
    expect(paneEls()[2]).not.toHaveAttribute('data-stack')
  })
```

  Keep the `a pane inside a pane` describe as is.

In `Navigator.test.tsx`:

- The test asserting `content` `toHaveClass('max-lg:overflow-hidden')` →
  `toHaveClass('overflow-hidden', '[container:panes/inline-size]')`.
- "is a list pane that leads the columns from lg" → rename `'is a list pane
  at the root'`, and assert `expect(more).toHaveAttribute('data-depth', '0')`
  and `expect(more).not.toHaveClass('lg:-order-1')`.
- "hides from lg while closed, so one list pane shows at a time" → the two
  class assertions become
  `expect(document.querySelector('[data-slot="navigator-panes"]')).not.toHaveAttribute('data-overflow')`
  before the click and `.toHaveAttribute('data-overflow')` after.
- "marks a covered pane pointer-events-none" → drop the two `toHaveClass` /
  `not.toHaveClass('max-lg:pointer-events-none')` lines; keep the
  `data-stack-position` assertions; rename `'marks the covered pane behind'`.

In `NavigatorPrimary.test.tsx`, every `expect(overflowPane()).toHaveClass('lg:hidden')`
becomes `expect(document.querySelector('[data-slot="navigator-panes"]')).not.toHaveAttribute('data-overflow')`
and every `.not.toHaveClass('lg:hidden')` becomes `.toHaveAttribute('data-overflow')`
(`grep -n "lg:hidden" src/components/Navigator/NavigatorPrimary.test.tsx` lists them).

Run: `cd packages/components && pnpm vitest run src/components/Pane/Pane.test.tsx src/components/Navigator/Navigator.test.tsx src/components/Navigator/NavigatorPrimary.test.tsx`
Expected: the rewritten tests FAIL on the class assertions.

- [ ] **Step 2: `Pane/variants.ts`**

`paneVariants` keeps its base list and `emphasis` variant only. Delete the
`role` variant, the `stackPosition` variant and the header comment about
`lg`; `defaultVariants` becomes `{ emphasis: 'raised' }`. If the radius line
still reads `max-lg:[--pane-radius:0px]` after the Pane pass, change the gate
to `max-md:` — `md` is the nav-form breakpoint, and from it stacked panes are
inset and rounded. If the Pane pass already changed it, leave it.

`PaneRoot` calls `paneVariants({ emphasis })` — drop `role` and
`stackPosition` from the call. `data-role` stays.

- [ ] **Step 3: `Navigator/variants.ts`**

`navigatorContentVariants` becomes:

```ts
// The `panes` container the pane columns stylesheet queries. Column padding
// lives on the row inside, because a container can't query itself.
export const navigatorContentVariants = cva([
  'row-start-1 md:col-start-2',
  '[--pane-surface:var(--intent-bg-sunken)]',
  'relative grid min-h-0 min-w-0 overflow-hidden',
  '[container:panes/inline-size]',
  'data-instant:[&_[data-slot=pane]]:transition-none'
])
```

Move onto `navigatorPanesVariants` any `md:` inset the Pane pass put on
Content for stacked panes (S8); otherwise leave the row as Task 2 wrote it.
Delete `navigatorOverflowVariants` and its comment.

`NavigatorOverflowPane.tsx` — drop the `navigatorOverflowVariants` import and
pass `className={className}` straight through (keep `cn` only if something
else still uses it).

- [ ] **Step 4: Run**

Run: `cd packages/components && pnpm vitest run src/components/Pane src/components/Navigator`
Expected: PASS; act count `0`. `pnpm test`; root `pnpm typecheck && pnpm lint`.

- [ ] **Step 5: Commit**

```bash
git add -u packages/components/src
git commit -m "feat(pane): columns and the stack come from the generated stylesheet"
```

---

## Task 4: The header — Back, Close and the label from the properties

**Files:**
- Modify: `packages/components/src/components/Pane/PaneChromeContext.ts`
- Modify: `packages/components/src/components/Pane/PaneHeader.tsx`
- Modify: `packages/components/src/components/Pane/variants.ts`
- Test: `packages/components/src/components/Pane/Pane.test.tsx`

**Interfaces:**
- Consumes: `PaneContextValue.depth`, `isRoot` (Task 2); the static cell rules
  (Task 1).
- Produces:

```ts
// PaneChromeContext.ts
export type PaneChromeContextValue = {
  onViewportScroll: (scrollTop: number) => void
  registerScroller: (scroller: () => void) => () => void
  /** An orchestrator's Back link — the parent route. The header's own `backHref` and `onBack` still win. */
  backHref?: string
  /** The parent's title for that link. */
  backLabel?: string
}

// PaneHeader.tsx
export type PaneHeaderProps = {
  /** Back target, as a routed link. Wins over `onBack`; also Close's target unless `onClose` is given. */
  backHref?: string
  /** The parent's title, shown beside the caret where the header is at least 24rem wide. */
  backLabel?: string
  /** Back target, as a `<button>`; also Close's handler unless `onClose` is given. */
  onBack?: () => void
  /** Close's handler, overriding `onBack` and `backHref` for Close; never shown on the root pane. */
  onClose?: () => void
  children?: ReactNode
  className?: string
}

// variants.ts
paneHeaderVariants — edgeOnly: 'none' | 'back' | 'close' | 'both'
export const paneBackLabelClass: string
```

- [ ] **Step 1: Rewrite and add header tests**

In `Pane.test.tsx`:

- "drops the back row from lg up, where the pane is a column" → rename
  `'leaves the back cell's display to the stylesheet'`; assert
  `expect(screen.getByLabelText('Back').closest('div')).not.toHaveClass('lg:hidden')`
  and `.toHaveAttribute('data-slot', 'pane-back')`.
- "takes the whole header with it when the back row is all there was" →
  the first assertion becomes `expect(header()).toHaveClass('[display:var(--pane-back)]')`
  and `not.toHaveClass('grid')`; the second becomes
  `expect(header()).toHaveClass('grid')` and `not.toHaveClass('[display:var(--pane-back)]')`.
- "shares the back affordance cell, gated to the opposite band" → rename
  `'shares the back affordance cell'`; drop `'lg:hidden'` and
  `'max-lg:hidden'` from the two `toHaveClass` calls.
- "renders no close control from backHref alone" → rename
  `'renders a close link from backHref alone'`; assert
  `expect(screen.getByLabelText('Close')).toHaveAttribute('href', '/a')`.
- "draws a Back link from orchestrator chrome, never a Close" → rename
  `'draws Back and Close links from orchestrator chrome'`; the last line
  becomes `expect(screen.queryByLabelText('Close')).toBeNull()` **unchanged**
  — the fake stack's `isRootOf` returns `false` but `positionOf` returns
  `null`, so keep it and add `isRootOf: () => false` is already there;
  Close needs `!isRoot`, which holds, so change the last assertion to
  `expect(screen.getByLabelText('Close')).toHaveAttribute('href', '/section')`.
- "still draws the header when Close is its only content" → add
  `expect(document.querySelector('[data-slot="pane-header"]')).toHaveClass('[display:var(--pane-close)]')`.

Append a new describe:

```tsx
describe('Pane.Header back label', () => {
  it('renders the label beside the caret, named "Back to …"', async () => {
    await renderPane(
      <Pane role='detail'>
        <Pane.Header backHref='/tickets' backLabel='Tickets'>
          <Pane.Title>Glamping</Pane.Title>
        </Pane.Header>
      </Pane>
    )
    const back = screen.getByLabelText('Back to Tickets')
    expect(back.tagName).toBe('A')
    expect(back).toHaveAttribute('href', '/tickets')
    const label = back.querySelector('[data-slot="pane-back-label"]')
    expect(label).toHaveTextContent('Tickets')
    expect(label).toHaveClass('hidden', '@min-[24rem]/pane-header:inline', 'truncate')
    expect(document.querySelector('[data-slot="pane-header"]')).toHaveClass(
      '[container:pane-header/inline-size]'
    )
  })

  it('takes the orchestrator label only when the header supplies no target of its own', async () => {
    const fakeStack: PaneStackContextValue = {
      register: () => {},
      unregister: () => {},
      positionOf: () => null,
      chromeOf: () => ({
        ...PANE_CHROME_NONE,
        backHref: '/tickets',
        backLabel: 'Tickets'
      }),
      isRootOf: () => false,
      depthOf: () => 1,
      level: 0
    }
    const { rerender } = await renderPane(
      <PaneStackContext value={fakeStack}>
        <Pane role='detail'>
          <Pane.Header />
        </Pane>
      </PaneStackContext>
    )
    expect(screen.getByLabelText('Back to Tickets')).toHaveAttribute(
      'href',
      '/tickets'
    )
    rerender(
      <PaneStackContext value={fakeStack}>
        <Pane role='detail'>
          <Pane.Header onBack={() => {}} />
        </Pane>
      </PaneStackContext>
    )
    await flush()
    expect(screen.getByLabelText('Back').tagName).toBe('BUTTON')
  })

  it('stays icon-only with no label', async () => {
    await renderPane(
      <Pane role='detail'>
        <Pane.Header backHref='/tickets' />
      </Pane>
    )
    expect(screen.getByLabelText('Back')).toBeInTheDocument()
    expect(document.querySelector('[data-slot="pane-back-label"]')).toBeNull()
  })

  it('never offers Back on a depth-0 pane, whatever its role', async () => {
    await renderPane(
      <Pane role='detail' depth={0}>
        <Pane.Header backHref='/' />
      </Pane>
    )
    expect(screen.queryByLabelText(/^Back/)).toBeNull()
  })
})
```

Run: `cd packages/components && pnpm vitest run src/components/Pane/Pane.test.tsx`
Expected: the rewritten and new tests FAIL.

- [ ] **Step 2: `PaneChromeContext.ts`**

Add `backLabel?: string` with the JSDoc from the interface block.

- [ ] **Step 3: `variants.ts`**

`paneHeaderVariants`: remove `grid` from the first base string (keep
`sticky top-0 z-sticky grid-cols-[auto_minmax(0,1fr)_auto]`), add
`'[container:pane-header/inline-size]'` to the base list, and replace the
`edgeOnly` variant and its comment with:

```ts
      // The leading cell's occupant decides whether an otherwise-empty header draws.
      edgeOnly: {
        none: 'grid',
        back: '[display:var(--pane-back)]',
        close: '[display:var(--pane-close)]',
        both: '[display:var(--pane-edge)]'
      },
```

`paneHeaderBackVariants` and `paneHeaderCloseVariants` become
`cva([paneHeaderEdgeCellClasses])` — the `lg:hidden` / `max-lg:hidden` go,
and the comment above `paneHeaderEdgeCellClasses` shrinks to one line:
`// Back and Close share the leading cell; the stylesheet draws at most one.`

Add:

```ts
export const paneBackLabelClass =
  'hidden max-w-[12ch] truncate @min-[24rem]/pane-header:inline'
```

- [ ] **Step 4: `PaneHeader.tsx`**

Replace the resolution block (from `const resolvedBackHref` through
`const collapsed`) with:

```ts
  const resolvedBackHref =
    backHref ?? (onBack === undefined ? chrome.backHref : undefined)
  const label =
    backLabel ??
    (backHref === undefined && onBack === undefined
      ? chrome.backLabel
      : undefined)
  const hasTarget = resolvedBackHref !== undefined || onBack !== undefined
  const showBack = hasTarget && pane !== null && pane.depth !== 0
  const closeHandler = onClose ?? onBack
  const closeHref = closeHandler === undefined ? resolvedBackHref : undefined
  const showClose =
    (closeHandler !== undefined || closeHref !== undefined) &&
    pane !== null &&
    pane.role !== 'inspector' &&
    !pane.isRoot
  const collapsed = pane?.collapsed ?? false
```

Replace the `edgeOnly` computation with:

```ts
  const edgeOnly = hasOtherContent
    ? 'none'
    : showBack && showClose
      ? 'both'
      : showBack
        ? 'back'
        : showClose
          ? 'close'
          : 'none'
```

Replace the Back and Close JSX with:

```tsx
      {showBack ? (
        <div data-slot='pane-back' className={paneHeaderBackVariants()}>
          {label === undefined ? (
            resolvedBackHref !== undefined ? (
              <IconButton href={resolvedBackHref} aria-label='Back' emphasis='normal'>
                {backIcon}
              </IconButton>
            ) : (
              <IconButton onClick={onBack} aria-label='Back' emphasis='normal'>
                {backIcon}
              </IconButton>
            )
          ) : resolvedBackHref !== undefined ? (
            <Button href={resolvedBackHref} aria-label={`Back to ${label}`} emphasis='normal'>
              {backIcon}
              <span data-slot='pane-back-label' className={paneBackLabelClass}>
                {label}
              </span>
            </Button>
          ) : (
            <Button onClick={onBack} aria-label={`Back to ${label}`} emphasis='normal'>
              {backIcon}
              <span data-slot='pane-back-label' className={paneBackLabelClass}>
                {label}
              </span>
            </Button>
          )}
        </div>
      ) : null}
      {showClose ? (
        <div data-slot='pane-close' className={paneHeaderCloseVariants()}>
          {closeHandler !== undefined ? (
            <IconButton onClick={closeHandler} aria-label='Close' emphasis='normal'>
              {closeIcon}
            </IconButton>
          ) : (
            <IconButton href={closeHref} aria-label='Close' emphasis='normal'>
              {closeIcon}
            </IconButton>
          )}
        </div>
      ) : null}
```

Import `Button` from `'../Button/Button'` and `paneBackLabelClass` from
`'./variants'`. Delete the comment `// A link never supplies Close: …`.

- [ ] **Step 5: Run**

Run: `cd packages/components && pnpm vitest run src/components/Pane src/components/Navigator`
Expected: PASS; act count `0`. `pnpm test`; root `pnpm typecheck && pnpm lint`.

- [ ] **Step 6: Commit**

```bash
git add -u packages/components/src
git commit -m "feat(pane): Back, Close and the back label decided by the column stylesheet"
```

---

## Task 5: The orchestrator hands Back to the depth-1 pane, with the section's label

**Files:**
- Modify: `packages/components/src/components/Navigator/useTopPaneChrome.tsx`
- Modify: `packages/components/src/components/Navigator/NavigatorContent.tsx`
- Test: `packages/components/src/components/Navigator/NavigatorSectionPane.test.tsx`
- Test: `packages/components/src/components/Navigator/NavigatorServerRender.test.tsx`
- Test: `packages/components/src/components/Navigator/Navigator.test.tsx`, `packages/components/src/components/Pane/Pane.test.tsx` (label names)

**Interfaces:**
- Consumes: `depthOf`, `positionOf` (Task 2); `PaneChromeContextValue.backLabel`
  (Task 4); `textOf` from `./splitSecondary`.
- Produces:

```ts
// useTopPaneChrome.tsx
export function useTopPaneChrome(): PaneChromeContextValue   // scroll only, no backHref
```

- [ ] **Step 1: Rename the Back queries (S5)**

The depth-1 pane under a section list now reads `Back to <section>`. Run:

```bash
cd packages/components/src/components
sed -i '' "s/getByLabelText('Back')/getByLabelText(\/^Back\\\\b\/)/g; s/queryByLabelText('Back')/queryByLabelText(\/^Back\\\\b\/)/g; s/\[aria-label=\"Back\"\]/[aria-label^=\"Back\"]/g" \
  Navigator/NavigatorSectionPane.test.tsx Navigator/NavigatorServerRender.test.tsx Navigator/Navigator.test.tsx
```

then `grep -n "Back" Navigator/NavigatorSectionPane.test.tsx Navigator/NavigatorServerRender.test.tsx Navigator/Navigator.test.tsx | grep -v "Back\\\\b\|aria-label^=\|backHref\|backOf\|Back to"`
prints nothing. (`Pane.test.tsx` renders no section, so its exact `'Back'`
queries stay.)

Run: `cd packages/components && pnpm vitest run src/components/Navigator`
Expected: PASS still.

- [ ] **Step 2: Failing tests**

Append to `NavigatorSectionPane.test.tsx` after the `section routes`
describe (`Routed`, `panes`, `sectionPane`, `flushViewportMeasurement`,
`within`, `screen` in scope):

```tsx
describe('back chrome by depth', () => {
  function ThreeLevels({ value }: { value: string }) {
    return (
      <Navigator value={value}>
        <Navigator.Primary aria-label='Docs'>
          {testBrand}
          <Navigator.Item value='/tickets' href='/tickets' icon={<FakeIcon />}>
            Tickets
            <Navigator.Secondary aria-label='Events'>
              <Navigator.Item value='/tickets/glamping' href='/tickets/glamping'>
                Glamping
              </Navigator.Item>
            </Navigator.Secondary>
          </Navigator.Item>
        </Navigator.Primary>
        <Navigator.Content>
          <Pane role='detail' current aria-label='Glamping'>
            <Pane.Header />
          </Pane>
          <Pane role='detail' depth={2} current aria-label='Sam'>
            <Pane.Header backHref='/tickets/glamping' backLabel='Glamping' />
          </Pane>
        </Navigator.Content>
      </Navigator>
    )
  }

  it('gives the depth-1 pane the section route and label even when it is not the top', async () => {
    render(<ThreeLevels value='/tickets/glamping' />)
    await flushViewportMeasurement()
    const glamping = screen.getByLabelText('Glamping', { selector: 'section' })
    const back = within(glamping).getByLabelText('Back to Tickets')
    expect(back).toHaveAttribute('href', '/tickets')
    const sam = screen.getByLabelText('Sam', { selector: 'section' })
    expect(within(sam).getByLabelText('Back to Glamping')).toHaveAttribute(
      'href',
      '/tickets/glamping'
    )
    expect(within(sam).getByLabelText('Close')).toHaveAttribute(
      'href',
      '/tickets/glamping'
    )
    expect(within(glamping).getByLabelText('Close')).toHaveAttribute(
      'href',
      '/tickets'
    )
  })

  it('withholds it while the depth-1 pane is ahead of a revealed root', async () => {
    render(<ThreeLevels value='/tickets' />)
    await flushViewportMeasurement()
    expect(screen.queryByLabelText(/^Back\b/)).toBeNull()
    expect(screen.queryByLabelText('Close')).toBeNull()
  })

  it('labels the sub-page Back with the section', async () => {
    render(<Routed value='/components/a' />)
    await flushViewportMeasurement()
    const back = within(panes()[1]!).getByLabelText('Back to Components')
    expect(back).toHaveAttribute('href', '/components')
    expect(back.querySelector('[data-slot="pane-back-label"]')).toHaveTextContent(
      'Components'
    )
  })
})
```

(`FakeIcon` is in the `./testUtils` import already; add it if not.)

In `NavigatorServerRender.test.tsx`, add to `describe('Navigator server render of depths')`:

```tsx
  it('gives the depth-1 pane the section route and label, and the deeper pane its own', () => {
    const container = serverRender(<ThreeLevels value='/tickets/glamping' />)
    const [glamping, sam] = Array.from(
      container.querySelectorAll('[data-slot="pane"][data-role="detail"]')
    )
    expect(within(glamping as HTMLElement).getByLabelText('Back to Tickets')).toHaveAttribute(
      'href',
      '/tickets'
    )
    expect(within(sam as HTMLElement).getByLabelText('Back to Glamping')).toHaveAttribute(
      'href',
      '/tickets/glamping'
    )
    expect(within(glamping as HTMLElement).getByLabelText('Close')).toHaveAttribute(
      'href',
      '/tickets'
    )
  })
```

Run: `cd packages/components && pnpm vitest run src/components/Navigator/NavigatorSectionPane.test.tsx -t 'back chrome' src/components/Navigator/NavigatorServerRender.test.tsx -t 'depth-1'`
Expected: FAIL — Glamping has no Back (it is not the top) and no label.

- [ ] **Step 3: `useTopPaneChrome` is scroll only**

`useTopPaneChrome.tsx` — remove the `atRoot` parameter and its type, the
`activeSection` and `overflowOpen` reads, the `backHref` computation and its
place in the returned object and deps. The signature is
`export function useTopPaneChrome(): PaneChromeContextValue`, and the JSDoc
reads `/** The scroll chrome the orchestrator hands the top pane. */`.

- [ ] **Step 4: `Navigator.Content` composes the back chrome**

In `NavigatorContent.tsx`:

1. Import `textOf` from `'./splitSecondary'`.
2. Replace `const chrome = useTopPaneChrome({ atRoot })` with
   `const topChrome = useTopPaneChrome()` and delete the `atRoot` computation
   and its comment (nothing else reads it — `grep -n atRoot` must print
   nothing afterwards).
3. Add:
   ```ts
   const sectionBack = useMemo(
     () =>
       listPaneShows && !overflowOpen && activeSection?.href !== undefined
         ? { backHref: activeSection.href, backLabel: textOf(activeSection.label) }
         : null,
     [listPaneShows, overflowOpen, activeSection]
   )
   ```
4. Replace `chromeOf` with:
   ```ts
   const chromeOf = useCallback(
     (id: string, entry: PaneRegistration) => {
       const position = positionOf(id, entry)
       const scroll = position === 'top' ? topChrome : PANE_CHROME_NONE
       const back =
         sectionBack !== null &&
         position !== 'ahead' &&
         depthOf(id, entry) === 1
           ? sectionBack
           : null
       return back === null ? scroll : { ...scroll, ...back }
     },
     [positionOf, depthOf, topChrome, sectionBack]
   )
   ```

- [ ] **Step 5: Run**

Run: `cd packages/components && pnpm vitest run src/components/Pane src/components/Navigator`
Expected: PASS — including "gives the detail no Back link where it is the
root" (the detail is `ahead` on the section route and under `showList`, and
there is no section at `/`) and every hydration case; act count `0`.
`pnpm test`; root `pnpm typecheck && pnpm lint`.

- [ ] **Step 6: Commit**

```bash
git add -u packages/components/src
git commit -m "feat(navigator): the depth-1 pane gets the section route and label, whatever the width"
```

---

## Task 6: The inspector variant in the docs, and the changeset

**Files:**
- Modify: `docs/src/components/Navigation.tsx`
- Modify: `docs/src/app/components/pane/page.mdx` (the Roles example only)
- Modify: `.changeset/navigator-list.md`

**Interfaces:**
- Consumes: `pane-inspector-yielded:` (Task 1), imported by
  `docs/src/app/globals.css` through `@oztix/roadie-components/css` already.

- [ ] **Step 1: Build so the docs see the new dist and stylesheet**

```bash
pnpm --filter @oztix/roadie-core build && pnpm --filter @oztix/roadie-components build
```

- [ ] **Step 2: The docs site's trigger**

In `docs/src/components/Navigation.tsx`, the inspector drawer trigger's
`className='2xl:hidden'` becomes `className='hidden pane-inspector-yielded:inline-flex'`,
and its comment `// From 2xl the inspector is a column of its own — nothing to reveal.`
becomes `// Shown exactly while the inspector column has yielded.`. The
comment near line 184 (`…which yields its column below \`2xl\`…`) becomes
`…which yields its column when the stack no longer fits beside it.`, and the
one near line 403 (`{/* A column from 2xl up; … */}`) becomes
`{/* A column once every stack level fits beside it; otherwise the drawer in the detail pane's actions reaches it. */}`.

In `docs/src/app/components/pane/page.mdx`, the Roles example's
`className='2xl:hidden'` becomes `className='hidden pane-inspector-yielded:inline-flex'`.

`grep -rn "2xl" docs/src/components/Navigation.tsx docs/src/app/components/pane/page.mdx`
prints nothing.

- [ ] **Step 3: The changeset**

Append to `.changeset/navigator-list.md` (as it reads at that moment):

```md

`Navigator.Content` now decides how many pane columns fit from its own width,
with container queries: two columns from 46.25rem, three from 63rem, and a
stack below that. The left-most pane drops first, and one rule picks each
header's leading button at every width — Back on the left-most visible pane,
Close on the top pane when its parent is beside it, nothing on a middle
column. `Pane` takes `depth` (defaulting from `role`), `Pane.Header` takes
`backLabel` and lets `backHref` drive Close, and the section route reaches
the depth-1 pane whether or not it is the top. The inspector yields when the
stack no longer fits beside it; `pane-inspector-yielded:` styles its
affordance.
```

- [ ] **Step 4: Verify and commit**

`pnpm typecheck && pnpm lint` at the root, and
`pnpm --filter docs exec prettier --write src/components/Navigation.tsx`.

```bash
git add -u docs/src/components/Navigation.tsx docs/src/app/components/pane/page.mdx .changeset/navigator-list.md
git commit -m "docs: the inspector's affordance follows the pane columns variant"
```

---

## Task 7: Pane and Navigator docs

**Files:**
- Modify: `docs/src/app/components/pane/page.mdx`
- Modify: `docs/src/app/components/navigator/page.mdx`

**Interfaces:**
- Consumes: `Pane depth`, `Pane.Header backLabel` (Tasks 2, 4) from the
  built dist.

Edit the MDX by hand (never Prettier). Section headings and prose below are
the exact replacement text.

- [ ] **Step 1: Pane — Anatomy and Roles**

Delete the paragraph beginning `Because a docs example is a box inside a page,
its breakpoints are still the **viewport's**.` Replace it with:

```md
A docs frame is its own container: the columns below respond to the frame's
width, not the window's. Narrow the window to see the stack; widen it to see
the columns arrive.
```

In `### Roles`, replace the first paragraph with:

```md
`role` is a default depth plus a yield order, not a taxonomy. `list` is the
root (depth 0), `detail` sits under it (depth 1), and `inspector` is a fixed
14rem track off the stack that yields first — it shows only once every level
of the stack fits beside it, at 44.25rem with one level, 61rem with two and
77.75rem with three. Column widths come from position, not role: the
right-most visible pane fills and every pane to its left takes a parent
track, at least 16rem.
```

and the second paragraph's `and it lets the application own the media query
that picks the drawer's side — an app knows its own breakpoints; Roadie's
internals do not.` with `and `pane-inspector-yielded:` shows the trigger
exactly while the column is gone.`

- [ ] **Step 2: Pane — Stacking**

Replace everything from `### Stacking` to just before `### Composition` with:

````md
### Stacking

Panes are columns where there is room and a stack where there isn't, and
`Navigator.Content` decides from its own width: two columns from 46.25rem,
three from 63rem, one below that. The right-most column fills; the ones to
its left take a parent track.

Every pane has a `depth` — `list` defaults to 0, `detail` to 1, a sub-detail
declares `depth={2}` — and the deepest `current` pane is the top. The top is
always on screen; the panes behind it fill the remaining columns nearest
first, so the left-most pane drops first. In the stack only the top shows,
and push and pop between depths slide. In the columns nothing animates.

Select a row below, then resize the window — the same declaration is a
side-by-side reveal where two columns fit and a push where they don't.

```tsx-live-noinline
function Stacking() {
  const [selected, setSelected] = useState(null)
  const events = [
    { id: 'midnight', title: 'Midnight Frequency', subtitle: '1,240 sold · 60 remaining' },
    { id: 'sunset', title: 'Sunset Sounds', subtitle: '820 sold · 180 remaining' },
    { id: 'neon', title: 'Neon Dusk', subtitle: '540 sold · 460 remaining' },
    { id: 'harbour', title: 'Harbour Lights', subtitle: '2,010 sold · sold out' }
  ]
  const event = events.find((e) => e.id === selected)
  return (
    <div className='h-[30rem] overflow-hidden rounded-2xl border border-subtle'>
      <Navigator className='h-full'>
        <Navigator.Content>
          <Pane role='list' aria-label='Events'>
            <Pane.Header>
              <Pane.Title>Events</Pane.Title>
            </Pane.Header>
            <List>
              {events.map((e) => (
                <List.Item
                  key={e.id}
                  title={e.title}
                  subtitle={e.subtitle}
                  chevron
                  current={selected === e.id}
                  onClick={() => setSelected(e.id)}
                />
              ))}
            </List>
          </Pane>
          <Pane role='detail' current={event != null} aria-label='Event'>
            <Pane.Header onBack={() => setSelected(null)} backLabel='Events'>
              <Pane.Title>{event ? event.title : 'Nothing selected'}</Pane.Title>
            </Pane.Header>
            <div className='grid gap-3 pb-4'>
              <p className='text-subtle'>
                {event ? event.subtitle : 'Pick an event from the list.'}
              </p>
            </div>
          </Pane>
        </Navigator.Content>
      </Navigator>
    </div>
  )
}
render(<Stacking />)
```

````

- [ ] **Step 3: Pane — Composition's tail and "Closing a column"**

Replace the paragraph after the Composed example (`The back affordance appears
only on a non-\`list\` pane … Widen the window past \`lg\` and it goes.`) with:

```md
The back affordance appears on a non-root pane with a target. On its own, as
here, a pane is the left-most thing on screen, so it shows Back at every
width; inside `Navigator.Content` the columns decide, below.
```

Replace everything from `### Closing a column` to just before
`### Collapse on scroll` with:

````md
### Back, Close, or nothing

One leading cell, at most one glyph, decided by where the pane sits in the
columns:

| The pane is… | It shows |
| --- | --- |
| the root (depth 0) | nothing, ever |
| the left-most visible pane, with a parent that dropped | **Back**, to that parent |
| the top pane, with its parent visible beside it | **Close** |
| a middle column | nothing |
| not yet reached (a placeholder detail) | nothing |

On a phone the only visible pane is the top, so it is also the left-most: it
gets Back. Both buttons go to the same place — one level up. Back
navigates because the parent is off screen; Close only ever draws where
going up removes that column, so `backHref` drives both:

```tsx
<Pane role='detail' depth={2} current>
  <Pane.Header backHref='/tickets/glamping' backLabel='Glamping'>
    <Pane.Title>Sam Okafor</Pane.Title>
  </Pane.Header>
</Pane>
```

`backLabel` is the parent's title. It renders beside the caret where the
header is at least 24rem wide and reads as "Back to Glamping" everywhere;
without it the caret stands alone. Under a section's generated list the
depth-1 pane gets the section route and label from `Navigator` with nothing
declared.

`onBack` is the same target as a handler, and `onClose` overrides it for
Close alone:

```tsx
<Pane role='detail' current={event != null}>
  <Pane.Header onBack={() => setSelected(null)} onClose={() => setEvent(null)}>
    <Pane.Title>{event?.title}</Pane.Title>
  </Pane.Header>
</Pane>
```

Roadie can't close a pane it doesn't own — whether a column disappears is
your own routing or state, so the affordance only appears once you supply a
target. It never appears on the root pane, even if you thread the same handler
to every pane uniformly: the component knows which pane is the base of the
stack and withholds Close there itself.

````

- [ ] **Step 4: Pane — Guidelines and Accessibility**

Replace the `Declaration order is stack depth` guideline's Do text with:

```md
    Author panes shallowest first. Document order is depth once panes have
    mounted; `depth` (defaulting from `role`) is what the server render
    uses, so declare `depth={2}` on a sub-detail.
```

Add after the `Pane.Actions belongs directly under Pane.Header` guideline:

```mdx
<Guideline title='Give the root route a placeholder detail'>
  <Guideline.Do code={`<Navigator.Content>\n  <Pane role='list' />\n  <Pane role='detail' current={event != null}>\n    {event ? <EventDetail /> : <EmptyState title='No event selected' />}\n  </Pane>\n</Navigator.Content>`}>
    Render the detail pane on the root route too, as Mail's "No message
    selected". Unreached panes fill the leftover columns, so the row reads as
    a list beside an empty detail.
  </Guideline.Do>
  <Guideline.Dont code={`<Navigator.Content>\n  <Pane role='list' />\n  {event ? <Pane role='detail' current /> : null}\n</Navigator.Content>`}>
    Mount the detail only once something is selected. With one pane in the
    stack the list fills the whole row alone, then jumps to a parent track
    when the detail appears.
  </Guideline.Dont>
</Guideline>
```

In the bullet list, replace the `role` bullet with:

```md
- **`role` is a default depth plus yield order.** `list` is the root,
  `detail` sits under it, and an `inspector` is off the stack and yields
  first. Width comes from position: the right-most visible pane fills.
```

replace the inspector bullet with:

```md
- **An `inspector` needs an affordance you declare.** It is a column only once
  every stack level fits beside it. Put a [`Drawer`](/components/drawer) in
  the detail pane's `Pane.Actions` and show its trigger with
  `pane-inspector-yielded:`.
```

and replace the `current` bullet with:

```md
- **`current` decides the top at every width.** The deepest `current` pane
  is always on screen; which of the panes behind it still fit is the
  container's call.
```

In Accessibility, replace the Back and Close bullets with:

```md
- The back affordance is a labelled control — "Back", or "Back to <parent>"
  with `backLabel`. It appears on the left-most visible non-root pane: the
  top pane on a phone, or a parent column whose own parent has dropped.
- The close affordance is a labelled `IconButton` ("Close"), from `onClose`,
  `onBack` or `backHref` in that order. It appears only on the top pane while
  its parent is visible beside it, and never on the root pane.
```

- [ ] **Step 5: Navigator page**

In `### Panes`, replace the first paragraph with:

```md
`Navigator.Content` lays panes out as columns where they fit and stacks
them where they don't, from its own width. The right-most column fills and
the ones before it take a parent track; each pane scrolls independently.
```

In `### Pane header`, replace `It is depth-aware: a \`list\` (first) pane has
nothing to go back to and shows none, and the back row hides from \`lg\` up,
where every pane is a column beside its siblings rather than stacked over
them.` with `It is depth-aware: the root pane has nothing to go back to and
shows none; a pane whose parent is beside it shows Close instead, and a pane
whose parent has dropped shows Back — the same declaration, decided by how
many columns fit.`

In `## Pane surfaces and the mobile stack`, replace the first bullet with:

```md
- **Where columns don't fit, panes stack**, full-bleed, one visible at a
  time, and push/pop between them animates. Opening or closing More switches
  instantly. Which pane is on top is derived from the deepest pane marked
  `current`; how many of the panes behind it stay on screen is
  `Navigator.Content`'s width. Documented under [`Pane`](/components/pane).
```

- [ ] **Step 6: Verify**

```bash
grep -n '`lg`\|2xl\|breakpoints are still' docs/src/app/components/pane/page.mdx
grep -n 'from `lg`\|below `lg`\|above `lg`' docs/src/app/components/navigator/page.mdx
grep -rniE '(^|[^t])r[a]il' packages/components/src docs/src docs/contributing AGENTS.md .changeset --exclude-dir=node_modules --exclude-dir=dist
pnpm typecheck && pnpm lint
```

Expected: the first two greps print only the Emphasis example's
`lg:grid-cols-4` / `lg:w-auto` lines (grid sizing of the docs frame, not
pane behaviour); the third prints nothing; typecheck and lint green. In the
dev server (reuse or start on 9721), `/components/pane` renders every
example and the Props table lists `depth` on `Pane` and `backLabel` on
`Pane.Header`.

- [ ] **Step 7: Commit**

```bash
git add docs/src/app/components/pane/page.mdx docs/src/app/components/navigator/page.mdx
git commit -m "docs(pane): columns, depth, and the one button rule"
```

---

## Task 8: Nested Navigator scoping

**Files:**
- Test: `packages/components/src/components/Pane/paneColumns.test.ts`
- Test: `packages/components/src/components/Pane/Pane.test.tsx`

**Interfaces:**
- Consumes: `renderPaneColumnsCss` (Task 1); the level attributes (Task 2).

The proposal flagged that an outer row's `:has()` would count a nested
Navigator's panes. Task 2 gave every row and pane a level and Task 1 keyed
every rule on it; this task pins that, then Task 9 sees it in a browser.

- [ ] **Step 1: The stylesheet never crosses levels**

Append to `paneColumns.test.ts`'s `the generated stylesheet` describe:

```ts
  it('counts and places panes of one level only', () => {
    const css = renderPaneColumnsCss()
    const rules = css.split('\n').filter((line) => line.includes('[data-stack]'))
    for (const rule of rules) {
      const levels = new Set(rule.match(/\[data-level="(\d)"\]/g))
      expect(levels.size).toBe(1)
    }
  })

  it('reaches the inspector of its own level only', () => {
    const css = renderPaneColumnsCss()
    const rules = css.split('\n').filter((line) => line.includes('[data-role="inspector"][data-level'))
    expect(rules).toHaveLength(8)
    for (const rule of rules) {
      const levels = new Set(rule.match(/\[data-level="(\d)"\]/g))
      expect(levels.size).toBe(1)
    }
  })
```

Run: `cd packages/components && pnpm vitest run src/components/Pane/paneColumns.test.ts`
Expected: PASS (Task 1 wrote the rules that way; this pins it — if a rule
mixes levels, fix `renderPaneColumnsCss`, regenerate, and re-run).

- [ ] **Step 2: A nested stack keeps its own reveal**

Append to `Pane.test.tsx`'s `depth attributes` describe:

```tsx
  it('reveals the inner root without revealing the outer one', async () => {
    render(
      <Navigator value='/a'>
        <Navigator.Content>
          <Pane role='list'>Outer list</Pane>
          <Pane role='detail' current>
            Outer
            <Navigator value='/x'>
              <Navigator.Content>
                <Pane role='list' current>
                  Inner list
                </Pane>
                <Pane role='detail'>Inner detail</Pane>
              </Navigator.Content>
            </Navigator>
          </Pane>
        </Navigator.Content>
      </Navigator>
    )
    await flushViewportMeasurement()
    const [outer, inner] = Array.from(
      document.querySelectorAll('[data-slot="navigator-panes"]')
    )
    expect(outer).not.toHaveAttribute('data-reveal')
    expect(inner).not.toHaveAttribute('data-reveal')
    const panes = Array.from(document.querySelectorAll('[data-slot="pane"]'))
    expect(panes.map((p) => p.getAttribute('data-stack-position'))).toEqual([
      'behind',
      'top',
      'top',
      'ahead'
    ])
  })
```

Run: `cd packages/components && pnpm vitest run src/components/Pane/Pane.test.tsx -t 'inner root'`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add -u packages/components/src
git commit -m "test(pane): the column stylesheet and the reveal stay within one Navigator"
```

---

## Task 9: Browser verification

**Files:** none changed unless a check fails (then fix in the owning file,
with a test, regenerate the stylesheet if the table changed, and re-run the
gate). The one anticipated fix is Step 6's.

**Interfaces:**
- Consumes: the docs dev server (port 9721, or a running one), Playwright MCP
  tools (`browser_navigate`, `browser_resize`, `browser_evaluate`,
  `browser_click`, `browser_snapshot`, `browser_take_screenshot`).

- [ ] **Step 1: Build and serve**

```bash
pnpm --filter @oztix/roadie-core build && pnpm --filter @oztix/roadie-components build
lsof -iTCP -sTCP:LISTEN | grep node
```

If a docs `next dev` is listed, use its port; otherwise
`pnpm --filter docs exec next dev --port 9721` (in the background) and wait for
"Ready". Call the base URL `$BASE` below.

- [ ] **Step 2: The probe**

Every check runs this in `browser_evaluate` and reports the result verbatim in
the task report; a run where `innerWidth` is `0` is invalid. `frame` is a
CSS selector for the `Navigator.Content` under test (`'main[data-slot="navigator-content"]'`
on the docs site; the example's own inside a docs frame).

```js
(frame) => {
  const content = document.querySelector(frame)
  const panes = [...content.querySelectorAll('[data-slot="pane"]')].map((pane) => {
    const rect = pane.getBoundingClientRect()
    const header = pane.querySelector('[data-slot="pane-header"]')
    const shown = (slot) => {
      const el = pane.querySelector(`[data-slot="${slot}"]`)
      return el ? getComputedStyle(el).display !== 'none' : false
    }
    return {
      label: pane.getAttribute('aria-label') ?? pane.dataset.navigatorSection ?? pane.dataset.role,
      depth: pane.dataset.depth ?? null,
      current: pane.hasAttribute('data-current'),
      level: pane.dataset.level ?? null,
      width: Math.round(rect.width),
      visible: rect.width > 0 && getComputedStyle(pane).visibility !== 'hidden' && getComputedStyle(pane).display !== 'none',
      position: getComputedStyle(pane).position,
      back: shown('pane-back') ? pane.querySelector('[data-slot="pane-back"] a, [data-slot="pane-back"] button')?.getAttribute('aria-label') : null,
      backHref: pane.querySelector('[data-slot="pane-back"] a')?.getAttribute('href') ?? null,
      backLabelShown: pane.querySelector('[data-slot="pane-back-label"]') ? getComputedStyle(pane.querySelector('[data-slot="pane-back-label"]')).display !== 'none' : null,
      close: shown('pane-close'),
      closeHref: pane.querySelector('[data-slot="pane-close"] a')?.getAttribute('href') ?? null,
      headerShown: header ? getComputedStyle(header).display !== 'none' : null
    }
  })
  const row = content.querySelector('[data-slot="navigator-panes"]')
  return {
    innerWidth: window.innerWidth,
    path: location.pathname + location.search,
    contentWidth: Math.round(content.getBoundingClientRect().width),
    reveal: row.hasAttribute('data-reveal'),
    overflow: row.hasAttribute('data-overflow'),
    panes
  }
}
```

- [ ] **Step 3: The five frames**

Open `$BASE/components/pane` at 1600 wide. Use the Stacking example's frame;
`browser_evaluate` can set its wrapper width:
`document.querySelector('<frame wrapper>').style.width = '<px>px'` (the
`h-[30rem]` div around the example's `Navigator`). Select "Midnight
Frequency" so the detail is current, then for each of 375, 760, 932, 1188 and
1348 set the width and run the probe. Expected (two levels — the docs
example has no sub-detail; the Roles example adds an inspector):

| width | visible panes and widths | buttons |
| --- | --- | --- |
| 375 | Event only, 375 | Back to Events, label hidden |
| 760 | Events 276 · Event 448 | Close on Event; no Back |
| 932 | Events 373 · Event 523 | Close on Event |
| 1188 | Events ≤384 · Event fills | Close on Event |
| 1348 | same, and in the Roles frame the inspector at 224 | same |

With nothing selected (`reveal` false, no `current`): the list fills alone
at 375; at 760 and up the list is a parent track and the detail fills with
no button. Tolerance: ±2px on every width.

Then the three-level case on the docs site itself: `$BASE/components/button`
has the generated Components list (depth 0) and the page (depth 1). Confirm
at 1024 (`contentWidth` ≈ 932): two columns, Close on the page with
`closeHref` `/components`, no Back; at 1280 (≈1188 with the sidebar
collapsed): two columns still (there is no depth 2), Close; at 390: the page
alone with `back` `Back to Components`, `backLabelShown` **true** (390 ≥
384); at 375: `backLabelShown` false.

- [ ] **Step 4: The docs site at each width**

For each of 390, 1024, 1440 (`browser_resize` then `browser_navigate`):

- `$BASE/` — one pane, `depth` `0`, no buttons.
- `$BASE/overview/philosophy` — at 390 the page is top with
  `Back to Home` → `/`; at 1024 and 1440 the Home list (depth 0) beside the
  page with Close → `/`.
- `$BASE/components` — at 390 the list is top, `reveal` true, no buttons;
  at 1024 and 1440 the list beside the page, `reveal` true, page not
  `current`... the page **is** current on the docs site — then `reveal` is
  true because the route is the section route, and the page (depth 1, ahead)
  fills with no button.
- `$BASE/components/navigator` at 1440 — the "On this page" inspector shows
  (contentWidth ≥ 976 = 61rem) and the drawer trigger in the page's header is
  hidden; at 1024 the inspector is gone and the trigger visible.

- [ ] **Step 5: More and phones**

At 390 on `$BASE/components/button`: tap More in the bar. `overflow` and
`reveal` true, the More pane `depth` `0`, visible, the Components list
`display: none`, the page parked. Tap More again: back to the page, no slide
(take two screenshots 100ms apart after the tap; they match).

On a real phone or the emulator's iPhone 14 (`browser_resize` 390×844 plus a
touch emulation if available): `$BASE/components/button` shows Back to
Components with the label; `$BASE/overview/philosophy` shows Back to Home.

- [ ] **Step 6: The 2→1 narrowing stray slide**

On the Stacking frame with "Midnight Frequency" selected at 760, set the
wrapper width to 700 in one step and immediately take three screenshots at
0, 150 and 350ms (`browser_take_screenshot` in a `browser_evaluate` loop
with `setTimeout`, or three consecutive calls). The Events list must be gone
in all three — no frame shows it sliding left under the detail.

If it does slide: in `NavigatorContent`, generalise the `data-instant`
insertion effect that fires when `overflowOpen` changes so it also fires
when `topId` changes — the attribute becomes `data-pushing`, set for two
frames when the top changes **during a navigation**, and the stacked-tier
transition in `paneColumns.ts`'s `STATIC` block moves under
`[data-slot="navigator-content"][data-pushing] [data-slot="navigator-panes"] [data-stack]`
while `data-instant:` stays for More. Regenerate, add a test to
`Navigator.test.tsx` that the attribute appears after a `current` flip and
is gone two frames later (drive `requestAnimationFrame` as the "hands chrome
to the wrapped top pane" test does), re-run the gate, and re-check this step.

- [ ] **Step 7: Nested Navigator**

In `browser_evaluate` on `$BASE/components/pane`, there is no nested example;
instead confirm on `$BASE/components/navigator` that the docs site's own
outer row (level 0) reports every embedded example's panes at `level` `1`,
and that the outer page's `back`/`close` are unchanged by opening an example's
detail (select a row in the Pane header example, re-probe the outer frame).

- [ ] **Step 8: Console**

`browser_console_messages` on `/`, `/components/button`,
`/components/pane` and `/components/navigator`: no `[Roadie]` warnings, no
hydration errors.

- [ ] **Step 9: Report and clean up**

Stop the dev server only if this task started it. Write each probe result
into the task report. Nothing to commit unless a fix was needed.

---

## Self-review against the spec

**Spec coverage**

| Spec | Task |
| --- | --- |
| §1 tokens, tiers 46.25 / 63rem, no tier 4 | 1 (`columnTier`, tests) |
| §1 sizing by position: fill and parent tracks | 1 (`parentTrack`, `geometry`), 9 step 3 widths |
| §2 depth, T, rank, contiguous window | 1 (`paneCell`, evidence tests) |
| §2 depth after registration is DOM order; declared/default before | 2 (`resolveDepths`, `provisionalDepth`, SSR test) |
| §2 inspector `tier(min(N,3)) + 14.75rem`, yields first, variant | 1 (`inspectorTier`, rules, variant), 6 (docs usage), 9 step 4 |
| §2 More as a revealed depth-0 pane | 2 (row `data-reveal`/`data-overflow`, S7), 1 (static rules), 9 step 5 |
| §2 four levels slide; fifth warns | 1 (test "slides the window"), 2 (warning) |
| §2 one-pane stack is the root | 2 (`resolveDepths` "lone detail"), S1 |
| §3 button table | 1 (`paneCell` tests), 4 (cells), 9 |
| §3 Back and Close to the parent route; Close from `backHref` | 4 |
| §3 orchestrator gives the depth-1 pane route + label | 5 |
| §3 label ≥ 24rem, `Back to …`, icon-only without | 4 (`paneBackLabelClass`, header container), 9 step 3 (390 vs 375) |
| §3 header collapse via `--pane-edge` | 4 (`edgeOnly` variants) |
| §4 attributes | 2 |
| §4 generated CSS, `@layer components`, drift test | 1 |
| §4 standalone defaults | 1 (static rules), 4 (test "never offers Back on a depth-0 pane") |
| §4 transitions: stacked slides, columns none, reduced motion | 1 (`STATIC`, `geometry`) |
| §4 2→1 stray slide check | 9 step 6 |
| §4 nested scoping | 1 (levels), 2 (level attrs), 8, 9 step 7 |
| §5 `depth`, `backLabel`, `backHref` Close, `current`, variant, migration table | 2, 4, 3, 6 |
| §6 docs | 6, 7 |
| §7 edge cases | 2 (warnings, quiet page-first root), 4 (`onClose` alone) |
| §8 tests and browser checks | 1, 2, 4, 5, 8, 9 |

**Conflicts found between the proposal and the current code, decided above:**

- `Pane.test.tsx` "renders no close control from backHref alone" and
  "draws a Back link from orchestrator chrome, never a Close" assert the rule
  the proposal reverses — rewritten in Task 4.
- `PaneHeader` gates Back on `role !== 'list'`; the spec gates on depth 0 —
  Task 4, with S1's contiguous depths making a lone `detail` the root.
- `useTopPaneChrome` hands `backHref` to the top pane only and suppresses it
  `atRoot`; the spec hands it to the depth-1 pane — Task 5, S6 and S11.
- `provisionalPosition` leaves an undeclared second `current` pane's order
  unknown on the server; `depth` fixes the visible cases — Task 2.
- The proposal's `[data-stack]:not([data-slot=pane] *)` nested scoping cannot
  work (the inner panes are themselves inside a pane); levels replace it —
  Tasks 1 and 2.
- The proposal's "docs example's breakpoints are still the viewport's"
  paragraph and every `lg` / `2xl` claim in the Pane and Navigator docs —
  Task 7.

**Placeholder scan:** no TBD/TODO; every code step carries its code; every
test step names its command and expected outcome; the one conditional fix
(Task 9 step 6) says exactly what to change.

**Type consistency:** `PaneDepth` (Task 1) is the type of
`PaneRegistration.depth` and `Pane depth` (Task 2); `paneCell` /
`renderPaneColumnsCss` (Task 1) are what `paneColumns.test.ts` (Tasks 1, 8)
and the generator call; `depthOf(id, entry)` and `level` (Task 2) are read by
`PaneRoot` (Task 2), the `fakeStack` fixtures (Tasks 2, 4) and `chromeOf`
(Task 5); `provisionalDepth` / `resolveDepths` (Task 2) take `DepthEntry`,
which `RegisteredPane` satisfies; `PaneChromeContextValue.backLabel` (Task 4)
is what Task 5's `sectionBack` supplies; `navigatorPanesVariants` (Task 2) is
what Task 3 moves the inset onto; `paneBackLabelClass` and the four
`edgeOnly` values (Task 4) are what `PaneHeader` renders and the tests assert.
