# Roadie Design System - Agent Instructions

This file provides guidance to AI coding agents when working with code in this repository.

## Repository Overview

Roadie is a design system for Oztix's applications, built as a monorepo using pnpm workspaces and Turborepo. It provides CSS design tokens, a React component library, and documentation.

**Tech Stack:**
- Package Manager: pnpm (use `corepack enable`)
- Build System: Turborepo
- Framework: React v19
- Component Primitives: @base-ui/react (for accessible interactive components)
- Styling: Tailwind CSS v4 with custom `@utility` directives
- Language: TypeScript v5 (strict mode)
- Documentation: Next.js v16 with MDX

**External Documentation:**
- Tailwind CSS v4: https://tailwindcss.com/docs
- Base UI: https://base-ui.com/

## Monorepo Structure

```
/packages/core/         - CSS foundation, color generator, utilities (@oztix/roadie-core)
/packages/components/   - React component library (@oztix/roadie-components)
/packages/icons/        - Icon package (coming soon)
/docs/                  - Documentation site (Next.js + MDX)
```

### Core Package (`packages/core/`)

```
src/
├── css/
│   ├── roadie.css          # Main entry (imports all below + tailwindcss)
│   ├── reset.css           # CSS reset and global defaults
│   ├── tokens.css          # Color scales (OKLCH), typography, elevation
│   ├── intents.css         # @utility intent-* (set color context)
│   ├── emphasis.css        # @utility emphasis-* (visual presentation)
│   ├── typography.css      # @utility text-display-*, text-ui, text-prose
│   ├── layout.css          # @utility view (flex column layout primitive)
│   ├── interactions.css    # @utility is-interactive (hover/focus/disabled)
│   ├── fonts.css           # @font-face declarations
│   └── safelist.html       # Ensures all utilities in compiled CSS output
├── colors/
│   ├── radix-generator.ts  # Dynamic 0-13 OKLCH scale from hex input
│   └── contrast.ts         # WCAG contrast check
├── utils/
│   └── cn.ts               # clsx + tailwind-merge helper
└── index.ts                # JS re-exports
```

### Components Package (`packages/components/`)

```
src/
├── components/
│   ├── Button/             # Base UI Button + CVA
│   ├── Text/               # Semantic <p> with emphasis/size
│   ├── Heading/            # Semantic h1-h6 with level/emphasis/size
│   ├── Code/               # Inline code with emphasis
│   ├── Mark/               # Highlighted text with intent
│   ├── Highlight/          # String highlighting (in-house useHighlight)
│   └── SpotIllustration/   # Themed SVG illustrations
├── providers/
│   └── ThemeProvider.tsx    # Dynamic accent color + dark mode
└── index.tsx               # Component re-exports
```

## Common Commands

```bash
pnpm dev                    # Start all packages in dev mode
pnpm build                  # Build all packages
pnpm test                   # Run tests across all packages
pnpm typecheck              # TypeScript type checking
pnpm lint                   # ESLint
pnpm format                 # Prettier

# Package-specific
pnpm --filter @oztix/roadie-core build
pnpm --filter @oztix/roadie-components test
pnpm --filter docs dev
```

## Architecture: Intent/Emphasis System

The styling system has two layers, both defined as Tailwind `@utility` directives:

### Intent (color context)

Sets `--intent-*` CSS custom properties. Children inherit via cascade.

```html
<!-- Set intent on a container or directly on the element -->
<div class="intent-accent">
  <button class="emphasis-strong is-interactive rounded-full px-4 py-2">
    Accent button
  </button>
</div>
```

**Available intents:** `neutral` (default on :root), `brand`, `accent`, `danger`, `success`, `warning`, `info`

Each intent exposes:
- Semantic vars: `--intent-surface-*`, `--intent-border-*`, `--intent-fg-*`
- Raw scale steps: `--intent-0` through `--intent-13`

### Emphasis (visual presentation)

Consumes `--intent-*` vars. Two forms:

**Shortcuts** (surface + fg): `emphasis-strong`, `emphasis-subtle`, `emphasis-subtler`, `emphasis-default`, `emphasis-raised`, `emphasis-sunken`

**Property-specific** (composable): `emphasis-strong-surface`, `emphasis-subtle-fg`, `emphasis-default-border`

