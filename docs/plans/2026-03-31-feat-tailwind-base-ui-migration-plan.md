---
title: 'feat: Migrate design system from PandaCSS to Tailwind v4 + Base UI'
type: feat
status: active
date: 2026-03-31
origin: docs/brainstorms/2026-03-31-tailwind-migration-brainstorm.md
---

# feat: Migrate Design System from PandaCSS to Tailwind v4 + Base UI

## Overview

Major v2 overhaul of the Roadie design system: replace PandaCSS with Tailwind CSS v4, replace Ark UI with Base UI, and introduce a Tailwind-native intent/emphasis semantic styling system using `@utility` directives. The system must serve React apps (full component library) and a legacy Vue app (tokens + utility classes).

Work should be done on a **new branch from `main`**. Reference `spike-tailwind-conversion` and `packages/ui-v2` for prototype patterns.

## Problem Statement / Motivation

PandaCSS is being replaced because:

- **AI-friendliness**: Tailwind has vastly more training data — AI tools generate better Tailwind code
- **Cross-framework support**: PandaCSS is React-only; a legacy Vue app needs the token/utility layer
- **Modern CSS**: Tailwind v4's `@theme`, `@utility`, `@custom-variant` map directly to CSS features
- **Ecosystem**: Tailwind has broader tooling (IntelliSense, prettier plugin, etc.)
- **Runtime dynamic theming**: Per-collection accent colors via JS-generated OKLCH scales

Ark UI is being replaced with Base UI because Base UI provides unstyled accessible primitives that pair naturally with Tailwind utility classes. (see brainstorm: docs/brainstorms/2026-03-31-tailwind-migration-brainstorm.md)

## Proposed Solution

### Architecture (Two Layers)

**Layer 1 — CSS Foundation (`@oztix/roadie-core`):**
A Tailwind v4 source CSS file (`roadie.css`) providing:

- Design tokens as CSS custom properties via `@theme` / `@theme reference`
- Intent scope utilities via `@utility` (`intent-accent`, `intent-danger`, etc.)
- Emphasis utilities via `@utility` (`emphasis-strong`, `emphasis-subtle`, etc.)
- `is-interactive` utility for interaction defaults
- Dark mode via `.dark` class (CSS variable swaps)
- Fluid type scale via `@theme`
- Font-face declarations
- Tailwind's default color palette removed

This is a **source CSS file** — consumers must have Tailwind v4 installed. This is intentional: it gives consumers full Tailwind IntelliSense, JIT compilation, and variant support for all custom utilities. The compiled CSS output is also exported for edge cases.

**Layer 2 — React Components (`@oztix/roadie-components`):**

- Base UI primitives for accessibility
- CVA for variant definitions (intent, emphasis, size)
- `cn()` (clsx + tailwind-merge) for class composition
- ALL components use the intent/emphasis system (no Shadcn-style `variant` props)
- **No layout wrapper components** — View, Grid, Container deprecated (use `<div>` + Tailwind classes + intent/emphasis utilities directly)
- **Performance principle**: fewer component wrappers = faster rendering + smaller bundle

### Color System: Extended Radix 0-13 with OKLCH

14 steps per intent (neutral, brand, accent, danger, success, warning, info), per mode:

- Steps 1-12: standard Radix scale
- Step 0: lightest extreme (pure white in light, pure black in dark)
- Step 13: darkest extreme (near-black in light, near-white in dark)

Dynamic accent: Radix-based JS generator extended to output 0-13. Includes automatic `fg-on-strong` contrast detection (WCAG AA check flips between white/dark text).

### Intent/Emphasis System

All defined as `@utility` directives for Tailwind IntelliSense:

**Intent utilities** set `--intent-*` CSS custom properties. Children inherit via cascade:

- 7 intents: `neutral`, `brand`, `accent`, `danger`, `success`, `warning`, `info`
- Default intent (neutral) set on `:root`

