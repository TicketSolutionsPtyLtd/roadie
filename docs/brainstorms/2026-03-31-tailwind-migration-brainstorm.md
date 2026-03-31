# Brainstorm: Roadie Design System v2 — PandaCSS to Tailwind Migration

**Date:** 2026-03-31
**Status:** Draft

## What We're Building

A major overhaul of the Roadie design system, replacing PandaCSS with Tailwind CSS v4 and Ark UI with Base UI for component primitives. The system must serve both React apps and a legacy Vue app, with the foundations layer (tokens, intent system, utility classes) usable across both frameworks.

### Goals

- Replace PandaCSS with Tailwind CSS v4 as the styling engine
- Replace Ark UI with Base UI for accessible component primitives
- Maintain the intent/emphasis semantic styling system
- Support runtime dynamic accent colors (per collection/event)
- Optimize for AI-assisted coding
- Make tokens and utility classes usable in a legacy Vue app
- Evolve existing packages in place (major version bump, not new packages)

## Why This Approach

### Architecture: Tailwind-Native Foundations + React Components

After comparing two prototype approaches (packages/ui-v2 and /prototype), we're going with a unified Tailwind-native approach using v4's `@utility` and `@custom-variant` directives.

**Layer 1 — CSS Foundation (framework-agnostic):**
A single CSS file (`roadie.css`) built entirely with Tailwind v4 features:

- Design tokens as CSS custom properties, registered via `@theme` / `@theme reference`
- Intent scope utilities defined via `@utility` (e.g., `intent-accent`, `intent-danger`)
- Emphasis utilities defined via `@utility` (e.g., `emphasis-strong`, `emphasis-subtle`)
- Dark mode via `.dark` class (swaps CSS variable values — no `dark:` variants needed for colors)
- Tailwind's default color palette removed — only Roadie tokens exist
- Full Tailwind IntelliSense autocomplete for all custom utilities
- Compiles to regular CSS, so Vue can consume the output directly

**Layer 2 — React Components:**

- Base UI primitives for accessibility
- CVA for variant definitions (intent, emphasis, size)
- Tailwind utilities for layout, spacing, typography
- View and Grid as layout primitives with intent/emphasis props

### Why `@utility` over plain CSS classes?

- Full Tailwind IntelliSense autocomplete — intent/emphasis show up in IDE suggestions
- Automatic `utilities` layer placement — no manual `@layer` management needed
- Works with all Tailwind variants (`hover:emphasis-strong`, `md:intent-accent`)
- Tree-shaken by Tailwind's purge — unused intents don't ship
- Still compiles to regular CSS for Vue/non-Tailwind consumers

### Why not all-in Tailwind (no intent cascade)?

- The intent cascade system is genuinely powerful — a parent `intent-accent` scopes all children's colors
- Fewer valid combinations = fewer wrong answers for AI
- Emphasis utilities reduce verbose Tailwind class strings

### Why not CSS-only (no Tailwind)?

- Tailwind's utility-first model is excellent for layout, spacing, and one-off tweaks
- AI models have extensive Tailwind training data
- Developer productivity for React apps is higher with Tailwind

## Key Decisions

### 1. Color Scale: Extended Radix 0-13 with OKLCH

- Extended Radix-style scale: 14 steps (0-13) per intent, per mode
  - Steps 1-12: standard Radix scale (already prototyped in ui-v2)
  - Step 0: lightest extreme (pure white in light, pure black in dark)
  - Step 13: darkest extreme (near-black in light, near-white in dark)
- OKLCH for perceptual uniformity across hues
- Runtime JS generator for dynamic accent — extends existing Radix generator to output 0 and 13
- Semantic aliases as the primary consumer API (see Emphasis Scale table below)
- Dark mode: `.dark` class provides separate OKLCH values for steps 0-13
- Tailwind's default color palette is removed entirely
- All intent scales (neutral, brand, accent, danger, success, warning, info) use 0-13

### 2. Intent/Emphasis System: Tailwind @utility Directives

Intent and emphasis are defined as Tailwind utilities via `@utility` for full IDE integration.

#### Intent Utilities

Set `--intent-*` CSS custom properties — children inherit via cascade:

```css
@utility intent-accent {
  --intent-surface-default: var(--color-accent-1);
  --intent-surface-subtler: var(--color-accent-2);
  --intent-surface-subtle: var(--color-accent-3);
  --intent-surface-strong: var(--color-accent-9);
  --intent-surface-inverted: var(--color-accent-12);
  --intent-border-subtler: var(--color-accent-5);
  --intent-border-subtle: var(--color-accent-6);
  --intent-border-default: var(--color-accent-7);
  --intent-border-strong: var(--color-accent-9);
  --intent-fg-subtler: var(--color-accent-10);
  --intent-fg-subtle: var(--color-accent-11);
  --intent-fg-default: var(--color-accent-12);
  --intent-fg-strong: var(--color-accent-13);
  --intent-fg-inverted: var(--color-accent-0);
  /* Elevation surfaces (light mode defaults — .dark overrides swap these) */
  --intent-surface-raised: var(--color-accent-0);
  --intent-surface-sunken: var(--color-accent-2);
}
```

