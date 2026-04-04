# Roadie Design System - Agent Instructions

This file provides guidance to AI coding agents when working with code in this repository.

## Repository Overview

Roadie is a design system for Oztix's applications, built as a monorepo using pnpm workspaces and Turborepo. It provides CSS design tokens, a React component library, and documentation.

**Tech Stack:**
- Package Manager: pnpm (use `corepack enable`)
- Build System: Turborepo
- Framework: React v19
- Component Primitives: @base-ui/react (for accessible interactive components)
- Icons: @phosphor-icons/react (use `@phosphor-icons/react/ssr` in server components)
- Styling: Tailwind CSS v4 with custom `@utility` directives
- Language: TypeScript v5 (strict mode)
- Documentation: Next.js v16 with MDX

**External Documentation:**
- Tailwind CSS v4: https://tailwindcss.com/docs
- Base UI: https://base-ui.com/
- Phosphor Icons: https://phosphoricons.com/

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
│   ├── tokens.css          # Color scales (OKLCH), typography, @theme registrations
│   ├── intents.css         # @utility intent-* (set color context)
│   ├── emphasis.css        # @utility emphasis-* (combined shortcuts)
│   ├── elevation.css       # Shadow scale, rim-light, inset shadows
│   ├── typography.css      # @utility text-display-*, text-ui, text-prose
│   ├── layout.css          # @utility view (flex column layout primitive)
│   ├── interactions.css    # @utility is-interactive (hover/focus/disabled)
│   ├── fonts.css           # @font-face declarations
│   └── safelist.html       # Ensures all utilities in compiled CSS output
├── colors/
│   ├── color-scale-generator.ts  # OKLCH curve-based scale from hex input
│   └── contrast.ts               # WCAG contrast check
├── utils/
│   └── cn.ts               # clsx + tailwind-merge (with semantic color config)
└── index.ts                # JS re-exports
```

### Components Package (`packages/components/`)

```
src/
├── components/
│   ├── Button/             # Base UI Button + CVA
│   ├── Code/               # Inline code with emphasis
│   ├── Mark/               # Highlighted text with intent
│   ├── Highlight/          # String highlighting (in-house useHighlight)
│   ├── Prose/              # Rich content container (sm/md/lg)
│   ├── Card/               # Card with elevation
│   ├── Badge/              # Status badges
│   ├── Accordion/          # Collapsible sections
│   ├── Breadcrumb/         # Navigation breadcrumbs
│   ├── Separator/          # Visual divider
│   ├── Input/              # Text input
│   ├── Textarea/           # Multi-line input
│   ├── Select/             # Dropdown select
│   ├── Field/              # Form field (label + input + helper)
│   ├── Fieldset/           # Form group
│   ├── RadioGroup/         # Radio button group
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

## Architecture: Color Utility System

Three Tailwind-native utility namespaces, each scoped to its own CSS property:

### Color utilities

| Utility | CSS property | Example |
|---------|-------------|---------|
| `bg-normal` | `background-color` | Page background |
| `bg-subtle` | `background-color` | Tinted surface |
| `bg-raised` | `background-color` | Elevated card |
| `bg-sunken` | `background-color` | Recessed area |
| `text-normal` | `color` | Body text |
| `text-subtle` | `color` | Secondary text |
| `text-strong` | `color` | Headings |
| `border-subtle` | `border-color` | Dividers |
| `border-normal` | `border-color` | Standard borders |
| `divide-subtler` | children border-color | Table rows |

These are generated from `@theme inline` in `tokens.css` using Tailwind's utility-specific namespaces (`--background-color-*`, `--text-color-*`, `--border-color-*`).

Default Tailwind color utilities (bg-red-500, text-blue-300 etc.) are disabled via `--color-*: initial`.

### Intent (color context)

Sets `--intent-*` CSS custom properties. Children inherit via cascade.

```html
<div class="intent-accent">
  <button class="emphasis-strong is-interactive rounded-full px-4 py-2">
    Accent button
  </button>
</div>
```

**Available intents:** `neutral` (default on :root), `brand`, `accent`, `danger`, `success`, `warning`, `info`

Each intent exposes:
- Semantic vars: `--intent-bg-*`, `--intent-border-*`, `--intent-text-*`
- Raw scale steps: `--intent-0` through `--intent-13`
- Hue for tinted shadows: `--intent-hue`

