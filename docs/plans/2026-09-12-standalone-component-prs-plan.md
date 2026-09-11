# Standalone component PRs — ScrollArea, List, Drawer, Accordion, Tooltip, Badge

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the six self-contained pieces of the Navigator work as six
independent PRs cut from `main`, each with its docs page and changeset, so the
Navigator branch can be rebased to carry only Navigator, Pane and the redesign.

**Architecture:** Four PRs are **extractions**: the code already exists on
`feat/navigator-component` and is lifted with `git checkout
feat/navigator-component -- <paths>` onto a fresh branch from `main`, plus a
small number of hand-applied partial hunks from shared files. Two PRs are
**new work** built TDD on `main`: a `Tooltip` compound on Base UI's Tooltip
primitive, and a `hideLabel` boolean on `Badge`. Each PR is independently
mergeable; only Drawer depends on List (its test imports List).

**Tech Stack:** React 19, TypeScript strict, CVA, Tailwind v4, Base UI 1.8.0
(`@base-ui/react/tooltip`), tsdown (unbundle), Vitest + React Testing Library,
Next.js 16 MDX docs, Changesets.

**Spec:** `docs/plans/2026-09-11-navigator-redesign-design.md` — section
"Delivery" (order), section 5 "Labels" (Tooltip requirements) and "Badge"
(`hideLabel` requirements). Read both before starting.

## Global Constraints

Every task's requirements implicitly include this section.

- **Order:** 1 ScrollArea → 2 List → 3 Drawer + core `motion-drawer` → 4
  Accordion → 5 Tooltip → 6 Badge `hideLabel`. PR 3 must not be opened until PR
  2 has merged (its test imports `List`). PRs 1, 2, 4, 5 and 6 are otherwise
  independent; merge in the listed order anyway so the changelog reads in order.
- **Every PR is cut from the current `main`**, never from
  `feat/navigator-component` or from another PR's branch.
- **Never check out whole shared files from the Navigator branch.** For
  `packages/components/src/index.tsx`, `packages/components/package.json`,
  `packages/components/src/variants.ts`, `packages/components/vitest.setup.ts`,
  `packages/core/src/css/motion.css`, `AGENTS.md` and
  `docs/src/app/debug/rsc-smoke/page.tsx`, apply only the hunk named in the
  task by hand. Everything else in those files belongs to Navigator.
- **Do not bring across:** `docs/src/lib/component-manifest.ts`, the branch's
  `docs/src/components/Navigation.tsx`, `docs/src/app/layout.tsx`,
  `docs/src/components/ComponentSkeleton.tsx`,
  `docs/src/components/CodePreview.tsx`, `NavigatorCanary.tsx`, anything under
  `Navigator/` or `Pane/`, `utils/reducedMotion.ts`,
  `utils/useIsomorphicLayoutEffect.ts`, `packages/core/src/css/layout.css`, the
  `animate-pop-tap` hunk of `motion.css`, `.changeset/navigator-list.md`,
  `.changeset/app-frame-core-css.md`.