#### Emphasis Scale (Consistent Across Properties)

| Level    | Surface (bg) | Border  | Foreground     |
| -------- | ------------ | ------- | -------------- |
| subtler  | step 2       | step 5  | step 10        |
| subtle   | step 3       | step 6  | step 11        |
| default  | step 1       | step 7  | step 12        |
| strong   | step 9       | step 9  | step 13 + bold |
| inverted | step 12      | step 12 | step 0         |

Surface-only elevation variants:
| Level | Surface (bg) | Light mode | Dark mode |
|------------|---------------------|-------------|-------------|
| raised | step 0 + drop shadow| step 0 | step 2 |
| sunken | step 2 + inset shadow| step 2 | step 0 |
| overlay | scrim + backdrop blur| — | — |

Note: raised/sunken swap their step relative to default in dark mode (raised is lighter, sunken is darker).

#### Emphasis Utilities

Naming convention: `emphasis-{level}-{property}` for primitives, `emphasis-{level}` for shortcuts.

Property-specific primitives (composable):

```css
@utility emphasis-strong-surface {
  background: var(--intent-surface-strong);
}
@utility emphasis-strong-fg {
  color: var(--intent-fg-strong);
  font-weight: 700;
}
@utility emphasis-inverted-fg {
  color: var(--intent-fg-inverted);
}
@utility emphasis-raised-surface {
  background: var(--intent-surface-raised);
  box-shadow: var(--elevation-raised);
}
```

Combined shortcuts (surface + fg together):

```css
@utility emphasis-strong {
  background: var(--intent-surface-strong);
  color: var(--intent-fg-inverted);
}
@utility emphasis-subtle {
  background: var(--intent-surface-subtle);
  color: var(--intent-fg-default);
}
@utility emphasis-raised {
  background: var(--intent-surface-raised);
  box-shadow: var(--elevation-raised);
  color: var(--intent-fg-default);
}
```

Note: `--intent-surface-raised` and `--intent-surface-sunken` are set per-mode in the intent utilities:

```css
/* In light mode (default): */
--intent-surface-raised: var(--color-{intent}-0);
--intent-surface-sunken: var(--color-{intent}-2);

/* In dark mode (.dark override): */
--intent-surface-raised: var(--color-{intent}-2);
--intent-surface-sunken: var(--color-{intent}-0);
```

#### Key Design Properties

- Components accept `intent` and `emphasis` as props (mapped to utility classes via CVA)
- Works with Tailwind variants: `hover:emphasis-strong`, `md:intent-accent`
- Default intent (neutral) set on `:root`
- All scales extended to 0-13 for consistency (0 = lightest extreme, 13 = darkest extreme)

### 3. Dark Mode: .dark Class with Variable Swaps

- Dark mode toggles CSS variable values at the root (`.dark` class)
- Color scales have separate light/dark definitions — the scale step numbers stay the same
- Since semantic aliases reference the scale steps, dark mode is automatic
- No `dark:` Tailwind variants needed for color-related styles
- Managed by `next-themes` in React; `.dark` class toggling in Vue
- `light-dark()` CSS function deferred until Australian browser coverage exceeds 99%

### 4. Component Primitives: Base UI

- Replace Ark UI with @base-ui/react for all interactive components
- Base UI provides unstyled, accessible primitives
- Styled via CVA + Tailwind utilities + intent/emphasis utilities

### 5. Layout: No Wrapper Components (Performance Principle)

- **View, Grid, Container are deprecated** — replaced by raw HTML elements + Tailwind classes
- Intent/emphasis utilities work directly on any element: `<div className="intent-accent emphasis-subtle flex gap-4">`
- Container pattern: use Tailwind's built-in `container` class
- Fewer component wrappers = faster rendering + smaller bundle
- Codemods provided for migration from View/Grid/Container to raw elements

### 6. Migration Strategy: Evolve in Place

- Major version bump for @oztix/roadie-core and @oztix/roadie-components
- Breaking change — PandaCSS removed entirely
- Existing v1 components (Button, View, Text, Heading, Container, etc.) reimplemented
- Some components may be deprecated if they don't fit the new architecture

### 7. Dynamic Accent Generation

