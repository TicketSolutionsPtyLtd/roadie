---
title: 'feat: Add Tabs component'
type: feat
status: active
date: 2026-04-27
---

# feat: Add Tabs component

## Overview

Add a `Tabs` compound to `@oztix/roadie-components` wrapping
`@base-ui/react/tabs`. Per-file leaves + server-safe `index.tsx` (RSC-safe).
Four `emphasis` presets share a single animated `<Tabs.Indicator>` whose
geometry is driven by Base UI's `--active-tab-*` CSS variables; honours
`prefers-reduced-motion`. `emphasis='normal'` reproduces the segmented-control
feel of the `SegmentedTabs.tsx` prototype.

**Visual reference:** `/Users/lukebrooker/Code/prototype/src/components/SegmentedTabs.tsx`
(the prototype's utility names — `surface-emphasis-*`, `text-emphasis-*`,
`focus-ring` — are stale; remap to current Roadie utilities).

## Requirements

- R1. Wrap Base UI Tabs (`Root`, `List`, `Tab`, `Indicator`, `Panel`) using
  Roadie's per-file-leaves + server-safe `index.tsx` shape.
- R2. Expose `intent` / `emphasis` / `size` on `Tabs.Root` via CVA.
- R3. `emphasis='normal'` reproduces the segmented-control feel of the
  prototype.
- R4. Animation driven by Base UI's `--active-tab-*` CSS variables (not
  user-land `ResizeObserver`); honour `prefers-reduced-motion`.
- R5. RSC-safe end-to-end via the new `@oztix/roadie-components/tabs`
  subpath and the root barrel.
- R6. Docs page at `docs/src/app/components/tabs/page.mdx` + RSC canary
  section in `docs/src/app/debug/rsc-smoke/page.tsx`.
- R7. Keyboard nav, ARIA, and focus management come from Base UI; Roadie
  owns visible focus styles, contrast, and `prefers-reduced-motion`.

## Scope Boundaries

- No new design tokens — compose existing utilities (`emphasis-*`,
  `is-interactive`, `rounded-full`, `shadow-*`, `rim-light-*`).
- No `Tabs.TabIcon` slot in v1. Icon weight switching is documented as a
  Base UI `render`-prop recipe.
- No imperative API (no exposed hook). Active-tab state lives on
  `Tabs.Root` via Base UI's controlled / uncontrolled props.
- No animated panel transitions in v1. Documented as a recipe.

### Deferred to Separate Tasks

- Promoting the prototype consumer (`SegmentedTabs.tsx`) to use
  `@oztix/roadie-components/tabs` — separate PR in the consuming repo.

## Context & Research

**Reference compounds:**

- `packages/components/src/components/Fieldset/` — small compound (per-file
  leaves + server-safe index). Closest analogue.
- `packages/components/src/components/Carousel/` — larger animated compound.
- `packages/components/src/components/Select/` and `Combobox/` — Base UI
  wrapper precedents (data-attribute styling, `'use client'` placement).

**Solutions docs to follow:**

- `docs/solutions/rsc-patterns/compound-export-namespace.md` — why
  `index.tsx` must stay server-safe (no `'use client'`) under tsdown
  `unbundle: true`.
- `docs/solutions/build-errors/react-docgen-cva-literal-props.md` — inline
  literal unions on public props (not `VariantProps<...>['key']`); export
  sibling type aliases.
- `docs/solutions/build-errors/cross-bundler-dev-env-check.md` — gate any
  dev-only warnings on `process.env.NODE_ENV` with a `typeof process`
  guard, not `import.meta.env.DEV`.
- `docs/solutions/build-errors/stale-tsbuildinfo-masks-local-errors.md` —
  delete `*.tsbuildinfo` and re-run `pnpm typecheck` if CI-only errors
  appear.