Naming convention: `emphasis-{level}` (shortcut) or `emphasis-{level}-{property}` (specific). Drop the last segment = shortcut.

### Interaction states

Emphasis shortcuts include hover/active/focus-visible states using intent color scale steps:
- `emphasis-strong`: hover → step 10, active → step 11
- `emphasis-subtle`: hover → step 4, active → step 5
- `emphasis-subtler`: transparent by default when interactive, hover → step 2

`is-interactive` provides: cursor, transitions, active scale, focus ring (semi-transparent via color-mix), disabled state.

### Color Scale

Extended Radix 0-13 OKLCH per intent (7 intents + brand-secondary):
- Steps 1-12: Radix scale
- Step 0: lightest extreme
- Step 13: darkest extreme
- Neutral strong uses step 12 (near-black/white)

### Dark Mode

`.dark` class on `<html>` swaps OKLCH values. No `dark:` Tailwind variants needed for colors. Intent/emphasis utilities automatically adapt.

Focus rings use `color-mix(in oklch, var(--intent-9) 30%, transparent)` in light, 20% in dark.

## Component Patterns

### Creating a component with CVA

```tsx
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@oztix/roadie-core/utils'

export const buttonVariants = cva('base-classes is-interactive', {
  variants: {
    intent: {
      neutral: 'intent-neutral',
      brand: 'intent-brand',
      accent: 'intent-accent',
      // ... all 7 intents
    },
    emphasis: {
      strong: 'emphasis-strong',
      default: 'emphasis-default-surface emphasis-subtle-fg emphasis-subtle-border',
      subtle: 'emphasis-subtle emphasis-subtle-fg',
      subtler: 'emphasis-subtler emphasis-subtle-fg',
    },
    size: { sm: 'h-8 px-3', md: 'h-10 px-4', lg: 'h-12 px-6' },
  },
  defaultVariants: { intent: 'neutral', emphasis: 'default', size: 'md' },
})
```

### Consumer setup

```css
/* app/globals.css */
@import '@oztix/roadie-core/css';

/* For docs/apps using components, scan dist for class strings: */
@source "../../node_modules/@oztix/roadie-components/dist";
```

### Key rules

1. **Intent = which color palette.** Only sets CSS custom properties. No visual presentation.
2. **Emphasis = how colors are applied.** Consumes intent vars for bg, fg, border, hover states.
3. **Default intent is neutral.** No class needed — set on `:root`.
4. **Button default intent is neutral** (not brand).
5. **Button text uses `emphasis-subtle-fg`** (step 11) for visible intent color on non-strong buttons.
6. **No layout wrapper components.** View/Container/Grid are deprecated. Use `<div class="view gap-4">` or raw Tailwind classes.
7. **`view` utility** = flex column with min-h/w 0 (flexbox overflow fix). Migration helper for `<View>`.
8. **SpotIllustration colors are fixed** — they don't change in dark mode. Defined as `--color-illustration-*` tokens.
9. **`@source` directive required** in consumer CSS to scan component dist files for Tailwind class strings.

## Styling Rules

1. Use Tailwind utilities for layout and spacing (`flex`, `gap-4`, `p-2`, `grid`)
2. Use intent/emphasis for colors — not raw scale steps
3. Never hardcode colors — use tokens
4. Prefer `gap` over `margin`
5. Use `Text` for body text, `Heading` for headings, `Code` for code
6. Use sentence case for content

## Testing

- Vitest + React Testing Library
- Tests co-located with components
- Assert CVA class names (e.g., `intent-brand`, `emphasis-strong`)
- Behaviour assertions preferred over class snapshots

## Code Quality

- ESLint with TypeScript + React + Prettier
- Prettier: single quotes, no semicolons, 2 spaces, 80 chars
- TypeScript strict mode, no `any`

## Build Pipeline

```
core:build → components:build → docs:build
```

- Core: `tsup` (JS) + `tailwindcss` CLI (compiled CSS)
- Components: `tsup` (ESM, code-splitting, tree-shaking)
- Docs: Next.js static build

## Documentation Site

- Docs at: https://ticketsolutionsptyltd.github.io/roadie/
- Live code examples use `tsx-live` code fence language tag
- CodePreview scope includes all components + SpotIllustrations
- MDX tables wrapped in overflow-x-auto container
- Body uses `bg-neutral-1 text-neutral-12` for dark mode support