- **Docs pages extracted to `main` keep a `# Title` heading** directly after the
  imports — `main`'s docs layout does not render `metadata.title` as the page
  heading. The three branch pages (ScrollArea, List, Drawer) never had one, so
  add it. The Navigator branch strips these again after it rebases (the
  redesign plan's Task 0). New pages written here (Tooltip) also carry
  `# Title`.
- **Docs nav on `main` is a filesystem scan.** `getNavigationItems` in
  `docs/src/app/layout.tsx` and the index in `docs/src/app/components/page.tsx`
  read every `docs/src/app/components/*/page.mdx` `metadata` block and group by
  `category`. Adding the folder with a valid `metadata` export is the whole
  registration. Categories used here: `Layout` (ScrollArea), `Navigation`
  (List), `Overlays` (Drawer, Tooltip). The index page's thumbnail switch has no
  case for these; they fall through to its `default:` skeleton — acceptable.
- **Live examples** resolve components from the root barrel
  (`CodePreview` spreads `...RoadieComponents`), so every new compound needs its
  barrel export or its `tsx-live` blocks fail. Icons in scope use short aliases
  (`Info`, `Heart`, `Gear`, `Trash`, `PencilSimple`, …) — see the `scope`
  object in `docs/src/components/CodePreview.tsx`.
- **`packages/components/package.json` `exports` is generated.** Run
  `pnpm --filter @oztix/roadie-components generate:exports` and commit the
  result; never hand-edit the block. `tsdown.config.ts` needs no change
  (`unbundle: true`, glob entry).
- **Safelist:** no entry. `motion-drawer` ships as raw `@utility` source via
  `@oztix/roadie-core/css`; `main`'s safelist carries no `motion-*` utilities
  and adding one would be new policy.
- **`pnpm --filter … test -- <file>` does not filter.** Use
  `cd packages/components && pnpm vitest run <path>`.
- **Prove every new assertion fails against the unfixed code** before making it
  pass (Tasks 5 and 6; the Accordion Safari test in Task 4).
- **Base UI conventions** (`docs/contributing/BASE_UI.md`): per-component
  subpath imports, `type X = Primitive.Part.Props & RefAttributes<El>`, never
  `interface extends` on Base UI parts, `'use client'` on every file importing
  `@base-ui/react/*`, server-safe `index.tsx`, `data-slot` on every rendered
  leaf, dot-notation `displayName`.
- **Don't type CVA variant props as `VariantProps<…>['key']`** on public props —
  inline the literal union (see
  `docs/solutions/build-errors/react-docgen-cva-literal-props.md`).
- **Comments explain *why*, never *what*.** Terse.
- **Sentence case** in all docs copy.
- **Elevation refresh is already on `main`** (PR #132 — elevation/shadow scale,
  `emphasis-field`, field states, Select trigger `border-transparent`; released
  as core 2.7.0 / components 2.12.1 via #133). Always `git fetch` and cut from
  the current `origin/main`. None of these PRs touch `Input`, `Textarea`,
  `Select` or `emphasis.css`; if a branch-side file conflicts with them, take
  `main`'s side.
- **Each Task section is self-contained.** An agent executing one PR reads this
  Global Constraints section, "Working setup", and its own Task — nothing else
  in this document.
- **Browser checks use a separate docs dev server** on port 9701 from the PR's
  own worktree (`pnpm --filter docs exec next dev --port 9701` — the `dev`
  script hardcodes 9614). Port 9614 is the Navigator branch's server; leave it
  alone. Use the Playwright MCP tools.
- **Verification gate for every PR** before opening it:
  `pnpm --filter @oztix/roadie-components test`, `pnpm typecheck`, `pnpm lint`,
  `pnpm --filter @oztix/roadie-core build`,
  `pnpm --filter @oztix/roadie-components build` (runs `generate:exports`,
  `check:dts`, `check:exports`). If typecheck passes locally but CI fails,
  delete every `tsbuildinfo` and re-run (AGENTS.md → Testing).

---

## Working setup (read once)

Each PR gets its own git worktree off `main` so the Navigator checkout and its
dev server are never disturbed:

```bash
git fetch origin
git worktree add ../roadie-pr-<slug> -b <branch> origin/main
cd ../roadie-pr-<slug>
corepack enable && pnpm install
```

Branch names: `feat/scroll-area`, `feat/list`, `feat/drawer`,
`fix/accordion-content-inset`, `feat/tooltip`, `feat/badge-hide-label`.

Extraction commands run from inside that worktree:
`git checkout feat/navigator-component -- <path> [<path> …]`. Refs are shared
across worktrees, so the Navigator branch is always reachable by name.

---

## File structure

**PR 1 — ScrollArea (extraction)**

| File | Change |
| --- | --- |
| `packages/components/src/components/ScrollArea/*` (10 files: `index.tsx`, `variants.ts`, `ScrollArea.test.tsx`, `ScrollArea{Root,Viewport,Content,Scrollbar,Thumb,Corner}.tsx`) | checked out whole |
| `packages/components/vitest.setup.ts` | add the `getAnimations` stub hunk |
| `packages/components/src/index.tsx` | barrel block |
| `packages/components/package.json` | `./scroll-area` export (generated) |
| `docs/src/app/components/scroll-area/page.mdx` | checked out, `# ScrollArea` added |
| `docs/src/app/debug/rsc-smoke/page.tsx` | ScrollArea canary section |
| `docs/src/components/PropsDefinitions.tsx` | duplicate `X.Root` section fix (commit `f6a0658b`) |
| `.changeset/scroll-area.md` | new |

**PR 2 — List (extraction)**

| File | Change |
| --- | --- |
| `packages/components/src/components/List/*` (7 files: `index.tsx`, `variants.ts`, `List.test.tsx`, `List{Root,Item,Group,GroupTitle}.tsx`) | checked out whole |
| `packages/components/src/index.tsx` | barrel block |
| `packages/components/package.json` | `./list` export (generated) |
| `docs/src/app/components/list/page.mdx` | checked out, `# List` added |
| `docs/src/app/debug/rsc-smoke/page.tsx` | List canary section |
| `AGENTS.md` | Linking: `List.Item` joins the `href` list |
| `.changeset/list.md` | new |

**PR 3 — Drawer + `motion-drawer` (extraction)**

| File | Change |
| --- | --- |
| `packages/components/src/components/Drawer/*` (19 files) | checked out whole |
| `packages/components/src/variants.ts` | `surfaceTitleClass` + `RoadieIntent` only |
| `packages/core/src/css/motion.css` | `motion-drawer` utility only |
| `packages/components/src/index.tsx` | barrel block |
| `packages/components/package.json` | `./drawer` export (generated) |
| `docs/src/app/components/drawer/page.mdx` | checked out, `# Drawer` added, Pane link reworded |
| `docs/src/app/debug/rsc-smoke/page.tsx` | Drawer canary section |
| `.changeset/drawer.md` | new (components + core) |

**PR 4 — Accordion (extraction)**

| File | Change |
| --- | --- |
| `packages/components/src/components/Accordion/{Accordion.test.tsx,AccordionContent.tsx,AccordionItem.tsx,AccordionTrigger.tsx,variants.ts}` | checked out whole (`AccordionContext.ts`, `AccordionRoot.tsx`, `index.tsx` are unchanged) |
| `packages/components/src/components/Accordion/Accordion.test.tsx` | + Safari `--content-height` suite (new — no branch test covers it) |
| `.changeset/accordion-content-inset.md` | new |

**PR 5 — Tooltip (new)**

| File | Change |
| --- | --- |
| `packages/components/src/components/Tooltip/Tooltip{Provider,Root,Trigger,Portal,Positioner,Popup,Arrow,Content}.tsx` | create |
| `packages/components/src/components/Tooltip/variants.ts` | create |
| `packages/components/src/components/Tooltip/index.tsx` | create |
| `packages/components/src/components/Tooltip/Tooltip.test.tsx` | create |
| `packages/components/src/index.tsx` | barrel block |
| `packages/components/package.json` | `./tooltip` export (generated) |
| `docs/src/app/components/tooltip/page.mdx` | create |
| `docs/src/app/debug/rsc-smoke/page.tsx` | Tooltip canary section |
| `.changeset/tooltip.md` | new |

**PR 6 — Badge `hideLabel` (new)**

| File | Change |
| --- | --- |
| `packages/components/src/components/Badge/index.tsx` | `hideLabel` prop + variants |
| `packages/components/src/components/Badge/Badge.test.tsx` | new `hideLabel` suite |
| `docs/src/app/components/badge/page.mdx` | "Hidden label" example |
| `.changeset/badge-hide-label.md` | new |

---

## Task 1: ScrollArea

**Files:** see the PR 1 table.

**Interfaces:**
- Produces: `ScrollArea` (+ `.Viewport`, `.Content`, `.Scrollbar`, `.Thumb`,
  `.Corner`) from `@oztix/roadie-components/scroll-area` and the barrel, plus
  the `scrollArea*Variants` and prop types in step 4. Navigator and Pane import
  it after the rebase; nothing in this plan consumes it.

- [ ] **Step 1: Cut the branch and check out the component**

```bash
git worktree add ../roadie-pr-scroll-area -b feat/scroll-area origin/main
cd ../roadie-pr-scroll-area && pnpm install
git checkout feat/navigator-component -- \
  packages/components/src/components/ScrollArea \
  docs/src/app/components/scroll-area/page.mdx
```

Confirm nothing branch-only is imported:
`grep -rn "^import" packages/components/src/components/ScrollArea`
Expected: only `react`, `@oztix/roadie-core/utils`,
`@base-ui/react/scroll-area`, `class-variance-authority` and sibling files.

- [ ] **Step 2: Run the tests and watch them fail**

Run: `cd packages/components && pnpm vitest run src/components/ScrollArea`
Expected: an unhandled `getAnimations is not a function` error from Base UI's
`ScrollAreaViewport` timer — `main`'s `vitest.setup.ts` has no stub.

- [ ] **Step 3: Add the `getAnimations` stub**

In `packages/components/vitest.setup.ts`, inside `beforeAll`, after the
IntersectionObserver block and before the `matchMedia` block:

```ts
  // jsdom has no Web Animations API; Base UI's ScrollAreaViewport calls
  // getAnimations() on a timer, which surfaces as an unhandled error.
  if (typeof Element.prototype.getAnimations === 'undefined') {
    Element.prototype.getAnimations = () => []
  }
```

Run: `cd packages/components && pnpm vitest run src/components/ScrollArea`
Expected: PASS, no unhandled errors.

- [ ] **Step 4: Barrel export and subpath**

In `packages/components/src/index.tsx`, after the `Separator` export block:

```ts
export {
  ScrollArea,
  scrollAreaRootVariants,
  scrollAreaViewportVariants,
  scrollAreaContentVariants,
  scrollAreaScrollbarVariants,
  scrollAreaThumbVariants,
  scrollAreaCornerVariants,
  type ScrollAreaProps,
  type ScrollAreaViewportProps,
  type ScrollAreaContentProps,
  type ScrollAreaScrollbarProps,
  type ScrollAreaThumbProps,
  type ScrollAreaCornerProps,
  type ScrollAreaScrollbarOrientation,
  type ScrollAreaFade
} from './components/ScrollArea'
```

Run `pnpm --filter @oztix/roadie-components generate:exports` and confirm
`packages/components/package.json` gained exactly:

```json
    "./scroll-area": {
      "types": "./dist/components/ScrollArea/index.d.ts",
      "import": "./dist/components/ScrollArea/index.js"
    },
```

- [ ] **Step 5: Docs page title and canary**

In `docs/src/app/components/scroll-area/page.mdx`, insert after the last
`import` line and its blank line:

```mdx
# ScrollArea
```

In `docs/src/app/debug/rsc-smoke/page.tsx`, add
`import { ScrollArea } from '@oztix/roadie-components/scroll-area'` and
`ScrollArea as ScrollAreaViaBarrel` in the barrel import block, then copy the
ScrollArea sections (and only those) from
`git show feat/navigator-component:docs/src/app/debug/rsc-smoke/page.tsx`
(search `ScrollArea`) into the page before `</main>`.

- [ ] **Step 6: PropsDefinitions duplicate-root fix**

`ScrollAreaRoot.displayName = 'ScrollArea.Root'` prints a duplicate
"ScrollArea.Root" props section on `main` (Card, Tabs and Accordion already
suffer this). Apply the branch's fix:

```bash
git checkout feat/navigator-component -- docs/src/components/PropsDefinitions.tsx
git diff origin/main -- docs/src/components/PropsDefinitions.tsx
```

Expected diff: only the `hasBareRoot` filter from commit `f6a0658b`. If it
shows anything else, revert the file and apply this hunk by hand in place of
`const components = Array.from(seen.values())`:

```ts
    // A root that sets `displayName = 'X.Root'` arrives as `X.Root`, which
    // the `Root` suffix guard above never sees, and duplicates the bare `X`.
    const hasBareRoot = compoundName && seen.has(compoundName.toLowerCase())
    const components = Array.from(seen.values()).filter(
      (info) => !(hasBareRoot && info.displayName === `${compoundName}.Root`)
    )
```

- [ ] **Step 7: Changeset**

`.changeset/scroll-area.md`:

```md
---
"@oztix/roadie-components": minor
---

Add `ScrollArea`, which gives any bounded region a consistent custom scrollbar.
```

- [ ] **Step 8: Verify**

Run the verification gate. Then
`pnpm --filter docs exec next dev --port 9701` and, at 1440×900:
`/components/scroll-area` is listed under **Layout**, shows the heading once,
every live example renders and scrolls, and the props table has no duplicate
`ScrollArea.Root` section. `/components/card` has also lost its duplicate
`Card.Root` section.

- [ ] **Step 9: Commit and open the PR**

```bash
git add packages/components/src/components/ScrollArea \
  packages/components/vitest.setup.ts packages/components/src/index.tsx \
  packages/components/package.json docs/src/app/components/scroll-area \
  docs/src/app/debug/rsc-smoke/page.tsx docs/src/components/PropsDefinitions.tsx \
  .changeset/scroll-area.md
git commit -m "feat(components): add ScrollArea"
git push -u origin feat/scroll-area && gh pr create --fill
```

---

## Task 2: List

**Files:** see the PR 2 table.

**Interfaces:**
- Produces: `List` (+ `.Item`, `.Group`, `.GroupTitle`), `ListProps`,
  `ListItemProps`, `ListItemCurrent`, `ListEmphasis`. `List.Item` is
  `href`-only (routes through `RoadieRoutedLink`), no `render`, and wraps its
  row in its own `<li>`. Task 3's test imports `{ List } from '../List'`.

- [ ] **Step 1: Cut and check out**

```bash
git worktree add ../roadie-pr-list -b feat/list origin/main
cd ../roadie-pr-list && pnpm install
git checkout feat/navigator-component -- \
  packages/components/src/components/List \
  docs/src/app/components/list/page.mdx
```

- [ ] **Step 2: Run the tests**

Run: `cd packages/components && pnpm vitest run src/components/List`
Expected: PASS (List needs nothing beyond `main`'s setup; `RoadieRoutedLink`
and `@phosphor-icons/react/ssr` are on `main`).

- [ ] **Step 3: Barrel export and subpath**

After the `Marquee` export in `packages/components/src/index.tsx`:

```ts
export {
  List,
  type ListProps,
  type ListItemProps,
  type ListItemCurrent,
  type ListEmphasis
} from './components/List'
```

Run `generate:exports`; confirm the `./list` entry
(`./dist/components/List/index.{d.ts,js}`).

- [ ] **Step 4: Docs title, canary, AGENTS.md**

Add `# List` after the imports in `docs/src/app/components/list/page.mdx`, then
`grep -n "Pane\|Navigator" docs/src/app/components/list/page.mdx`.
Expected: no matches. If any appear, reword that sentence without the
reference.

Canary: `import { List } from '@oztix/roadie-components/list'`,
`List as ListViaBarrel`, and only the List sections from the branch's
`rsc-smoke/page.tsx`.

`AGENTS.md` → Linking: change the component list to

```md
Every link-bearing Roadie component (`Button`, `IconButton`, `Card`,
`Breadcrumb.Link`, `Carousel.TitleLink`, `Tabs.Tab`, `List.Item`) accepts a single
```

and append to convention 2, after "…to deliver the same contract.":

```md
   `List.Item` is `href`-only — no `render` prop — so a case `href` can't
   express means composing your own row rather than escaping into `render`.
```

Don't mention `Navigator.Item`; it isn't on `main`.

- [ ] **Step 5: Changeset**

`.changeset/list.md`:

```md
---
"@oztix/roadie-components": minor
---

Add `List`, the vertical row primitive: a title with optional subtitle, leading
and trailing slots, a drill-in chevron, grouped sections with titles, and
`href` rows that route through `RoadieLinkProvider`.
```

- [ ] **Step 6: Verify, commit, PR**

Verification gate; browser check `/components/list` at 1440×900 and 390×844
(listed under **Navigation**, heading once, examples render). Then:

```bash
git add packages/components/src/components/List packages/components/src/index.tsx \
  packages/components/package.json docs/src/app/components/list \
  docs/src/app/debug/rsc-smoke/page.tsx AGENTS.md .changeset/list.md
git commit -m "feat(components): add List"
git push -u origin feat/list && gh pr create --fill
```

---

## Task 3: Drawer + core `motion-drawer`

**Start only after PR 2 has merged to `main`.**

**Files:** see the PR 3 table.

**Interfaces:**
- Consumes: `List` from PR 2 (test only); `intentVariants` (on `main`).
- Produces: the `Drawer` compound; the core `motion-drawer` utility;
  `surfaceTitleClass` and `type RoadieIntent` from
  `packages/components/src/variants.ts` (the Navigator branch's Dialog and Pane
  consume these after its rebase).

- [ ] **Step 1: Cut and check out**

```bash
git fetch origin
git worktree add ../roadie-pr-drawer -b feat/drawer origin/main
cd ../roadie-pr-drawer && pnpm install
git checkout feat/navigator-component -- \
  packages/components/src/components/Drawer \
  docs/src/app/components/drawer/page.mdx
```

- [ ] **Step 2: Run the tests — they must fail**

Run: `cd packages/components && pnpm vitest run src/components/Drawer`
Expected: FAIL — `DrawerTitle.tsx` imports `surfaceTitleClass` and
`DrawerPopup.tsx` imports `type RoadieIntent` from `../../variants`, neither on
`main`. If the failure is instead "cannot find `../List`", PR 2 hasn't merged —
stop.

- [ ] **Step 3: Partial `variants.ts` hunk**

Add both blocks to `packages/components/src/variants.ts` — not
`fieldSurfaceClass`, which belongs to Input/Textarea/Pane:

```ts
/**
 * The title of a surface that owns a region of the screen — `Dialog`,
 * `Drawer`. Shared so the two can't drift from one another.
 */
export const surfaceTitleClass = 'text-display-ui-4 text-strong'

/**
 * The intent names, as a literal union. Declared for prop shapes that must
 * stay readable to `react-docgen-typescript`, which can't drill into CVA's
 * conditional types.
 */
export type RoadieIntent = keyof typeof intentVariants
```

(`intentVariants` is declared later in the same file; a type reference to it is
fine.)

Run: `cd packages/components && pnpm vitest run src/components/Drawer`
Expected: PASS. The tests assert the `motion-drawer` class string, not compiled
CSS, so the core utility is not yet exercised.

- [ ] **Step 4: Core `motion-drawer`**

Apply only the `motion-drawer` hunk to `packages/core/src/css/motion.css`,
after the `motion-slide` block and before `/* ─── Reduced motion ───`:

```bash
git diff origin/main feat/navigator-component -- packages/core/src/css/motion.css
```

Copy the `/* Drawer surface — … */` comment and the whole
`@utility motion-drawer { … }` block (≈58 lines) verbatim. Skip the
`animate-pop-tap` hunk.

Run: `pnpm --filter @oztix/roadie-core build`
Expected: success; `grep -c "motion-drawer" packages/core/src/css/motion.css`
prints `1` or more.

- [ ] **Step 5: Barrel and subpath**

After the `Dialog` export block in `packages/components/src/index.tsx`:

```ts
export {
  Drawer,
  drawerPopupVariants,
  drawerViewportVariants,
  type DrawerProps,
  type DrawerTriggerProps,
  type DrawerPortalProps,
  type DrawerBackdropProps,
  type DrawerViewportProps,
  type DrawerPopupProps,
  type DrawerSwipeAreaProps,
  type DrawerHandleProps,
  type DrawerTitleProps,
  type DrawerDescriptionProps,
  type DrawerCloseProps,
  type DrawerHeaderProps,
  type DrawerBodyProps,
  type DrawerFooterProps,
  type DrawerContentProps,
  type DrawerSide,
  type DrawerSize
} from './components/Drawer'
```

Run `generate:exports`; confirm `./drawer`.

- [ ] **Step 6: Docs page and a stale comment**

Add `# Drawer` after the imports. The page links to `Pane`, which isn't on
`main`. Replace:

```mdx
`Drawer.Content` publishes `--content-inset`, the same contract [`Pane`](/components/pane) uses.
```

with:

```mdx
`Drawer.Content` publishes `--content-inset`, so its header, body and footer share one horizontal inset — override the variable on `Drawer.Content` to change all three.
```

`grep -n "Pane\|Navigator" docs/src/app/components/drawer/page.mdx` → expect
no matches afterwards.

In `DrawerPopup.tsx`, the comment calling `List` a "self-insetting child" is
wrong (List never reads the variable). Reword it to what is true: the header,
body and footer read `--content-inset`.

Canary: `Drawer` subpath + `Drawer as DrawerViaBarrel` imports and only the
Drawer sections from the branch's `rsc-smoke/page.tsx`.

- [ ] **Step 7: Changeset**

`.changeset/drawer.md`:

```md
---
"@oztix/roadie-components": minor
"@oztix/roadie-core": minor
---

Add `Drawer`, a surface that slides in from any edge and swipes away, built on
Base UI's drawer primitive. Core gains the `motion-drawer` utility, which drives
a drawer's edge transition and tracks Base UI's live swipe offset.
```

- [ ] **Step 8: Verify, commit, PR**

Verification gate. Browser at 390×844 and 1440×900 on `/components/drawer`:
each side opens and closes, a bottom sheet follows a mouse drag and settles,
heading once, listed under **Overlays**. A swipe on a real touch device is a
by-hand check — list it in the PR description if not done.

```bash
git add packages/components/src/components/Drawer packages/components/src/variants.ts \
  packages/core/src/css/motion.css packages/components/src/index.tsx \
  packages/components/package.json docs/src/app/components/drawer \
  docs/src/app/debug/rsc-smoke/page.tsx .changeset/drawer.md
git commit -m "feat(components): add Drawer and the motion-drawer utility"
git push -u origin feat/drawer && gh pr create --fill
```

---

## Task 4: Accordion — `--content-inset` and the Safari resize fix

**Files:** see the PR 4 table.

**Interfaces:**
- Produces: the Accordion root publishes `[--content-inset:--spacing(4)]`
  (16px, identical to the old `px-4`); trigger and content read
  `px-(--content-inset)`. While an item is open in a browser without
  `interpolate-size`, `--content-height` on its `<details>` tracks the content's
  `scrollHeight`. Publishing its own value matters once Accordion sits inside a
  Drawer or Pane, which publish 24px.

- [ ] **Step 1: Cut and check out**

```bash
git worktree add ../roadie-pr-accordion -b fix/accordion-content-inset origin/main
cd ../roadie-pr-accordion && pnpm install
git checkout feat/navigator-component -- \
  packages/components/src/components/Accordion/Accordion.test.tsx \
  packages/components/src/components/Accordion/AccordionContent.tsx \
  packages/components/src/components/Accordion/AccordionTrigger.tsx \
  packages/components/src/components/Accordion/variants.ts
```

`AccordionItem.tsx` is deliberately left at `main`'s version until step 3.

- [ ] **Step 2: Write the Safari test**

In `Accordion.test.tsx`, extend the imports to
`import { act, render } from '@testing-library/react'` and
`import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'`,
then append inside `describe('Accordion', …)`:

```tsx
  describe('without interpolate-size', () => {
    let resize: (() => void) | undefined
    const originalResizeObserver = globalThis.ResizeObserver
    const originalSupports = CSS.supports

    beforeEach(() => {
      CSS.supports = () => false
      globalThis.ResizeObserver = class {
        constructor(callback: () => void) {
          resize = callback
        }
        observe() {}
        unobserve() {}
        disconnect() {}
      } as unknown as typeof ResizeObserver
    })

    afterEach(() => {
      CSS.supports = originalSupports
      globalThis.ResizeObserver = originalResizeObserver
      resize = undefined
      vi.restoreAllMocks()
    })

    const openItem = () =>
      render(
        <Accordion>
          <Accordion.Item open>
            <Accordion.Trigger>Trigger</Accordion.Trigger>
            <Accordion.Content>Content</Accordion.Content>
          </Accordion.Item>
        </Accordion>
      )

    it('keeps --content-height current while an open panel changes size', () => {
      let height = 120
      vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockImplementation(
        () => height
      )
      const { container } = openItem()
      const details = container.querySelector('details')!
      expect(details.style.getPropertyValue('--content-height')).toBe('120px')

      height = 240
      act(() => resize?.())
      expect(details.style.getPropertyValue('--content-height')).toBe('240px')
    })

    it('keeps the last height while closed so it can animate back open', () => {
      let height = 120
      vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockImplementation(
        () => height
      )
      const { container } = openItem()
      const details = container.querySelector('details')!
      details.open = false
      height = 0
      act(() => resize?.())
      expect(details.style.getPropertyValue('--content-height')).toBe('120px')
    })
  })
```

- [ ] **Step 3: Prove it fails, then apply the fix**

Run: `cd packages/components && pnpm vitest run src/components/Accordion`
Expected: the inset test PASSES (variants/trigger/content are the branch's) and
the first Safari test FAILS (`--content-height` is `''` — `main`'s
`AccordionItem` has no observer).

```bash
git checkout feat/navigator-component -- \
  packages/components/src/components/Accordion/AccordionItem.tsx
```

Re-run. Expected: all PASS.

- [ ] **Step 4: Changeset**

`.changeset/accordion-content-inset.md`:

```md
---
"@oztix/roadie-components": minor
---

`Accordion` now publishes `--content-inset` (16px) and both its trigger and
content read it, so content dropped into `Accordion.Content` lines up with the
trigger without extra padding. Override the variable on the root to change both
at once. In Safari, an open panel whose content changes size, such as a filtered
list, now resizes with it instead of clipping.
```

- [ ] **Step 5: Verify, commit, PR**

Verification gate. Browser at 1440×900 on `/components/accordion`: trigger and
content text share one left edge in every emphasis. In Safari (by hand), open an
item, append a paragraph to `Accordion.Content` in devtools, and confirm the
panel grows rather than clips.

```bash
git add packages/components/src/components/Accordion .changeset/accordion-content-inset.md
git commit -m "fix(accordion): publish --content-inset and track open panel height in Safari"
git push -u origin fix/accordion-content-inset && gh pr create --fill
```

---

## Task 5: Tooltip (new component)

### Design

**What it is.** A short, non-interactive label that appears beside a control on
hover or keyboard focus, on `@base-ui/react/tooltip` (1.8.0). Its first
consumer is Navigator's collapsed rail — labels inline-end of each tile, a
shared delay, never on touch, an `aria-hidden` popup — but the component is
general.

**API.**

```tsx
import { Tooltip } from '@oztix/roadie-components/tooltip'

<Tooltip.Provider>                          {/* optional: a delay group */}
  <Tooltip>                                 {/* === Tooltip.Root */}
    <Tooltip.Trigger
      render={<IconButton aria-label='Edit'><PencilSimpleIcon weight='bold' /></IconButton>}
    />
    <Tooltip.Content side='top'>            {/* Portal + Positioner + Popup */}
      <Tooltip.Arrow />
      Edit
    </Tooltip.Content>
  </Tooltip>
</Tooltip.Provider>
```

| Part | Wraps | Roadie behaviour |
| --- | --- | --- |
| `Tooltip` / `.Root` | `Tooltip.Root` | passthrough — `open`, `defaultOpen`, `onOpenChange`, `disabled` |
| `.Provider` | `Tooltip.Provider` | passthrough — `delay`, `closeDelay`, `timeout` (Base UI default 400ms) |
| `.Trigger` | `Tooltip.Trigger` | `data-slot='tooltip-trigger'`; `render` to reuse an existing control; per-trigger `delay` (Base UI default 600ms) |
| `.Portal` | `Tooltip.Portal` | passthrough |
| `.Positioner` | `Tooltip.Positioner` | `z-tooltip` (layer 70 in `layering.css`), `sideOffset` default `6` |
| `.Popup` | `Tooltip.Popup` | `tooltipPopupVariants`, `data-slot='tooltip-popup'`, `emphasis` |
| `.Arrow` | `Tooltip.Arrow` | `Popover.Arrow`'s geometry, filled from the popup's surface |
| `.Content` | Portal + Positioner + Popup | the common case; popup props plus `side`, `align`, `sideOffset` |

**`side`/`align`/`sideOffset` sit directly on `Tooltip.Content`**, not in a
`positionerProps` object as on `Popover.Content`. They are the only positioning
knobs a tooltip needs and Navigator sets `side` on every one;
`Tooltip.Positioner` stays exported for full control.

**Sides.** Base UI supports `'top' | 'bottom' | 'left' | 'right' |
'inline-start' | 'inline-end'`. Default `'top'`. Prefer logical sides beside a
vertical rail so RTL flips.

**Variants.** `emphasis`: `inverted` (default — `emphasis-inverted`, the
high-contrast chip) or `floating` (`emphasis-floating`, Popover's raised
surface, for a tooltip over dark content). No `intent`: a coloured message is a
Popover. No `size`: one size, `text-sm`.

**Delay group.** `Tooltip.Provider` groups every tooltip beneath it: once one
is open, a neighbour opens instantly. Base UI marks that popup with
`data-instant`, and the popup drops its scale-in under `data-[instant]` so the
switch doesn't flicker. Mount one Provider around a toolbar or rail.

**Accessibility.** Base UI 1.8.0's tooltip sets no `aria-describedby` and the
popup has no role. The trigger must carry its own accessible name (an
`aria-label` on an icon-only control, or visible or visually hidden text). The
tooltip repeats it for sighted pointer users. Focus opens it; Escape closes it.
No interactive content, and nothing a user needs that they can't get elsewhere.

**Touch.** Base UI can open a tooltip from a touch long-press. The component
doesn't suppress it; consumers that must never show one on touch (Navigator) add
`className='pointer-coarse:hidden'` to `Tooltip.Content`, and the docs say so.

**Motion.** `motion-scale` from `var(--transform-origin)`, as Popover.

**Interfaces:**
- Produces (the Navigator redesign consumes these): `Tooltip`,
  `Tooltip.Provider`, `Tooltip.Trigger` (accepts `render`), `Tooltip.Content`
  with `side?: TooltipSide`, `align?: 'start' | 'center' | 'end'`,
  `sideOffset?: number`, `emphasis?: TooltipEmphasis`, `className`, and any
  `Tooltip.Popup` prop (Navigator passes `aria-hidden`);
  `type TooltipSide = 'top' | 'bottom' | 'left' | 'right' | 'inline-start' |
  'inline-end'`; `type TooltipEmphasis = 'inverted' | 'floating'`;
  `tooltipPopupVariants`.

- [ ] **Step 1: Cut the branch**

```bash
git worktree add ../roadie-pr-tooltip -b feat/tooltip origin/main
cd ../roadie-pr-tooltip && pnpm install
```

- [ ] **Step 2: Write the failing tests**

`packages/components/src/components/Tooltip/Tooltip.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { Tooltip } from '.'

const positioner = () =>
  document.querySelector('[data-slot="tooltip-positioner"]')
const popup = () => document.querySelector('[data-slot="tooltip-popup"]')

describe('Tooltip', () => {
  it('is the same reference as Tooltip.Root', () => {
    expect(Tooltip).toBe(Tooltip.Root)
  })

  it('renders an inverted chip above its trigger by default', async () => {
    render(
      <Tooltip defaultOpen>
        <Tooltip.Trigger>Save</Tooltip.Trigger>
        <Tooltip.Content>Save changes</Tooltip.Content>
      </Tooltip>
    )
    expect(await screen.findByText('Save changes')).toBe(popup())
    expect(popup()).toHaveClass('emphasis-inverted', 'text-sm', 'motion-scale')
    expect(positioner()).toHaveAttribute('data-side', 'top')
    expect(positioner()).toHaveClass('z-tooltip')
  })

  it('takes side directly on Content', async () => {
    render(
      <Tooltip defaultOpen>
        <Tooltip.Trigger>Home</Tooltip.Trigger>
        <Tooltip.Content side='inline-end'>Home page</Tooltip.Content>
      </Tooltip>
    )
    await screen.findByText('Home page')
    expect(positioner()).toHaveAttribute('data-side', 'inline-end')
  })

  it('offers a floating surface', async () => {
    render(
      <Tooltip defaultOpen>
        <Tooltip.Trigger>Help</Tooltip.Trigger>
        <Tooltip.Content emphasis='floating'>Get help</Tooltip.Content>
      </Tooltip>
    )
    await screen.findByText('Get help')
    expect(popup()).toHaveClass('emphasis-floating')
  })

  it('fills the arrow from the popup surface', async () => {
    render(
      <Tooltip defaultOpen>
        <Tooltip.Trigger>Help</Tooltip.Trigger>
        <Tooltip.Content>
          <Tooltip.Arrow />
          Get help
        </Tooltip.Content>
      </Tooltip>
    )
    await screen.findByText('Get help')
    expect(
      document.querySelector('[data-slot="tooltip-arrow"] svg')
    ).toHaveClass('fill-(--tooltip-surface)')
  })

  it('stays closed until hovered, then opens', async () => {
    const user = userEvent.setup()
    render(
      <Tooltip>
        <Tooltip.Trigger delay={0}>Save</Tooltip.Trigger>
        <Tooltip.Content>Save changes</Tooltip.Content>
      </Tooltip>
    )
    expect(screen.queryByText('Save changes')).not.toBeInTheDocument()
    await user.hover(screen.getByText('Save'))
    expect(await screen.findByText('Save changes')).toBeInTheDocument()
  })

  it('leaves the accessible name to the trigger', async () => {
    render(
      <Tooltip defaultOpen>
        <Tooltip.Trigger aria-label='Edit'>✎</Tooltip.Trigger>
        <Tooltip.Content>Edit</Tooltip.Content>
      </Tooltip>
    )
    const trigger = screen.getByRole('button', { name: 'Edit' })
    expect(trigger).toHaveAttribute('data-slot', 'tooltip-trigger')
    expect(trigger).not.toHaveAttribute('aria-describedby')
  })

  it('groups tooltips under a Provider', () => {
    render(
      <Tooltip.Provider delay={0}>
        <Tooltip>
          <Tooltip.Trigger>One</Tooltip.Trigger>
          <Tooltip.Content>First</Tooltip.Content>
        </Tooltip>
        <Tooltip>
          <Tooltip.Trigger>Two</Tooltip.Trigger>
          <Tooltip.Content>Second</Tooltip.Content>
        </Tooltip>
      </Tooltip.Provider>
    )
    expect(screen.getByRole('button', { name: 'One' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Two' })).toBeInTheDocument()
  })
})
```

Run: `cd packages/components && pnpm vitest run src/components/Tooltip`
Expected: FAIL — `Cannot find module '.'`.

Contingency, decided in advance: if the hover test cannot open under jsdom once
the component exists (Base UI's hover hook leans on pointer events jsdom models
partly), delete that one test, keep the rest, and cover hover in step 9 — say so
in the PR description.

- [ ] **Step 3: Variants**

`packages/components/src/components/Tooltip/variants.ts`:

```ts
import { cva } from 'class-variance-authority'

export type TooltipEmphasis = 'inverted' | 'floating'

export type TooltipSide =
  | 'top'
  | 'bottom'
  | 'left'
  | 'right'
  | 'inline-start'
  | 'inline-end'

// `--tooltip-surface` lets the portaled arrow match whichever surface the
// popup resolved to. `data-[instant]` is Base UI's signal that a grouped
// neighbour opened this one instantly — scaling in again would flicker.
export const tooltipPopupVariants = cva(
  [
    'max-w-[min(18rem,var(--available-width))] origin-[var(--transform-origin)]',
    'rounded-lg px-2.5 py-1.5 text-sm font-medium text-pretty',
    'motion-scale data-[instant]:transition-none'
  ],
  {
    variants: {
      emphasis: {
        inverted:
          'emphasis-inverted [--tooltip-surface:var(--intent-bg-inverted)]',
        floating:
          'emphasis-floating [--tooltip-surface:var(--intent-bg-raised)]'
      }
    },
    defaultVariants: { emphasis: 'inverted' }
  }
)
```

- [ ] **Step 4: Leaves**

`TooltipProvider.tsx`:

```tsx
'use client'

import { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip'

export const TooltipProvider = TooltipPrimitive.Provider
export type TooltipProviderProps = TooltipPrimitive.Provider.Props
```

`TooltipRoot.tsx`:

```tsx
'use client'

import { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip'

export type TooltipRootProps = TooltipPrimitive.Root.Props

export function TooltipRoot(props: TooltipRootProps) {
  return <TooltipPrimitive.Root {...props} />
}

TooltipRoot.displayName = 'Tooltip.Root'
```

`TooltipTrigger.tsx`:

```tsx
'use client'

import type { RefAttributes } from 'react'

import { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip'

export type TooltipTriggerProps = TooltipPrimitive.Trigger.Props &
  RefAttributes<HTMLButtonElement>

export function TooltipTrigger(props: TooltipTriggerProps) {
  return <TooltipPrimitive.Trigger data-slot='tooltip-trigger' {...props} />
}

TooltipTrigger.displayName = 'Tooltip.Trigger'
```

`TooltipPortal.tsx`:

```tsx
'use client'

import { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip'

export const TooltipPortal = TooltipPrimitive.Portal
export type TooltipPortalProps = TooltipPrimitive.Portal.Props
```

`TooltipPositioner.tsx`:

```tsx
'use client'

import type { RefAttributes } from 'react'

import { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip'

import { cn } from '@oztix/roadie-core/utils'

export type TooltipPositionerProps = TooltipPrimitive.Positioner.Props &
  RefAttributes<HTMLDivElement>

export function TooltipPositioner({
  className,
  sideOffset = 6,
  ...props
}: TooltipPositionerProps) {
  return (
    <TooltipPrimitive.Positioner
      data-slot='tooltip-positioner'
      className={cn('z-tooltip', className)}
      sideOffset={sideOffset}
      {...props}
    />
  )
}

TooltipPositioner.displayName = 'Tooltip.Positioner'
```

`TooltipPopup.tsx`:

```tsx
'use client'

import type { RefAttributes } from 'react'

import { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip'

import { cn } from '@oztix/roadie-core/utils'

import { type TooltipEmphasis, tooltipPopupVariants } from './variants'

export type TooltipPopupProps = TooltipPrimitive.Popup.Props &
  RefAttributes<HTMLDivElement> & {
    /**
     * `inverted` is the high-contrast chip; `floating` matches Popover's
     * raised surface for a tooltip over dark content.
     *
     * @default 'inverted'
     */
    emphasis?: TooltipEmphasis
  }

export function TooltipPopup({
  className,
  emphasis,
  ...props
}: TooltipPopupProps) {
  return (
    <TooltipPrimitive.Popup
      data-slot='tooltip-popup'
      className={cn(tooltipPopupVariants({ emphasis }), className)}
      {...props}
    />
  )
}

TooltipPopup.displayName = 'Tooltip.Popup'
```

`TooltipArrow.tsx` — `Popover/PopoverArrow.tsx`'s geometry (read its comment
for the offsets), smaller, closed path, no rim stroke (the inverted chip has no
rim):

```tsx
'use client'

import type { RefAttributes } from 'react'

import { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip'

import { cn } from '@oztix/roadie-core/utils'

export type TooltipArrowProps = TooltipPrimitive.Arrow.Props &
  RefAttributes<HTMLDivElement>

export function TooltipArrow({ className, ...props }: TooltipArrowProps) {
  return (
    <TooltipPrimitive.Arrow
      data-slot='tooltip-arrow'
      className={cn(
        'z-10 flex [--arrow-h:0.375rem] [--arrow-w:0.75rem]',
        'data-[side=bottom]:top-[calc(1px-var(--arrow-h))] data-[side=bottom]:rotate-0',
        'data-[side=top]:bottom-[calc(1px-var(--arrow-h))] data-[side=top]:rotate-180',
        'data-[side=left]:right-[calc(1px-(var(--arrow-w)+var(--arrow-h))/2)] data-[side=left]:rotate-90',
        'data-[side=right]:left-[calc(1px-(var(--arrow-w)+var(--arrow-h))/2)] data-[side=right]:-rotate-90',
        'data-[side=inline-start]:right-[calc(1px-(var(--arrow-w)+var(--arrow-h))/2)] data-[side=inline-start]:rotate-90',
        'data-[side=inline-end]:left-[calc(1px-(var(--arrow-w)+var(--arrow-h))/2)] data-[side=inline-end]:-rotate-90',
        className
      )}
      {...props}
    >
      <svg
        aria-hidden='true'
        viewBox='0 0 20 10'
        className='h-(--arrow-h) w-(--arrow-w) fill-(--tooltip-surface)'
      >
        <path d='M0 10 L10 0 L20 10 Z' />
      </svg>
    </TooltipPrimitive.Arrow>
  )
}

TooltipArrow.displayName = 'Tooltip.Arrow'
```

The `inline-*` rules assume LTR; step 9 checks placement, and an RTL mirror is
out of scope until a consumer needs it.

`TooltipContent.tsx`:

```tsx
'use client'

import { TooltipPopup, type TooltipPopupProps } from './TooltipPopup'
import { TooltipPortal } from './TooltipPortal'
import { TooltipPositioner } from './TooltipPositioner'
import type { TooltipSide } from './variants'

export type TooltipContentProps = TooltipPopupProps & {
  /** @default 'top' */
  side?: TooltipSide
  /** @default 'center' */
  align?: 'start' | 'center' | 'end'
  /** Gap between trigger and tooltip, in px. @default 6 */
  sideOffset?: number
}

export function TooltipContent({
  side,
  align,
  sideOffset,
  children,
  ...props
}: TooltipContentProps) {
  return (
    <TooltipPortal>
      <TooltipPositioner side={side} align={align} sideOffset={sideOffset}>
        <TooltipPopup {...props}>{children}</TooltipPopup>
      </TooltipPositioner>
    </TooltipPortal>
  )
}

TooltipContent.displayName = 'Tooltip.Content'
```

- [ ] **Step 5: `index.tsx` — server-safe, no `'use client'`**

```tsx
import { TooltipArrow } from './TooltipArrow'
import { TooltipContent } from './TooltipContent'
import { TooltipPopup } from './TooltipPopup'
import { TooltipPortal } from './TooltipPortal'
import { TooltipPositioner } from './TooltipPositioner'
import { TooltipProvider } from './TooltipProvider'
import { TooltipRoot } from './TooltipRoot'
import { TooltipTrigger } from './TooltipTrigger'

const Tooltip = TooltipRoot as typeof TooltipRoot & {
  Root: typeof TooltipRoot
  Provider: typeof TooltipProvider
  Trigger: typeof TooltipTrigger
  Portal: typeof TooltipPortal
  Positioner: typeof TooltipPositioner
  Popup: typeof TooltipPopup
  Arrow: typeof TooltipArrow
  Content: typeof TooltipContent
}

Tooltip.Root = TooltipRoot
Tooltip.Provider = TooltipProvider
Tooltip.Trigger = TooltipTrigger
Tooltip.Portal = TooltipPortal
Tooltip.Positioner = TooltipPositioner
Tooltip.Popup = TooltipPopup
Tooltip.Arrow = TooltipArrow
Tooltip.Content = TooltipContent

export { Tooltip }
export type { TooltipRootProps as TooltipProps } from './TooltipRoot'
export type { TooltipProviderProps } from './TooltipProvider'
export type { TooltipTriggerProps } from './TooltipTrigger'
export type { TooltipPortalProps } from './TooltipPortal'
export type { TooltipPositionerProps } from './TooltipPositioner'
export type { TooltipPopupProps } from './TooltipPopup'
export type { TooltipArrowProps } from './TooltipArrow'
export type { TooltipContentProps } from './TooltipContent'
export {
  tooltipPopupVariants,
  type TooltipEmphasis,
  type TooltipSide
} from './variants'
```

- [ ] **Step 6: Run the tests**

Run: `cd packages/components && pnpm vitest run src/components/Tooltip`
Expected: PASS. Then
`pnpm vitest run src/components/Tooltip 2>&1 | grep -c "not wrapped in act"`
Expected: `0`. Fix any warning (await a `findBy…`, or wrap in `act`) rather than
accept it.

- [ ] **Step 7: Barrel, subpath, canary**

After the `Popover` export block in `packages/components/src/index.tsx`:

```ts
export {
  Tooltip,
  tooltipPopupVariants,
  type TooltipProps,
  type TooltipProviderProps,
  type TooltipTriggerProps,
  type TooltipPortalProps,
  type TooltipPositionerProps,
  type TooltipPopupProps,
  type TooltipArrowProps,
  type TooltipContentProps,
  type TooltipEmphasis,
  type TooltipSide
} from './components/Tooltip'
```

`generate:exports` → confirm `./tooltip`.

In `docs/src/app/debug/rsc-smoke/page.tsx` (a server component), add
`import { Tooltip } from '@oztix/roadie-components/tooltip'`,
`Tooltip as TooltipViaBarrel` in the barrel import, and two sections mirroring
the page's Popover pair:

```tsx
      <section className='grid gap-4'>
        <h2 className='text-display-ui-3 text-strong'>
          Tooltip — bare root (canonical)
        </h2>
        <Tooltip>
          <Tooltip.Trigger>Hover for a label</Tooltip.Trigger>
          <Tooltip.Content>
            <Tooltip.Arrow />A label
          </Tooltip.Content>
        </Tooltip>
      </section>
      <section className='grid gap-4'>
        <h2 className='text-display-ui-3 text-strong'>Tooltip — barrel</h2>
        <TooltipViaBarrel>
          <TooltipViaBarrel.Trigger>Hover for a label</TooltipViaBarrel.Trigger>
          <TooltipViaBarrel.Content>A label</TooltipViaBarrel.Content>
        </TooltipViaBarrel>
      </section>
```

- [ ] **Step 8: Docs page**

Create `docs/src/app/components/tooltip/page.mdx` (per
`docs/contributing/COMPONENT_DOC_TEMPLATE.md`). Before writing the Guidelines
block, read `docs/src/components/Guideline.tsx` on `main` and match its prop
names exactly.

````mdx
export const metadata = {
  title: 'Tooltip',
  description: 'A short label that appears beside a control on hover or focus',
  status: 'beta',
  category: 'Overlays',
}

import { PropsDefinitions } from '@/components/PropsDefinitions'
import { Guideline } from '@/components/Guideline'

# Tooltip

A short label that appears beside a control on hover or keyboard focus, built on Base UI's tooltip primitive.

## Import

```tsx
import { Tooltip } from '@oztix/roadie-components/tooltip'
```

## Examples

### Default

Pass the control to `Tooltip.Trigger` with `render`. The control keeps its own accessible name — here the icon button's `aria-label` — and the tooltip repeats it for pointer users.

```tsx-live
<Tooltip>
  <Tooltip.Trigger render={<IconButton aria-label='Edit'><PencilSimple weight='bold' className='size-4' /></IconButton>} />
  <Tooltip.Content>
    <Tooltip.Arrow />
    Edit
  </Tooltip.Content>
</Tooltip>
```

### Side

`side` places the tooltip. Beside a vertical toolbar, prefer `inline-start` and `inline-end` so the placement follows the reading direction.

```tsx-live
<div className='flex flex-wrap gap-3'>
  {['top', 'bottom', 'inline-start', 'inline-end'].map((side) => (
    <Tooltip key={side}>
      <Tooltip.Trigger render={<Button>{side}</Button>} />
      <Tooltip.Content side={side}>
        <Tooltip.Arrow />
        Placed {side}
      </Tooltip.Content>
    </Tooltip>
  ))}
</div>
```

### Emphasis

`inverted` is the default high-contrast chip. Use `floating` over dark or busy content, where a dark chip would disappear.

```tsx-live
<div className='flex flex-wrap gap-3'>
  <Tooltip>
    <Tooltip.Trigger render={<Button>Inverted</Button>} />
    <Tooltip.Content>Inverted</Tooltip.Content>
  </Tooltip>
  <Tooltip>
    <Tooltip.Trigger render={<Button>Floating</Button>} />
    <Tooltip.Content emphasis='floating'>Floating</Tooltip.Content>
  </Tooltip>
</div>
```

### Delay group

Wrap related controls in `Tooltip.Provider`. The first tooltip waits for the delay; moving to a neighbour while one is open shows it straight away.

```tsx-live
<Tooltip.Provider>
  <div className='flex gap-2'>
    {[
      ['Edit', <PencilSimple weight='bold' className='size-4' />],
      ['Favourite', <Heart weight='bold' className='size-4' />],
      ['Settings', <Gear weight='bold' className='size-4' />],
      ['Delete', <Trash weight='bold' className='size-4' />]
    ].map(([label, icon]) => (
      <Tooltip key={label}>
        <Tooltip.Trigger render={<IconButton aria-label={label}>{icon}</IconButton>} />
        <Tooltip.Content>{label}</Tooltip.Content>
      </Tooltip>
    ))}
  </div>
</Tooltip.Provider>
```

## Guidelines

<Guideline>
  <Guideline.Do
    title='Label icon-only controls'
    description='Give the control its own accessible name and let the tooltip repeat it.'
    code={`<Tooltip.Trigger render={<IconButton aria-label='Edit'>…</IconButton>} />`}
  />
  <Guideline.Dont
    title="Don't put actions or essential detail in a tooltip"
    description="It can't be reached on touch and closes when the pointer leaves. Use a Popover."
    code={`<Tooltip.Content><Button>Undo</Button></Tooltip.Content>`}
  />
</Guideline>

<Guideline>
  <Guideline.Do
    title='Keep it to a few words'
    description='A tooltip names or briefly clarifies. Sentence case, no full stop.'
  />
  <Guideline.Dont
    title="Don't rely on it on touch screens"
    description="Touch has no hover. Add className='pointer-coarse:hidden' to Tooltip.Content where a long-press tooltip would get in the way."
  />
</Guideline>

## Accessibility

- The tooltip isn't announced. The trigger carries its own name — an `aria-label` on an icon-only control, or visible or visually hidden text.
- Keyboard focus opens the tooltip; Escape closes it.
- Hover and focus only. Don't use a tooltip for anything a keyboard, screen reader or touch user needs.

<PropsDefinitions componentPath='packages/components/src/components/Tooltip' />
````

- [ ] **Step 9: Browser verification**

`pnpm --filter @oztix/roadie-core build && pnpm --filter @oztix/roadie-components build`,
then `pnpm --filter docs exec next dev --port 9701`. At 1440×900 on
`/components/tooltip`:

1. Hover the Default icon button: after ~600ms the chip appears above it, arrow
   pointing at the trigger.
2. Tab to it: the tooltip opens on focus; Escape closes it.
3. Side: each button places its tooltip on the named side; the arrow points at
   the trigger for `inline-start` and `inline-end`.
4. Delay group: hover Edit, wait for its tooltip, slide to Favourite — its
   tooltip appears with no delay and no scale-in.
5. Dark mode: the inverted chip stays legible; `floating` shows a raised
   surface.
6. Props table lists `Tooltip`, `Tooltip.Trigger`, `Tooltip.Content` (with
   `side`, `align`, `sideOffset`, `emphasis`). A duplicate `Tooltip.Root`
   section is expected only if PR 1 hasn't merged yet.
7. `/debug/rsc-smoke` renders both Tooltip sections.

- [ ] **Step 10: Changeset, commit, PR**

`.changeset/tooltip.md`:

```md
---
"@oztix/roadie-components": minor
---

Add `Tooltip`, a short label that appears beside a control on hover or keyboard
focus, built on Base UI's tooltip primitive. `Tooltip.Content` takes `side`,
`align` and `sideOffset` directly, `emphasis` switches between the inverted chip
and a floating surface, and `Tooltip.Provider` groups tooltips so moving between
neighbours is instant.
```

Verification gate, then:

```bash
git add packages/components/src/components/Tooltip packages/components/src/index.tsx \
  packages/components/package.json docs/src/app/components/tooltip \
  docs/src/app/debug/rsc-smoke/page.tsx .changeset/tooltip.md
git commit -m "feat(components): add Tooltip"
git push -u origin feat/tooltip && gh pr create --fill
```

---

## Task 6: Badge `hideLabel`

### Design

`hideLabel` shrinks the badge to its dot. The label is visually hidden but stays
in the accessibility tree: `<Badge hideLabel intent='danger'
emphasis='strong'>3 unread</Badge>` is seen as a red dot and read as
"3 unread".

- **Implies `indicator`.** In `hideLabel` mode the badge's own box *is* the dot,
  so there's no inner indicator span and passing `indicator` changes nothing.
- **Emphasis sets the dot's look**, because the emphasis utility paints the
  root: `strong` a solid intent dot, `subtle` a tinted dot, `normal` a
  normal-surface dot with its border, `subtler` a barely tinted one. Intent
  still picks the palette.
- **`indicatorPulse` still applies** — `animate-pulse` moves to the root.
- **Size:** `sm` → `size-2` (8px), `md` → `size-2.5` (10px); padding and gap
  drop to zero so the box is exactly the dot.
- **No position prop.** Placement is the container's job; Navigator puts the
  dot in a tile's top-end corner.

**Interfaces:**
- Produces: `BadgeProps.hideLabel?: boolean`. The Navigator redesign clones a
  consumer's `badge` element with `{ hideLabel: true, className }`, so the prop
  must survive `cloneElement` and merge with an existing `className`.

- [ ] **Step 1: Cut the branch**

```bash
git worktree add ../roadie-pr-badge -b feat/badge-hide-label origin/main
cd ../roadie-pr-badge && pnpm install
```

- [ ] **Step 2: Write the failing tests**

Append to `packages/components/src/components/Badge/Badge.test.tsx`:

```tsx
describe('Badge hideLabel', () => {
  const badgeIn = (container: HTMLElement) =>
    container.querySelector('[data-slot="badge"]')!

  it('keeps the label for assistive tech but hides it visually', () => {
    const { getByText } = render(
      <Badge hideLabel intent='danger' emphasis='strong'>
        3 unread
      </Badge>
    )
    const label = getByText('3 unread')
    expect(label).toHaveClass('sr-only')
    expect(label.parentElement).toHaveAttribute('data-slot', 'badge')
  })

  it('shrinks the badge to a dot painted by its emphasis', () => {
    const { container } = render(
      <Badge hideLabel intent='danger' emphasis='strong'>
        3 unread
      </Badge>
    )
    expect(badgeIn(container)).toHaveClass(
      'size-2.5',
      'p-0',
      'emphasis-strong',
      'intent-danger'
    )
    expect(badgeIn(container)).not.toHaveClass('px-2.5')
  })

  it('sizes the dot from size', () => {
    const { container } = render(
      <Badge hideLabel size='sm'>
        New
      </Badge>
    )
    expect(badgeIn(container)).toHaveClass('size-2')
  })

  it('is the dot itself, so it renders no separate indicator', () => {
    const { container } = render(
      <Badge hideLabel indicator>
        Live
      </Badge>
    )
    expect(badgeIn(container).querySelector('[aria-hidden="true"]')).toBeNull()
  })

  it('pulses the dot when indicatorPulse is set', () => {
    const { container } = render(
      <Badge hideLabel indicatorPulse intent='success'>
        Live
      </Badge>
    )
    expect(badgeIn(container)).toHaveClass('animate-pulse')
  })

  it('merges a className a container adds for placement', () => {
    const { container } = render(
      <Badge hideLabel className='absolute end-1 top-1'>
        3 unread
      </Badge>
    )
    expect(badgeIn(container)).toHaveClass(
      'absolute',
      'end-1',
      'top-1',
      'size-2.5'
    )
  })

  it('leaves the default badge unchanged', () => {
    const { getByText } = render(<Badge>New</Badge>)
    expect(getByText('New')).toHaveClass('px-2.5')
    expect(getByText('New')).not.toHaveClass('sr-only')
  })
})
```

Run: `cd packages/components && pnpm vitest run src/components/Badge`
Expected: the new suite FAILS (no `sr-only`, no `size-2.5`), and `pnpm
typecheck` flags `hideLabel` as unknown.

- [ ] **Step 3: Implement**

Replace `packages/components/src/components/Badge/index.tsx`:

```tsx
import type { ComponentProps } from 'react'

import { type VariantProps, cva } from 'class-variance-authority'

import { cn } from '@oztix/roadie-core/utils'

import { intentVariants } from '../../variants'

export const badgeVariants = cva(
  'inline-flex items-center justify-center rounded-full font-semibold whitespace-nowrap gap-1 [&_svg]:size-[1em] [&_svg]:shrink-0',
  {
    variants: {
      intent: intentVariants,
      emphasis: {
        strong: 'emphasis-strong',
        normal: 'emphasis-normal text-subtle',
        subtle: 'emphasis-subtle text-subtle',
        subtler: 'emphasis-subtler text-subtle'
      },
      size: {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-2.5 py-0.5 text-sm'
      },
      // After `size`, so `p-0` wins the merge against its padding.
      hideLabel: {
        true: 'shrink-0 gap-0 p-0',
        false: ''
      }
    },
    compoundVariants: [
      { hideLabel: true, size: 'sm', class: 'size-2' },
      { hideLabel: true, size: 'md', class: 'size-2.5' }
    ],
    defaultVariants: {
      emphasis: 'normal',
      size: 'md',
      hideLabel: false
    }
  }
)

export interface BadgeProps
  extends ComponentProps<'span'>,
    Omit<VariantProps<typeof badgeVariants>, 'hideLabel'> {
  /** Show a dot indicator before the text */
  indicator?: boolean
  /** Animate the indicator with a slow pulse */
  indicatorPulse?: boolean
  /**
   * Shrink to the dot. The label is visually hidden but still announced, so
   * write the full meaning ("3 unread"), not just a number. Implies
   * `indicator`; `emphasis` sets the dot's look.
   */
  hideLabel?: boolean
}

export function Badge({
  className,
  intent,
  emphasis,
  size,
  indicator,
  indicatorPulse,
  hideLabel = false,
  children,
  ...props
}: BadgeProps) {
  if (hideLabel) {
    return (
      <span
        data-slot='badge'
        className={cn(
          badgeVariants({ intent, emphasis, size, hideLabel: true }),
          indicatorPulse && 'animate-pulse',
          className
        )}
        {...props}
      >
        <span className='sr-only'>{children}</span>
      </span>
    )
  }

  return (
    <span
      data-slot='badge'
      className={cn(badgeVariants({ intent, emphasis, size, className }))}
      {...props}
    >
      {indicator && (
        <span
          className={cn(
            'size-1.5 shrink-0 rounded-full bg-current',
            indicatorPulse && 'animate-pulse'
          )}
          aria-hidden='true'
        />
      )}
      {children}
    </span>
  )
}

Badge.displayName = 'Badge'
```

The `Omit<…, 'hideLabel'>` keeps CVA's `boolean | null` off the public prop so
react-docgen shows a plain `boolean`.

- [ ] **Step 4: Run the tests**

Run: `cd packages/components && pnpm vitest run src/components/Badge`
Expected: PASS, including the original seven tests. `pnpm typecheck` clean.

- [ ] **Step 5: Docs**

In `docs/src/app/components/badge/page.mdx`, after the "With indicator"
section:

````mdx
### Hidden label

`hideLabel` shrinks the badge to its dot. The label is hidden visually but still announced, so write the full meaning — "3 unread", not "3". Emphasis sets the dot's look, and `indicatorPulse` still pulses it. Position the dot from its container; the badge has no placement prop.

```tsx-live
<div className='flex flex-wrap items-center gap-6'>
  <Badge hideLabel intent='danger' emphasis='strong'>3 unread</Badge>
  <Badge hideLabel intent='success' emphasis='strong' indicatorPulse>Live</Badge>
  <Badge hideLabel intent='accent' emphasis='subtle'>New</Badge>
  <Badge hideLabel size='sm' emphasis='normal'>Draft</Badge>
  <span className='relative inline-grid'>
    <IconButton aria-label='Notifications'>
      <BellRinging weight='bold' className='size-5' />
    </IconButton>
    <Badge hideLabel intent='danger' emphasis='strong' className='absolute end-1 top-1'>
      3 unread
    </Badge>
  </span>
</div>
```
````

Confirm the alias `BellRinging` exists in `CodePreview`'s `scope` (it imports
`BellRingingIcon`); if the alias differs, use the declared one.

- [ ] **Step 6: Browser verification**

At 1440×900 on `/components/badge`: the Hidden label row shows a solid red dot,
a pulsing solid green dot, a tinted accent dot, a small neutral dot with border,
and a red dot in the icon button's top-end corner. Dark mode keeps the strong
dots solid. With VoiceOver (by hand) the corner badge reads "3 unread".

- [ ] **Step 7: Changeset, commit, PR**

`.changeset/badge-hide-label.md`:

```md
---
"@oztix/roadie-components": minor
---

`Badge` gains `hideLabel`: the badge shrinks to its dot and its label is
visually hidden but still announced. It implies `indicator`, emphasis sets the
dot's look, and `indicatorPulse` still pulses it.
```

Verification gate, then:

```bash
git add packages/components/src/components/Badge docs/src/app/components/badge \
  .changeset/badge-hide-label.md
git commit -m "feat(badge): add hideLabel to shrink a badge to its dot"
git push -u origin feat/badge-hide-label && gh pr create --fill
```

---

## After all six merge

Hand off to `docs/plans/2026-09-12-navigator-redesign-plan.md` Task 0, which
rebases `feat/navigator-component` onto `main`, resolves the extracted files in
`main`'s favour, strips the `# Title` headings the branch's layout doesn't want,
and rewrites the branch's two changesets.

```bash
git worktree remove ../roadie-pr-scroll-area
git worktree remove ../roadie-pr-list
git worktree remove ../roadie-pr-drawer
git worktree remove ../roadie-pr-accordion
git worktree remove ../roadie-pr-tooltip
git worktree remove ../roadie-pr-badge
```

## Decisions recorded

- **No safelist entry for `motion-drawer`** — consumers get raw `@utility`
  source; `main` has no `motion-*` safelist precedent.
- **PropsDefinitions' duplicate-root fix rides with PR 1**, the first PR to add
  a `displayName = 'X.Root'` root.
- **Dialog's `surfaceTitleClass` refactor stays on the Navigator branch.** PR 3
  adds the constant; Dialog adopts it with the rebase.
- **Accordion gets a new Safari test** — the branch fix has none.
- **Tooltip's `side`/`align`/`sideOffset` are direct props on
  `Tooltip.Content`** (Popover uses `positionerProps`). No `intent`, no `size`.
- **Tooltip does not suppress touch**; `pointer-coarse:hidden` is the
  documented opt-out, which Navigator uses.
- **Badge `hideLabel` makes the root the dot** (no inner indicator span), so
  emphasis paints it directly; `sm` 8px, `md` 10px.