- Radix-based JS generator (already working in ui-v2's `radix-generator.ts`)
- Takes a hex input, generates a full 0-13 step OKLCH scale (extending the Radix 1-12 with extremes)
- Injected as CSS custom properties at runtime (via ThemeProvider in React, or server-side for Vue)
- Neutrals, brand, and status colors (danger, success, warning, info) are fixed scales

### 8. Interaction Utility: `is-interactive`

Defined as a `@utility` providing sensible interaction defaults:

- `cursor: pointer`, smooth transitions for bg/border/color/shadow
- `:hover` — subtle brightness shift
- `:active` — scale(0.98) press effect
- `:focus-visible` — outline ring using `--intent-border`
- `:disabled` / `[data-disabled]` — opacity 0.5, pointer-events none
- Omit the class for custom interaction handling
- Emphasis utilities remain pure (colors only) — `is-interactive` layers behaviour on top

### 9. Typography: Text/Heading Components + Fluid Type Scale

- Text and Heading survive as React components for semantic elements and style combinations
- Font-size CSS variables include responsive/fluid type scales (e.g., `clamp()` based) so sizing adapts automatically
- Fluid type registered via `@theme` for Tailwind utility generation (`text-sm`, `text-lg`, etc.)

### 10. Class Utilities: cn() + tailwind-merge

- `cn()` helper (clsx + tailwind-merge) for class deduplication
- Required for View/Grid layout primitives where user classes may overlap with default classes
- Both prototypes already use this pattern — standardise as a core export

## Monorepo Structure (Proposed)

```
/packages/core/         - CSS foundation: roadie.css (tokens, @utility definitions)
                          Tailwind @theme config for consuming projects
                          JS color generator for dynamic accent
/packages/components/   - React components: Base UI + CVA + Tailwind
/packages/icons/        - Icon package
/docs/                  - Documentation site
```

## What Needs to Change

### packages/core

- [ ] Remove PandaCSS preset, recipes, patterns
- [ ] Build `roadie.css` using Tailwind v4 features:
  - `@theme` for token registration (kills default palette)
  - `@utility` for intent classes (intent-neutral, intent-accent, intent-brand, etc.)
  - `@utility` for emphasis classes (emphasis-strong, emphasis-default, emphasis-subtle, emphasis-subtler)
  - `@utility` for `is-interactive` (hover, active, focus, disabled defaults)
  - CSS custom properties for all color scales (light + dark via `.dark`)
- [ ] Port color generator from ui-v2 (Radix OKLCH scale generator)
- [ ] Export JS utilities for dynamic accent injection
- [ ] Define all color scales in OKLCH (light + dark variants, 0-13 per intent)
- [ ] Define fluid type scale via `@theme` (responsive font-size variables)
- [ ] Export `cn()` utility (clsx + tailwind-merge)
- [ ] Provide compiled CSS output for Vue consumers

### packages/components

- [ ] Remove all PandaCSS imports (`@oztix/roadie-core/css`, `/recipes`, `/jsx`)
- [ ] Replace Ark UI with Base UI
- [ ] Rewrite components with CVA + Tailwind + intent/emphasis utilities
- [ ] Keep View, add Grid as layout primitives
- [ ] Update tests for new component APIs
- [ ] Add new components as needed (from ui-v2 prototypes: Button, Badge, Card, Field, Input, Select, Combobox, etc.)

### Build System

- [ ] Remove PandaCSS from build pipeline
- [ ] Add Tailwind CSS v4 + PostCSS
- [ ] Update tsup config for new entry points
- [ ] Ensure tree-shaking still works
- [ ] Add compiled CSS output step for Vue consumers

### Documentation

- [ ] Update docs site to use Tailwind
- [ ] Document intent/emphasis system with examples
- [ ] Document color scale and dynamic accent usage
- [ ] Provide Vue integration guide (import compiled CSS + use classes)

## Resolved Questions

1. **View component**: Keep as core layout primitive with intent/emphasis props. Add Grid component alongside it.

2. **Tailwind plugin vs CSS file**: Use `@utility` directives (Tailwind v4 native) — no plugin needed. Full autocomplete, automatic layer placement, variant support. Compiles to regular CSS for Vue.

3. **Color scale format**: Radix 1-12 with OKLCH. Semantic aliases (surface, border, fg with modifiers) are the primary consumer API. Tailwind default colors removed.

4. **Dark mode strategy**: `.dark` class with CSS variable swaps. `light-dark()` deferred for browser support reasons.

5. **Text/Heading components**: Keep as React components for semantic elements, style combinations, and string highlighting. Responsive type scales should be built into the font-size CSS variables (fluid type) so they work automatically.

6. **Vue integration**: Vue app sets up Tailwind v4 and imports the Roadie `@theme` config + `roadie.css`. Gets full Tailwind utilities plus intent/emphasis system. Same DX as React minus the component library.

7. **Interaction utilities**: `is-interactive` survives as a `@utility` — provides sensible defaults for cursor, transitions, hover brightness, active scale, focus ring, and disabled state. Components include it for standard interactions; omit it for custom behaviour. Emphasis utilities stay pure (colors only).

8. **V1 components**: All carry forward (SpotIllustration, Mark, Highlight, Code). SpotIllustrations should use a namespaced export (e.g., `SpotIllustration.TicketScan` or a sub-path import) so they don't pollute the top-level export alongside core components like Button.

## Open Questions

None — all questions resolved. Ready for planning.