**External:** Base UI Tabs ([API](https://base-ui.com/react/components/tabs)),
[styling / data-attrs](https://base-ui.com/react/overview/styling),
[composition / render prop](https://base-ui.com/react/overview/composition).
Verified locally: `node_modules/.../tabs/indicator/TabsIndicatorCssVars.js`
exposes `--active-tab-{left,right,top,bottom,width,height}`.

## Key Technical Decisions

**Compound idiom: Roadie context + Base UI's internal state.** Active-tab
state stays in Base UI's own context. Roadie adds a small `TabsContext`
carrying `{ emphasis, size }` so every leaf can read the variant axis from
`Tabs.Root` without consumers re-passing the prop. Intent cascades via the
`intent-*` CSS class — no JS context needed.

**Emphasis ladder:**

| Emphasis  | List                                       | Indicator                                | Active text     |
| --------- | ------------------------------------------ | ---------------------------------------- | --------------- |
| `strong`  | tinted track (`emphasis-subtle`), pill p-1 | full-rect rounded-full `emphasis-strong` | `text-inverted` |
| `normal`  | tinted track (`emphasis-subtle`), pill p-1 | full-rect rounded-full `emphasis-raised` | `text-strong`   |
| `subtle`  | no track, pill p-1                         | full-rect rounded-full `emphasis-subtle` | `text-strong`   |
| `subtler` | flat `border-b` (left-edge in vertical)    | 2px sliding bar (left-edge in vertical)  | `text-strong`   |

**Animation: Base UI CSS variables, not JS.** `Tabs.Indicator` reads
`--active-tab-{left,top,width,height}` set by Base UI on the indicator
element itself. Transition is `transition-all duration-300 ease-out`,
gated by `motion-reduce:transition-none`. SSR-safe via
`renderBeforeHydration={true}` (Roadie default; Base UI's is `false`).

**Sizes:** `sm` (h-8 px-3), `md` (h-10 px-4 — default), `lg` (h-12 px-5).

**Direction: `direction='horizontal' | 'vertical'`** as the Roadie public
prop name (matches `Carousel.Root`'s `direction`). Internally translates
to Base UI's `orientation`. Vertical mode left-aligns tab content; the
`subtler` underline + list border swap onto the left edge so the static
track stays aligned with the sliding bar. Pill emphases keep their
full-rect shape in vertical mode.

**Icon active-state styling:** Base UI `render`-prop recipe in user-land
(`render={(props, state) => <button {...props}><Icon weight={state.active ? 'fill' : 'bold'} /></button>}`).
No internal `Tabs.TabIcon` leaf in v1.

**Naming:**

- Folder: `packages/components/src/components/Tabs/` (PascalCase).
- Subpath: `@oztix/roadie-components/tabs` (kebab-case, generated).
- `data-slot` values: `tabs`, `tabs-list`, `tabs-tab`, `tabs-indicator`,
  `tabs-panel`.

## Output Structure

    packages/components/src/components/Tabs/
      TabsRoot.tsx          # 'use client' — wraps TabsPrimitive.Root, applies CVA + intent class
      TabsList.tsx          # 'use client' — wraps TabsPrimitive.List, owns track styling
      TabsTab.tsx           # 'use client' — wraps TabsPrimitive.Tab, owns per-tab styling
      TabsIndicator.tsx     # 'use client' — wraps TabsPrimitive.Indicator, owns highlight styling
      TabsPanel.tsx         # 'use client' — wraps TabsPrimitive.Panel
      TabsContext.ts        # 'use client' — { emphasis, size } cascade
      variants.ts           # CVA maps + literal-union type aliases
      index.tsx             # server-safe property-assignment layer (NO 'use client')
      Tabs.test.tsx         # vitest + RTL behavioural tests

    docs/src/app/components/tabs/
      page.mdx              # docs page (Default → Emphasis → Sizes → Intents → States → Composition → Guidelines → Accessibility → PropsDefinitions)

    docs/src/app/debug/rsc-smoke/
      page.tsx              # add Tabs sections (subpath, .Root alias, barrel)

## High-Level Technical Design

> _Directional guidance for review, not implementation specification._

```
<Tabs intent='accent' emphasis='normal' direction='horizontal' defaultValue='overview'>
  <Tabs.List>
    <Tabs.Tab value='overview'>Overview</Tabs.Tab>
    <Tabs.Tab value='details'>Details</Tabs.Tab>
    <Tabs.Indicator />     {/* sibling of Tabs */}
  </Tabs.List>
  <Tabs.Panel value='overview'>...</Tabs.Panel>
  <Tabs.Panel value='details'>...</Tabs.Panel>
</Tabs>
```

```
Tabs.Root (Base UI: tracks active value + active tab geometry; emits orientation=direction)
  └── Tabs.List (positioned: relative — anchors the absolute Indicator)
        ├── Tabs.Tab × N (interactive buttons; emit data-active)
        └── Tabs.Indicator
              ├── reads:  --active-tab-{left,top,width,height} (set by Base UI)
              └── styles: position absolute; transition-all 300ms ease-out;
                          motion-reduce disables the transition
```

## Implementation Units

- [ ] **Unit 1 — Add Tabs compound**

  **Goal:** Compound files end-to-end (variants, leaves, context, index).

  **Requirements:** R1, R2, R3, R4, R5, R7. **Dependencies:** none.

  **Files to create:**
  - `packages/components/src/components/Tabs/{TabsRoot,TabsList,TabsTab,TabsIndicator,TabsPanel}.tsx`
  - `packages/components/src/components/Tabs/{TabsContext,variants}.ts`
  - `packages/components/src/components/Tabs/index.tsx`

  **Approach highlights:**
  - Each leaf wraps the Base UI part (`import { Tabs as TabsPrimitive } from '@base-ui/react/tabs'`).
  - `TabsRootProps = Omit<TabsPrimitive.Root.Props, 'orientation'> & RefAttributes<HTMLDivElement> & { intent?, emphasis?, size?, direction? }` — inline literal unions on the prop shape; export sibling type aliases.
  - `TabsRoot` applies the `intent-*` class directly (no near-empty CVA wrapper) and sets `orientation={direction}` on `TabsPrimitive.Root`.
  - `index.tsx` is server-safe (no `'use client'`); attaches leaves via property assignment.
  - `Tabs.Indicator` defaults `renderBeforeHydration={true}` (Roadie override of Base UI's `false`).
  - `data-slot` on every rendered DOM element; `displayName` in dot-notation (`'Tabs.Root'`, etc.).

  **Patterns to follow:** `packages/components/src/components/Fieldset/`,
  `docs/contributing/COMPOUND_PATTERNS.md`, `docs/contributing/BASE_UI.md`.

  **Verification:**
  - `pnpm --filter @oztix/roadie-components typecheck` clean.
  - `pnpm --filter @oztix/roadie-components build` emits per-leaf dist files; leaf `.js` files start with `"use client";`; `index.js` does **not**.
  - `Tabs === Tabs.Root` reference equality.

- [ ] **Unit 2 — Tests**

  **Goal:** Lock the public surface and core behaviour.

  **Requirements:** R1, R2, R3, R5, R7. **Dependencies:** Unit 1.

  **Files to create:** `packages/components/src/components/Tabs/Tabs.test.tsx`.

  **Test scenarios:**
  - Happy path: `defaultValue` → `data-active` on the matching tab; clicking another tab fires `onValueChange` and moves `data-active`.
  - Reference equality: `Tabs === Tabs.Root`; bare and `.Root` render the same DOM.
  - `data-slot` present on every leaf.
  - Active panel renders; inactive panels are unmounted by default; `keepMounted` keeps them in the DOM.
  - `disabled` tab cannot be activated by click or by keyboard.
  - Keyboard: `ArrowRight` + `Enter` activates the next tab.
  - `direction='vertical'` emits `data-orientation='vertical'` and applies `data-[orientation=vertical]:flex-col` on the list.
  - `intent='accent'` adds `intent-accent` to the root.
  - Each emphasis: list classes, indicator presence, transition + `motion-reduce` contract on the indicator.
  - `emphasis='strong'` flips active text to `text-inverted`.
  - Every tab carries `is-interactive`.
  - `subtler` + vertical: list border swaps to the left edge.
  - Consumer `renderBeforeHydration={false}` is forwarded.

  **Verification:** `pnpm --filter @oztix/roadie-components test` passes.

- [ ] **Unit 3 — Wire into package surface (barrel + subpath + RSC canary)**

  **Goal:** Make `Tabs` reachable from both `@oztix/roadie-components` and
  `@oztix/roadie-components/tabs`, and prove the RSC contract.

  **Requirements:** R5, R6. **Dependencies:** Unit 1, Unit 2.

  **Files:**
  - Modify `packages/components/src/index.tsx` (add `Tabs` block matching Carousel's shape).
  - `packages/components/package.json` (auto-generated — run `generate:exports`).
  - Modify `docs/src/app/debug/rsc-smoke/page.tsx` (add subpath, `.Root` alias, **and** root-barrel sections — mirrors Fieldset).

  **Verification:**
  - `./tabs` entry appears in `package.json` `exports`.
  - `pnpm typecheck && pnpm lint && pnpm build` all green.
  - `/debug/rsc-smoke` renders all three Tabs sections without server/client boundary errors.

- [ ] **Unit 4 — Documentation page**

  **Goal:** Ship `docs/src/app/components/tabs/page.mdx` per
  `docs/contributing/COMPONENT_DOC_TEMPLATE.md`.

  **Requirements:** R3, R6, R7. **Dependencies:** Unit 3.

  **Section order:** Import (subpath) → Default → Emphasis (strong / normal /
  subtle / subtler) → Sizes → Intents → States (disabled) → Composition
  (icons via render-prop, vertical, persistent panels) → Guidelines →
  Accessibility → `<PropsDefinitions componentPath='packages/components/src/components/Tabs' />`
  (folder path, not single file).

  **Frontmatter:** `metadata = { title: 'Tabs', description: 'Tabbed
navigation between related views with an animated active indicator.',
status: 'beta', category: 'Navigation' }`.

  **Verification:**
  - `pnpm --filter docs build` succeeds.
  - `/components` index lists Tabs under Navigation.
  - `/components/tabs` renders all sections; `emphasis='normal'` matches the prototype's feel; `<PropsDefinitions>` shows literal `intent` / `emphasis` / `size` / `direction` unions.

## System-Wide Impact

- **API surface:** Additive only — new subpath + new barrel exports. No
  existing imports break.
- **State lifecycle:** Base UI owns Tabs state; Roadie's wrapper is purely
  presentational.
- **Unchanged invariants:** No edits to existing tokens / intents /
  emphasis utilities. No edits to peer Base UI wrappers (Select, Combobox,
  etc.).

## Risks & Dependencies

| Risk                                                               | Mitigation                                                                                                        |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| Active-tab indicator flashes at SSR before hydration               | `renderBeforeHydration={true}` default on `Tabs.Indicator`; verified via RSC canary.                              |
| Adding `'use client'` to `index.tsx` reinstates the RSC proxy wall | Convention forbids it; Unit 3 verifies `head -c 13 dist/.../index.js` is not the directive.                       |
| `react-docgen-typescript` drops variant props from the docs table  | Inline literal unions on the public prop shape (no `VariantProps<...>['key']`).                                   |
| CI-only typecheck failures after this lands                        | Run `find . -name "*.tsbuildinfo" -not -path "*/node_modules/*" -delete && pnpm typecheck` per the solutions doc. |

## Documentation / Operational Notes

- Unit 4 ships the docs page; the `/components` index discovers Tabs
  automatically once the folder exists with valid metadata.
- A `.changeset/*.md` declaring `@oztix/roadie-components` minor must
  accompany this PR — the release pipeline reads changesets to bump and
  regenerate the changelog.
- No feature flag, no migration, no monitoring impact.

## Sources & References

- Visual reference: `/Users/lukebrooker/Code/prototype/src/components/SegmentedTabs.tsx`
- Compound conventions: `docs/contributing/COMPOUND_PATTERNS.md`
- Base UI authoring: `docs/contributing/BASE_UI.md`
- Doc template: `docs/contributing/COMPONENT_DOC_TEMPLATE.md`
- Reference compounds: `packages/components/src/components/Fieldset/`,
  `packages/components/src/components/Carousel/`
- Base UI Tabs API: `node_modules/@base-ui/react/tabs/{root,list,tab,indicator,panel}/`
- Solutions: `rsc-patterns/compound-export-namespace.md`,
  `build-errors/react-docgen-cva-literal-props.md`,
  `build-errors/cross-bundler-dev-env-check.md`,
  `build-errors/stale-tsbuildinfo-masks-local-errors.md`