**Emphasis naming convention:** `emphasis-{level}-{property}`

Property-specific primitives (composable):
| Level | Surface | Border | Foreground |
|---|---|---|---|
| subtler | `emphasis-subtler-surface` (step 2) | `emphasis-subtler-border` (step 5) | `emphasis-subtler-fg` (step 10) |
| subtle | `emphasis-subtle-surface` (step 3) | `emphasis-subtle-border` (step 6) | `emphasis-subtle-fg` (step 11) |
| default | `emphasis-default-surface` (step 1) | `emphasis-default-border` (step 7) | `emphasis-default-fg` (step 12) |
| strong | `emphasis-strong-surface` (step 9) | `emphasis-strong-border` (step 9) | `emphasis-strong-fg` (step 13+bold) |
| inverted | `emphasis-inverted-surface` (step 12) | `emphasis-inverted-border` (step 12) | `emphasis-inverted-fg` (step 0) |

Surface-only elevation:
| Level | Utility | Light mode | Dark mode |
|---|---|---|---|
| raised | `emphasis-raised-surface` | step 0 + drop shadow | step 2 + drop shadow |
| sunken | `emphasis-sunken-surface` | step 2 + inset shadow | step 0 + inset shadow |
| overlay | `emphasis-overlay-surface` | scrim + backdrop blur | scrim + backdrop blur |

Combined shortcuts (set surface + fg together for common combos):

- `emphasis-strong` = `emphasis-strong-surface` + `emphasis-inverted-fg`
- `emphasis-subtle` = `emphasis-subtle-surface` + `emphasis-default-fg`
- `emphasis-subtler` = `emphasis-subtler-surface` + `emphasis-default-fg`
- `emphasis-default` = `emphasis-default-surface` + `emphasis-default-fg`
- `emphasis-inverted` = `emphasis-inverted-surface` + `emphasis-inverted-fg`
- `emphasis-raised` = `emphasis-raised-surface` + `emphasis-default-fg`
- `emphasis-sunken` = `emphasis-sunken-surface` + `emphasis-default-fg`

## Technical Approach

### Architecture

```
@oztix/roadie-core (v2.0.0)
├── src/
│   ├── css/
│   │   ├── roadie.css          # Main Tailwind v4 source file
│   │   ├── tokens.css          # @theme block with all CSS custom properties
│   │   ├── intents.css         # @utility intent-* definitions
│   │   ├── emphasis.css        # @utility emphasis-* definitions
│   │   ├── interactions.css    # @utility is-interactive
│   │   └── fonts.css           # @font-face declarations
│   ├── colors/
│   │   └── radix-generator.ts  # Extended 0-13 OKLCH scale generator
│   ├── utils/
│   │   ├── cn.ts               # clsx + tailwind-merge helper
│   │   └── contrast.ts         # WCAG contrast check for fg-on-strong
│   └── index.ts                # JS exports (generator, cn, token constants)
├── dist/
│   ├── roadie.css              # Source CSS (for Tailwind consumers)
│   ├── roadie.compiled.css     # Pre-compiled CSS (for non-Tailwind consumers)
│   └── index.js                # JS bundle
└── package.json

@oztix/roadie-components (v2.0.0)
├── src/
│   ├── components/
│   │   ├── Button/
│   │   │   ├── Button.tsx      # Base UI Button + CVA
│   │   │   └── Button.test.tsx
│   │   ├── Text/
│   │   ├── Heading/
│   │   ├── Code/
│   │   ├── Mark/
│   │   ├── Highlight/
│   │   ├── SpotIllustration/   # Namespaced export
│   │   ├── Badge/              # New
│   │   ├── Card/               # New
│   │   ├── Field/              # New
│   │   ├── Input/              # New
│   │   └── Select/             # New
│   ├── providers/
│   │   └── ThemeProvider.tsx    # Dynamic accent + dark mode (SSR-safe)
│   └── index.ts
└── package.json
```

### Implementation Phases