### Emphasis (combined shortcuts)

Presets combining bg + text + border + interactive states:

- `emphasis-strong` — solid bg, inverted text, rim-light
- `emphasis-normal` — normal bg, visible border
- `emphasis-subtle` — tinted bg, transparent border
- `emphasis-subtler` — barely tinted, transparent when interactive
- `emphasis-raised` — raised bg, rim-light-strong, shadow-md
- `emphasis-sunken` — sunken bg, inset shadow
- `emphasis-floating` — raised bg, rim-light-strong, shadow-xl
- `emphasis-inverted` — inverted bg + text
- `emphasis-overlay` — dark overlay with backdrop blur

### Interaction states

`is-interactive` provides: cursor, transitions, active scale, focus ring, disabled state.
`is-field-interactive` provides: state-based color transitions (neutral→accent→danger).

### Elevation / Shadows

Intent-tinted shadows using `oklch()` with `var(--intent-hue)`:

- `shadow-xs` through `shadow-2xl` — Tailwind standard names, tinted with intent
- `inset-shadow-xs`, `inset-shadow-sm` — for sunken surfaces
- `rim-light` scale: `--rim-light-subtler`, `--rim-light-subtle`, `--rim-light-default`, `--rim-light-strong`

### Color Scale

CSS-native OKLCH scales parameterized by `--accent-hue` and `--accent-chroma`:
- 14 steps (0-13) per intent
- Neutral scale tinted with accent hue
- Dark mode swaps values via `.dark` class — no `dark:` variants needed

### Layout

Default to `grid`. Use `gap`, not `margin`. Set constraints, not fixed dimensions.

- **Grid = parent controls sizing.** Use for vertical stacks, columns, centering. Default for most layouts.
- **Flex = children control sizing.** Use for tags, nav items, wrapping rows where items size themselves.

```html
<!-- Vertical stack (default) -->
<div class="grid gap-4">...</div>

<!-- Centered content -->
<div class="grid place-content-center">...</div>

<!-- Columns -->
<div class="grid grid-cols-3 gap-4">...</div>

<!-- Content-driven row -->
<div class="flex gap-4 items-center">...</div>

<!-- Wrapping tags -->
<div class="flex flex-wrap gap-2">...</div>
```

> The `view` utility (flex column + min-h/w 0) is still available but `grid gap-*` is the default vertical stack.

### Shape (border-radius)

Consistent radius tiers across all components:

| Tier | Class | Use for |
|------|-------|---------|
| Inline | `rounded-sm` | Marks, highlights |
| Small | `rounded-md` | Code, prose images |
| Field | `rounded-lg` | Inputs, textareas, selects |
| Container | `rounded-xl` | Cards, popovers, select popups |
| Large | `rounded-2xl` | Modals, dialogs |
| Full | `rounded-full` | Buttons, badges, pills |

### Iconography

- **Library:** Phosphor Icons (`@phosphor-icons/react`)
- **Weight:** Always `bold`. Use `fill` only for active/selected states.
- **Import convention:** Use the `Icon` suffix export — `import { HeartIcon } from '@phosphor-icons/react/ssr'` (bare names like `Heart` are deprecated)
- **SSR:** Use `@phosphor-icons/react/ssr` in server components, `@phosphor-icons/react` in client components
- **Sizing:** XS=`size-3` (badges, tags), SM=`size-4` (buttons, inline — default), MD=`size-5` (nav, standalone), LG=`size-6` (headers, cards). Use Tailwind `className`, not the Phosphor `size` prop.
- **Color:** Icons inherit `currentColor`. Use `text-*` utilities.

### Typography

Two font families: **Intermission** (sans-serif, `font-sans`) and **IBM Plex Mono** (`font-mono`).

Two display style families:
- `text-display-ui-1` through `text-display-ui-6` — bold, for UI headings
- `text-display-prose-1` through `text-display-prose-6` — heavier weights, for long-form content

Sizes `text-lg` and above use `clamp()` for fluid scaling — no manual breakpoint overrides needed.

Use raw HTML elements with utility classes:

```html
<!-- Headings -->
<h1 class="text-display-prose-1 text-strong">Page title</h1>
<h2 class="text-display-ui-3 text-strong">Section</h2>

<!-- Body text -->
<p>Default body text</p>
<p class="text-subtle text-sm">Secondary text</p>

<!-- Rich content -->
<Prose size="md">
  <h2>Article</h2>
  <p>Rendered markdown or CMS content</p>
</Prose>
```

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
    },
    emphasis: {
      strong: 'emphasis-strong',
      normal: 'emphasis-normal text-subtle',
      subtle: 'emphasis-subtle text-subtle',
      subtler: 'emphasis-subtler text-subtle',
    },
    size: { sm: 'h-8 px-3', md: 'h-10 px-4', lg: 'h-12 px-6' },
  },
  defaultVariants: { emphasis: 'normal', size: 'md' },
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
2. **Emphasis shortcuts = combined presets.** bg + text + border + hover states.
3. **Individual properties = Tailwind utilities.** `bg-normal`, `text-subtle`, `border-subtle`.
4. **Default intent is neutral.** Set on `:root` — no class needed.
5. **Components inherit intent from context.** Don't set a default intent in `defaultVariants`. Intent flows via CSS cascade.
6. **No Text or Heading components.** Use raw `<p>`, `<h1>`-`<h6>` with utility classes.
7. **Prose component** for CMS/markdown content. Has `size` prop (sm/md/lg).
8. **Grid-first layout.** Use `<div class="grid gap-4">` for vertical stacks — not `flex flex-col`.
9. **SpotIllustration colors are fixed** — they don't change in dark mode.
10. **`@source` directive required** in consumer CSS to scan component dist files.

## Styling Rules

1. Use `grid` for layout by default, `flex` when children should control sizing
2. Use `bg-*`, `text-*`, `border-*` for semantic colors
3. Use emphasis shortcuts for interactive elements
4. Never hardcode colors — use tokens
5. Prefer `gap` over `margin`
6. Use raw `<p>`, `<h1>`-`<h6>`, `<span>` for text — no wrapper components
7. Use sentence case for content

## Testing

- Vitest + React Testing Library
- Tests co-located with components
- Assert CVA class names (e.g., `intent-brand`, `emphasis-strong`)
- Behaviour assertions preferred over class snapshots

## Code Quality

- ESLint with TypeScript + React + Prettier
- Prettier: single quotes, no semicolons, 2 spaces, 80 chars + Tailwind class sorting plugin
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
- Body defaults from reset: `bg-normal`, `text-normal`, `font-body`, `leading-ui`

### Foundation docs (detailed styling guidance)

For detailed guidance on styling conventions, read the foundation pages:

- Layout: `docs/src/app/foundations/layout/page.tsx`
- Typography: `docs/src/app/foundations/typography/page.tsx`
- Shape: `docs/src/app/foundations/shape/page.tsx`
- Interactions: `docs/src/app/foundations/interactions/page.tsx`
- Colors: `docs/src/app/foundations/colors/page.tsx`
- Elevation: `docs/src/app/foundations/elevation/page.tsx`
- Iconography: `docs/src/app/foundations/iconography/page.tsx`

### Guideline component (docs-only)

Use `<Guideline>` with `<Guideline.Do>` and `<Guideline.Dont>` for do/don't patterns in foundation docs. Supports `example` (rendered JSX) and `code` (code string) props. Located at `docs/src/components/Guideline.tsx`.

### Component doc structure

Follow `docs/COMPONENT_DOC_TEMPLATE.md` for all component documentation. Key rules:

1. One-line description — say what it *is*, not "The X component is..."
2. Section order: Import → Examples (Default → Variants → Emphasis → Sizes → Intents → States → Composition → With [Feature]) → Guidelines → PropsDefinitions
3. Only include sections that apply to the component
4. **No Intents section on form controls** (Input, Textarea, Select, Field, RadioGroup) — `is-field-interactive` manages state colours (neutral→accent→danger)
5. States section for interactive components — show all states in one example with `<p className='text-sm text-subtle'>` labels
6. Default example first — simplest usage, no props
7. No duplicate examples — if disabled is in States, don't add a separate Disabled section

### Interaction utilities

- `is-interactive` — for buttons, cards, clickable elements. Provides cursor, transitions, active scale, focus ring, disabled state. Pair with emphasis shortcuts.
- `is-field-interactive` — for form inputs. Provides state-based colour transitions: neutral at rest → accent on focus → danger when invalid.