#### Phase 1: Core Foundation (CSS + Tokens)

**Goal:** Ship `@oztix/roadie-core` v2 with the complete CSS foundation.

**Tasks:**

- [ ] Create new branch from `main`: `feature/v2-tailwind-migration`
- [x] **SPIKE FIRST**: Validate `@utility` with CSS custom property scoping + dark mode
  - Validated: `@utility` works with CSS custom property scoping
  - Validated: `.dark &` nesting inside `@utility` compiles correctly (native CSS nesting in output)
  - Validated: intent cascade, same-element composition, emphasis primitives, is-interactive pseudo-selectors all work
  - Validated: dark mode raised/sunken swap works via `.dark &` nesting inside intent utilities
  - Spike files: `packages/core/spike/` (spike.css, index.html, output.css)
- [x] `packages/core/src/css/tokens.css` — Define all color scales in OKLCH (0-13 per intent, light + dark)
  - Port neutral, brand, danger, success, warning, info scales from prototype
  - Add step 0 and step 13 to all scales
  - Define dark mode overrides in `.dark` selector
  - Register via `@theme` / `@theme reference` (remove Tailwind default palette)
  - Include spacing, radii, font-size (fluid clamp-based), font-weight, line-height, letter-spacing tokens
- [ ] `packages/core/src/css/intents.css` — Define all 7 intent utilities via `@utility`
  - Each intent sets `--intent-surface-*`, `--intent-border-*`, `--intent-fg-*`, `--intent-surface-raised`, `--intent-surface-sunken` vars
  - Dark mode: `.dark` override within each intent that swaps raised/sunken steps
  - Default intent (neutral) set on `:root`
- [ ] `packages/core/src/css/emphasis.css` — Define emphasis utilities via `@utility`
  - Property-specific primitives: `emphasis-{level}-surface`, `emphasis-{level}-fg`, `emphasis-{level}-border` for each level
  - Combined shortcuts: `emphasis-strong`, `emphasis-subtle`, etc. that compose surface + fg
  - Elevation: `emphasis-raised-surface` (shadow), `emphasis-sunken-surface` (inset), `emphasis-overlay-surface` (blur)
- [ ] `packages/core/src/css/interactions.css` — Define `is-interactive` via `@utility`
  - Cursor, transitions, hover brightness, active scale, focus ring, disabled state
- [ ] `packages/core/src/css/fonts.css` — Port font-face declarations from v1 preset
  - Intermission and IBM Plex Mono from CDN
- [ ] `packages/core/src/css/roadie.css` — Main entry that `@import`s all above + `@import "tailwindcss"`
- [ ] `packages/core/src/colors/radix-generator.ts` — Port from ui-v2, extend to 0-13
  - Accept hex input, output `{ light: string[], dark: string[] }` with 14 steps each
  - Add WCAG AA contrast check: determine fg-on-strong color (white vs dark)
- [ ] `packages/core/src/utils/cn.ts` — Export `cn()` helper (clsx + tailwind-merge)
- [ ] `packages/core/src/utils/contrast.ts` — WCAG contrast ratio calculator for fg-on-strong
- [x] Update `packages/core/package.json`:
  - Removed: `@pandacss/dev`, `@pandacss/types`
  - Added: `clsx`, `tailwind-merge` as dependencies
  - Added: `tailwindcss` (^4), `@tailwindcss/cli` as devDependencies
  - Updated `exports` map: `./css` → source CSS, `./css/compiled` → compiled, `./colors` → generator, `./utils` → cn
- [x] Update `packages/core/tsup.config.ts` — Entry points: index, colors/index, utils/index
- [ ] Remove: PandaCSS preset, recipes, patterns, `panda.config.js`, build-panda-tokens.js (kept for reference during migration)
- [ ] Keep: `build-css-tokens.js` as reference (may adapt for CSS generation), `build-figma-tokens.js`
- [ ] Add PostCSS config for compiled CSS output generation
- [ ] Build script: generate `dist/roadie.compiled.css` via Tailwind CLI for non-Tailwind consumers
  - Must include ALL intent/emphasis/interaction utilities (not just those found in content)
  - Use a dummy content file or `@source` directive that references all utility class names to prevent purging
  - Or use Tailwind's `safelist` equivalent in v4 if available

**Success criteria:**

- `roadie.css` imports cleanly into a Tailwind v4 project
- All intent/emphasis utilities appear in Tailwind IntelliSense
- `roadie.compiled.css` works standalone in a plain HTML file
- Color generator produces 0-13 steps with correct OKLCH values
- Dark mode swaps work correctly

**Estimated effort:** Large — this is the architectural foundation.

#### Phase 2: Component Migration

**Goal:** Ship `@oztix/roadie-components` v2 with all v1 components reimplemented + new components.

**Tasks:**

- [ ] Update `packages/components/package.json`:
  - Remove: `@ark-ui/react`
  - Add: `@base-ui/react`, `class-variance-authority`, `clsx`, `tailwind-merge`
  - Add: `tailwindcss` (^4), `@tailwindcss/postcss` as devDependencies
  - Peer dependency on `@oztix/roadie-core` (^2.0.0)
- [ ] Add `postcss.config.mjs` and configure Tailwind
- [ ] Update `tsup.config.ts` — same entry point strategy, update externals
- [ ] **Migrate v1 components:**
  - [ ] `Button` — Base UI Button + CVA (intent, emphasis, size variants). Port from ui-v2 prototype, ensure intent/emphasis system. Include icon sizes.
  - [ ] `Text` — Semantic `<p>` with CVA (emphasis, size). Fluid type via Tailwind classes.
  - [ ] `Heading` — Semantic `<h1>`-`<h6>` with CVA (emphasis, level→tag mapping). Fluid type.
  - [ ] `Code` — `<code>` with CVA (emphasis variants)
  - [ ] `Mark` — `<mark>` with CVA
  - [ ] `Highlight` — Wraps Mark, reimplement `useHighlight` logic in-house (Ark UI's version is ~30 lines of string splitting — no need for external dep, just port the algorithm)
  - [ ] `SpotIllustration` — Namespaced export: `SpotIllustration.Ticket`, `SpotIllustration.Heart`, etc. Port SVG rendering, replace PandaCSS `styled('svg')` with Tailwind classes.
- [ ] **Deprecated (not migrated):**
  - `View` → `<div className="intent-{name} emphasis-{level} ...">` (provide codemod)
  - `Grid` → `<div className="grid grid-cols-3 gap-4 ...">` (provide codemod)
  - `Container` → `<div className="container px-4 md:px-6">` (Tailwind built-in, provide codemod)
- [ ] **Add new components** (from ui-v2 prototypes):
  - [ ] `Badge` — with intent/emphasis (NOT Shadcn variant pattern)
  - [ ] `Card` — with intent/emphasis
  - [ ] `Field` + `Label` — form field wrapper
  - [ ] `Input` + `Textarea` — Base UI input primitives
  - [ ] `Select` — Base UI Select
  - [ ] `Separator` — simple `<hr>` styled
- [ ] **ThemeProvider** — Port from ui-v2, make SSR-safe:
  - Server: export `getAccentStyleTag(hex, mode)` that returns `<style>` string for `<head>` injection
  - Client: `useEffect` injection as fallback
  - Always include default accent fallback values in roadie.css (so no FOUC for default theme)
- [ ] **Update all tests:**
  - Assert CVA output classes (e.g., `intent-brand`, `emphasis-strong`)
  - Use Testing Library for behaviour assertions
  - No snapshot tests of class strings (too brittle)

**Success criteria:**

- All v1 components reimplemented and passing tests
- All components use intent/emphasis system consistently
- ThemeProvider works with SSR (no flash for default accent)
- SpotIllustrations use namespaced export pattern
- Tree-shaking works (each component in its own chunk)

**Estimated effort:** Large — 9 components to migrate, 6+ new components.

#### Phase 3: Documentation + Migration Guide

**Goal:** Update docs site and provide migration guide for consumers.

**Tasks:**

- [ ] Update `docs/` to use Tailwind v4:
  - Remove PandaCSS (`panda.config.ts`, `prepare` script, generated artifacts)
  - Add Tailwind v4 + PostCSS
  - Import `roadie.css` from core
  - Replace `css()` utility usage in layout with Tailwind classes
  - Replace PandaCSS JSX patterns (View, Container) with v2 components
- [ ] Update MDX component documentation:
  - Update code examples to show Tailwind + intent/emphasis patterns
  - Update prop tables (react-docgen-typescript should auto-extract)
  - Add live examples showing intent cascade, emphasis variants, dark mode
- [ ] **Write migration guide** (`docs/migration-v2.md`):
  - Before/after for every breaking change:
    - `colorPalette="accent"` → `intent="accent"`
    - `<View display="flex" gap="400" p="200">` → `<View className="flex gap-4 p-2">`
    - `data-color-mode="dark"` → `.dark` class
    - `import { css } from '@oztix/roadie-core/css'` → Tailwind utilities
    - `import { styled } from '@oztix/roadie-core/jsx'` → CVA + cn()
    - `import { button } from '@oztix/roadie-core/recipes'` → CVA in component
  - PandaCSS removal steps
  - Tailwind v4 setup steps
  - SpotIllustration import changes
  - View/Grid/Container deprecation (with codemod instructions)
- [ ] **Codemods** (jscodeshift or simple AST transforms):
  - `<View display="flex" gap="400" colorPalette="accent" emphasis="subtle">` → `<div className="intent-accent emphasis-subtle flex gap-4">`
  - `<Container>` → `<div className="container px-4 md:px-6">`
  - `colorPalette="accent"` → `intent="accent"` (on remaining components)
  - `data-color-mode="dark"` → class `.dark`
- [ ] **Vue integration guide** (`docs/vue-integration.md`):
  - Install core + Tailwind v4
  - Import roadie.css in entry
  - Using intent/emphasis classes in templates
  - Dynamic accent color via `generateRadixScale` + CSS injection
  - Dark mode with `.dark` class toggle
- [ ] **AI coding guide** section in CLAUDE.md:
  - Document intent/emphasis vocabulary
  - Show canonical component patterns
  - List available utilities and their purpose

**Success criteria:**

- Docs site builds and deploys with Tailwind v4
- Migration guide covers every breaking change with code examples
- Vue integration guide is testable end-to-end

**Estimated effort:** Medium

#### Phase 4: Polish + Release

**Goal:** Finalize, test, and release v2.0.0.

**Tasks:**

- [ ] Run full test suite across all packages
- [ ] Verify tree-shaking with a test consumer app
- [ ] Measure CSS bundle size — compare roadie.compiled.css vs v1 output
- [ ] Test in a real React app (prototype or docs site)
- [ ] Test Vue integration with legacy app
- [ ] Dark mode testing: all components, both modes, all intents
- [ ] Accessibility audit: focus rings, contrast ratios (especially dynamic accent), keyboard navigation
- [ ] Create changesets (major bump for core + components)
- [ ] Update CLAUDE.md with v2 conventions
- [ ] Tag release, publish to npm

**Success criteria:**

- All tests pass
- CSS size is reasonable (target: <50KB compressed for roadie.compiled.css)
- Vue integration works end-to-end
- No accessibility regressions
- Changeset + release notes ready

**Estimated effort:** Medium

## Build Pipeline & Distribution

### Core Package Build

**v1 build (complex — 4 steps):**

1. `build:tokens` → runs 3 scripts (panda tokens, CSS tokens, Figma tokens)
2. `tsup` → bundles TypeScript
3. `build:panda` → `panda codegen` + `panda emit-pkg` → generates PandaCSS artifacts
4. `build:copy-css` → copies token CSS files

**v2 build (simplified — 2 steps):**

1. `tsup` → bundles JS exports (colors/radix-generator, utils/cn, utils/contrast)
2. `tailwindcss` CLI → compiles `roadie.css` → `dist/roadie.compiled.css` (for non-Tailwind consumers)

The source CSS (`roadie.css`) is distributed as-is — it's consumed by Tailwind v4 via `@import`. No build step needed for that file.

### Package Exports Map

```json
{
  "exports": {
    "./css": "./src/css/roadie.css",
    "./css/compiled": "./dist/roadie.compiled.css",
    "./colors": {
      "import": "./dist/colors/index.js",
      "types": "./dist/colors/index.d.ts"
    },
    "./utils": {
      "import": "./dist/utils/index.js",
      "types": "./dist/utils/index.d.ts"
    }
  }
}
```

### Consumer Setup (React + Tailwind)

```css
/* app/globals.css */
@import '@oztix/roadie-core/css';

/* That's it — tokens, intents, emphasis, interactions all included */
/* Tailwind's @import is handled inside roadie.css */
```

```tsx
// app/layout.tsx
import { ThemeProvider } from '@oztix/roadie-components'

import './globals.css'

export default function Layout({ children }) {
  return <ThemeProvider defaultAccentColor='#0091EB'>{children}</ThemeProvider>
}
```

### Consumer Setup (Vue + Tailwind)

```css
/* main.css */
@import '@oztix/roadie-core/css';
```

```js
// main.js
import { generateRadixScale } from '@oztix/roadie-core/colors'

import './main.css'

// Dynamic accent (if needed)
const { light, dark } = generateRadixScale('#FF6B00')
// Inject as CSS vars on :root
```

```html
<!-- component.vue -->
<template>
  <div class="intent-accent">
    <button class="emphasis-strong is-interactive rounded-lg px-4 py-2">
      Buy tickets
    </button>
  </div>
</template>
```

### Consumer Setup (Non-Tailwind / Vanilla)

```html
<link
  rel="stylesheet"
  href="node_modules/@oztix/roadie-core/dist/roadie.compiled.css"
/>

<div class="intent-accent">
  <button class="emphasis-strong is-interactive">Buy tickets</button>
</div>
```

Note: Non-Tailwind consumers get intent/emphasis utilities but NOT Tailwind utilities (flex, gap, p-4, etc.).

### Components Package Build

Same as v1 but simpler:

1. `tsup` → bundles components (ESM, code-splitting, one chunk per component)
2. Externals: `react`, `@oztix/roadie-core`, `@base-ui/react`
3. `onSuccess` hook: adds `"use client"` directive where needed

No PandaCSS codegen step. No style generation. Components just use Tailwind class strings.

### Turbo Pipeline

```
core:build → components:build → docs:build
```

Same dependency chain as v1, but each step is faster (no PandaCSS codegen).

## Alternative Approaches Considered

1. **All-in Tailwind (no intent cascade)** — Rejected: loses the powerful intent scoping pattern and is more verbose for themed components. (see brainstorm)

2. **CSS-only, no Tailwind** — Rejected: loses Tailwind's excellent layout/spacing utilities and AI training data advantage. (see brainstorm)

3. **Plain CSS classes instead of @utility** — Rejected: no Tailwind IntelliSense, no variant composition, no purge safety. (see brainstorm)

4. **Pre-compiled CSS only (no Tailwind requirement for consumers)** — Rejected: consumers lose Tailwind IntelliSense and JIT for custom utilities. Vue consumers setting up Tailwind is acceptable given the DX benefits.

5. **Keep Ark UI** — Rejected: Base UI is simpler, unstyled, and pairs better with Tailwind utility patterns. Ark UI usage in v1 is minimal (mostly `ark` factory).

## System-Wide Impact

### Interaction Graph

- Consumer imports `roadie.css` → Tailwind processes `@theme`, `@utility`, `:root` vars → generates utility classes
- Intent utility class on parent → sets `--intent-*` CSS vars → children's emphasis utilities read vars → correct colors render
- `ThemeProvider` mount → `generateRadixScale(hex)` → injects `<style>` with `--color-accent-*` vars → intent utilities that reference accent vars update
- Dark mode toggle → `.dark` class on root → CSS var values swap → all intent/emphasis utilities automatically update

### Error & Failure Propagation

- **Missing intent scope**: If no intent class is on any ancestor, `--intent-*` vars resolve to `:root` defaults (neutral). This is safe — no error, just neutral colors.
- **Dynamic accent not loaded (SSR)**: If `ThemeProvider` hasn't run `useEffect` yet, accent vars are undefined. **Mitigation**: include default accent fallback values in roadie.css.
- **Invalid hex to generator**: `generateRadixScale` should validate input and fallback to brand blue.

### State Lifecycle Risks

- **FOUC for dynamic accent**: Client-side injection via `useEffect` creates a flash. **Mitigation**: `getAccentStyleTag()` for SSR injection, plus CSS fallback values.
- **No partial migration path**: This is a major version bump — consumers must migrate fully. No mixed v1/v2 support.

### API Surface Parity

All components share the same prop interface for intent/emphasis:

```tsx
interface IntentProps {
  intent?:
    | 'neutral'
    | 'brand'
    | 'accent'
    | 'danger'
    | 'success'
    | 'warning'
    | 'info'
  emphasis?:
    | 'subtler'
    | 'subtle'
    | 'default'
    | 'strong'
    | 'inverted'
    | 'raised'
    | 'sunken'
    | 'overlay'
}
```

Button, Badge, Card, Text, Heading, Code all accept these props.
Intent/emphasis can also be applied directly to any HTML element via utility classes (no wrapper component needed).

### Integration Test Scenarios

1. **Intent cascade**: Parent has `intent-accent`, child Button renders with accent colors, nested Card inside renders same accent
2. **Dynamic accent + dark mode**: Change accent hex → toggle dark mode → verify all components update correctly
3. **SSR accent**: Server render with `getAccentStyleTag()` → hydrate → verify no FOUC
4. **Vue integration**: Import compiled CSS → use intent classes → toggle dark mode → verify correct rendering
5. **Tree-shaking**: Import only Button → verify bundle doesn't include Card/Select/etc. code

## Acceptance Criteria

### Functional Requirements

- [ ] All 7 intent utilities defined and working via `@utility`
- [ ] All emphasis utilities working: property-specific (`emphasis-{level}-{surface|fg|border}`) + combined shortcuts (`emphasis-{level}`)
- [ ] `is-interactive` utility provides hover, active, focus, disabled defaults
- [ ] Dark mode toggles all colors correctly via `.dark` class
- [ ] Dynamic accent color generation produces 0-13 OKLCH scale
- [ ] Automatic fg-on-strong contrast detection (white vs dark text)
- [ ] V1 components reimplemented: Button, Text, Heading, Code, Mark, Highlight, SpotIllustration
- [ ] V1 components deprecated with codemods: View, Grid, Container
- [ ] New components: Badge, Card, Field, Input, Select, Separator
- [ ] ThemeProvider supports SSR (no FOUC for default accent)
- [ ] SpotIllustrations use namespaced export
- [ ] Fluid type scale works responsively
- [ ] Font-face declarations included

### Non-Functional Requirements

- [ ] Full Tailwind IntelliSense for all custom utilities
- [ ] CSS bundle < 50KB compressed
- [ ] Tree-shaking works for component package
- [ ] Vue can consume compiled CSS and use intent/emphasis classes
- [ ] WCAG AA contrast maintained for all intent + emphasis combinations
- [ ] Works with React 19 + Next.js 15+

### Quality Gates

- [ ] All component tests pass
- [ ] TypeScript strict mode, no `any` types
- [ ] ESLint + Prettier pass
- [ ] Docs site builds and deploys
- [ ] Migration guide covers every breaking change

## Dependencies & Prerequisites

**Must have before starting:**

- Tailwind CSS v4 stable (already released)
- Base UI v1 stable (already released: ^1.3.0)
- Working prototypes validated (ui-v2 + prototype repo)

**External dependencies to add:**

- `tailwindcss` ^4, `@tailwindcss/postcss` ^4
- `@base-ui/react` ^1.0.0
- `class-variance-authority` ^0.7
- `clsx` ^2, `tailwind-merge` ^3
- `next-themes` ^0.4 (for ThemeProvider)

**Dependencies to remove:**

- `@pandacss/dev`, `@pandacss/types`
- `@ark-ui/react`

## Risk Analysis & Mitigation

| Risk                                                                      | Probability | Impact | Mitigation                                                                                                                 |
| ------------------------------------------------------------------------- | ----------- | ------ | -------------------------------------------------------------------------------------------------------------------------- |
| CSS bundle size regression (vs PandaCSS on-demand)                        | Medium      | Medium | Measure early, split CSS if needed, Tailwind JIT handles utilities                                                         |
| `@utility` doesn't support CSS custom property scoping or `.dark` nesting | Medium      | High   | **Phase 1 spike task** — test before committing to architecture. Fallback: `@layer components` classes + Tailwind safelist |
| Consumer migration effort too high                                        | Medium      | Medium | Comprehensive migration guide + potential jscodeshift codemods                                                             |
| Dynamic accent FOUC on SSR                                                | High        | Medium | `getAccentStyleTag()` for server injection + CSS fallback values                                                           |
| Intent nesting confusion                                                  | Medium      | Low    | Document nesting behaviour, inner intent overrides outer                                                                   |
| fg-on-strong contrast fails for edge-case accent colors                   | Medium      | High   | Automatic WCAG AA contrast check in generator                                                                              |

## Future Considerations

- **Codemods**: jscodeshift transforms for automated v1→v2 migration (colorPalette→intent, style props→className)
- **Tailwind plugin**: If `@utility` proves limiting, fall back to a proper Tailwind v4 plugin
- **Additional components**: Dialog, Combobox, DropdownMenu, Tabs, etc. from ui-v2 prototypes
- **Design tokens sync**: Figma ↔ code token sync via build-figma-tokens.js
- **CSS `light-dark()` adoption**: When Australian browser coverage exceeds 99%

## Sources & References

### Origin

- **Brainstorm document:** [docs/brainstorms/2026-03-31-tailwind-migration-brainstorm.md](../brainstorms/2026-03-31-tailwind-migration-brainstorm.md)
  - Key decisions carried forward: Tailwind-native @utility for intent/emphasis, Radix 0-13 OKLCH scale, CSS cascade intent system, evolve-in-place migration, View/Grid/Container deprecated (performance principle)

### Internal References

- Existing prototype: `packages/ui-v2/` (Tailwind v4 + Base UI + CVA)
- Existing prototype: `/Users/lukebrooker/Code/prototype/src/app/globals.css` (intent/emphasis CSS system)
- Current token build: `packages/core/src/tokens/build-css-tokens.js` (CSS variable generation)
- Current recipes: `packages/core/src/recipes/` (CVA patterns to port)
- Color generator: `packages/ui-v2/lib/colors/radix-generator.ts`

### External References

- Tailwind v4 custom utilities: https://tailwindcss.com/docs/adding-custom-styles#adding-custom-utilities
- Base UI React: https://base-ui.com/
- Radix Colors: https://www.radix-ui.com/colors
- OKLCH color space: https://oklch.com/

### Related Work

- Branch: `spike-tailwind-conversion` (current spike work)
- Package: `packages/ui-v2/` (Next.js prototype with target architecture)
