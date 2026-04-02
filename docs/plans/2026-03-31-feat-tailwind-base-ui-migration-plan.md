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

Work on branch `feature/v2-tailwind-migration` (~80 commits from `main`).

## Implementation Phases

### Phase 1: Core Foundation — COMPLETE

- [x] Spike: validate `@utility` + CSS custom property scoping + `.dark &` nesting
- [x] `tokens.css` — 8 color scales (0-13) in OKLCH (neutral, brand, brand-secondary/orange, accent, danger, success, warning, info), light + dark. Elevation shadows. Typography tokens. Illustration color tokens (fixed, don't change in dark mode). Semantic color namespaces (`--background-color-*`, `--text-color-*`, `--border-color-*`) with default Tailwind color utilities disabled (`--color-*: initial`).
- [x] `intents.css` — 7 `@utility` intent directives with dark mode raised/sunken swap. Raw scale steps `--intent-0` through `--intent-13` exposed for granular access.
- [x] `emphasis.css` — Property-specific primitives (`emphasis-{level}-{surface|fg|border}`) + combined shortcuts (`emphasis-{level}`). Hover/active/focus-visible states per emphasis using intent scale steps. `emphasis-default` includes border. Dark mode uses lighter border (step 7).
- [x] `elevation.css` — Intent-tinted shadows (shadow-xs through shadow-2xl) using `oklch()` with `var(--intent-hue)`. Inset shadows for sunken surfaces. Rim-light scale (`--rim-light-subtler` through `--rim-light-strong`).
- [x] `typography.css` — Text style `@utility` composites (display-ui-1–6, display-prose-1–6). Fluid scaling via `clamp()` for text-lg and above.
- [x] `interactions.css` — `is-interactive` utility with transitions, active scale, semi-transparent focus ring via `color-mix(in oklch)` (30% light / 20% dark). `is-field-interactive` for form inputs (neutral→accent→danger state transitions).
- [x] `layout.css` — `view` utility (flex column + min-h/w 0 for migration compatibility)
- [x] `reset.css` — Modern CSS reset with body defaults (`bg-default text-default font-sans leading-ui`), font smoothing, text wrapping, inline code word-break
- [x] `fonts.css` — Intermission + IBM Plex Mono font-face
- [x] `roadie.css` — Main entry importing all above + tailwindcss
- [x] `safelist.html` — Ensures all utilities appear in compiled CSS output
- [x] `radix-generator.ts` — Extended 0-13 OKLCH scale generator with WCAG contrast check
- [x] `contrast.ts` + `cn.ts` — Utilities
- [x] Package setup: exports map, tsup config, build scripts
- [x] Old PandaCSS/token system fully removed (presets, recipes, patterns, types, token JSON, build scripts, ESLint plugin)

### Phase 2: Component Migration — COMPLETE

**Original v1 components (migrated/evolved):**

- [x] Button + IconButton — Base UI + CVA (intent, emphasis, size + icon variants). Uses native `<button>` when no custom render prop.
- [x] Code — `<code>` with CVA (intent, emphasis). Default emphasis=default.
- [x] Mark — `<mark>` with intent + emphasis styling
- [x] Highlight — reimplemented useHighlight in-house
- [x] SpotIllustration — inline styles using `--color-illustration-*` tokens (fixed colors, don't change in dark mode)
- [x] ThemeProvider — dynamic accent via generateRadixScale + SSR-safe getAccentStyleTag()
- [x] View/Container/hooks deprecated and removed
- [x] **Text component removed** — replaced with raw `<p>`, `<span>` + utility classes
- [x] **Heading component removed** — replaced with raw `<h1>`-`<h6>` + `text-display-ui-*` / `text-display-prose-*` utilities

**New components (12 added):**

- [x] Prose — rich content container with `size` prop (sm/md/lg) for CMS/markdown
- [x] Badge — intent/emphasis/size, indicator with pulse, icons as children via `[&_svg]:size-[1em]`
- [x] Card — generic card with Header/Content/Footer (emphasis: raised/subtle/default)
- [x] Input — styled text input with `is-field-interactive`
- [x] Textarea — styled textarea with same variant system
- [x] Field — compound form field (Label, Input, Textarea, HelperText, ErrorText)
- [x] Select — Base UI Select with trigger/popup/item
- [x] RadioGroup — Base UI Radio with default/card appearances
- [x] Fieldset — form grouping with Legend, HelperText, ErrorText
- [x] Accordion — Base UI Collapsible with single/multiple + default/contained
- [x] Breadcrumb — semantic nav with List/Item/Link/Separator/Current
- [x] Separator — horizontal/vertical divider

**Key refactors during Phase 2:**

- Components no longer set a default intent — they inherit from CSS cascade context
- Grid-first layout adopted throughout (replaced `flex flex-col` stacks with `grid gap-*`)
- Tailwind Prettier plugin added for consistent class ordering

**Testing:** 139 tests across 18 test files, all passing.

### Phase 3: Documentation Site — COMPLETE

- [x] Removed PandaCSS (config, generated artifacts, dep)
- [x] Added Tailwind v4 + PostCSS, globals.css imports roadie.css + `@source` for component dist scanning
- [x] Migrated layout.tsx, mdx-components.tsx, all shared components. Body uses `bg-default text-default`.
- [x] Replaced all Lucide icons with Phosphor (`@phosphor-icons/react`, `weight='bold'`). Server components use `/ssr` import.
- [x] All component pages have live examples via `tsx-live` code fence. CodePreview scope includes all components + SpotIllustrations + 18 Phosphor icons.
- [x] MDX tables wrapped in `overflow-x-auto`. Mobile-responsive code blocks with `min-w-0`, responsive text/padding.
- [x] 6 Foundations pages: Colors, Typography (redone with fluid type table + text style reference), Layout (renamed from Spacing — grid-first guidelines, wrapping, sizing, container queries), Shape (border-radius tiers), Elevation (shadows + rim-light), Interactions (is-interactive + is-field-interactive)
- [x] Token pages: Overview (intent/emphasis architecture) + Reference (color scales, semantic tokens, typography, elevation)
- [x] Guideline component with `<Guideline.Do>` / `<Guideline.Dont>` subcomponents for do/don't patterns
- [x] 29 pages building successfully as static content
- [x] AGENTS.md fully rewritten for v2 architecture (updated twice — latest includes all conventions)

### Phase 4: Migration Guide + Codemods — TODO

Based on analysis of the Oztix Website (`TicketSolutions.Oztix.Website`):

- 496 View instances, 25 Containers, 43 colorPalette usages, 12+ sva() recipes, 40+ responsive objects

**Migration guide (`docs/migration-v2.md`):**

- [ ] Setup: remove PandaCSS, add Tailwind v4, import roadie.css, add @source
- [ ] View migration: `flexDirection='row'` → `flex flex-row`, `display='grid'` → `grid`, default → `view`, complex → map props to Tailwind
- [ ] Container migration → Tailwind `container` class
- [ ] `colorPalette` → `intent` prop rename (`information` → `info`)
- [ ] `data-color-mode='dark'` → `className="dark"`
- [ ] Spacing token map (PandaCSS `'200'`=16px → Tailwind `4`=16px)
- [ ] Responsive syntax → Tailwind breakpoint prefixes
- [ ] Color token map → intent/emphasis classes
- [ ] css()/sva()/cva()/styled() → Tailwind classes / CVA
- [ ] splitCssProps() → removed

**Codemods (jscodeshift):**

- [ ] View → div (with layout class mapping)
- [ ] Container → div with container class
- [ ] colorPalette → intent
- [ ] data-color-mode → dark class
- [ ] Spacing props → Tailwind classes
- [ ] PandaCSS import removal

### Phase 5: Polish + Release — TODO

- [ ] Vue integration guide
- [ ] Accessibility audit (contrast ratios, focus rings)
- [ ] CSS bundle size measurement
- [ ] Changesets + release (major version bump)
- [ ] Review and refine all new component APIs before release

## Key Architecture Decisions

These decisions were made during implementation and should be maintained:

1. **Intent = color context only.** Sets `--intent-*` CSS vars + raw `--intent-0` to `--intent-13`. No visual presentation.
2. **Emphasis = visual presentation.** Consumes intent vars. Includes hover/active/focus-visible states.
3. **Naming: `{concept}-{modifier}` shorthand, `{concept}-{modifier}-{property}` specific.** Drop the last segment = shortcut.
4. **emphasis-default includes a border** (`--intent-border-subtle`, step 7 in dark mode).
5. **Components inherit intent from CSS cascade.** No default intent in `defaultVariants` — intent flows via CSS custom properties.
6. **No Text or Heading components.** Use raw `<p>`, `<h1>`-`<h6>` with utility classes (`text-display-ui-*`, `text-display-prose-*`). Prose component for CMS/markdown content.
7. **Grid-first layout.** Use `grid gap-*` for vertical stacks. `flex` only when children should control sizing.
8. **Button text uses `emphasis-subtle-fg`** (step 11) for visible intent color on non-strong buttons.
9. **Strong emphasis hover uses `filter: brightness()`** — works on any intent's solid color. Other emphasis levels use raw intent steps for hover/active.
10. **Focus rings use `color-mix(in oklch, var(--intent-9) 30%, transparent)`** in light, 20% in dark.
11. **SpotIllustration colors are fixed** — hardcoded OKLCH in `@theme`, don't change in dark mode.
12. **`@source` directive required** in consumer CSS to scan component dist files.
13. **Icons: Phosphor with `weight='bold'`**. Use `/ssr` import for server components. Icons in Badge/Button are just children, not props.
14. **Shape tiers:** `rounded-sm` (inline) → `rounded-md` (small) → `rounded-lg` (field) → `rounded-xl` (container) → `rounded-2xl` (large) → `rounded-full` (buttons/badges).
15. **Elevation is intent-tinted** — shadows use `oklch()` with `var(--intent-hue)`. Rim-light scale for raised surfaces.
16. **Two interaction utilities:** `is-interactive` (buttons, cards) and `is-field-interactive` (form inputs with neutral→accent→danger state transitions).
17. **Semantic color utilities replace default Tailwind colors** — `bg-default`, `text-subtle`, `border-default` etc. Default Tailwind `--color-*` disabled.
18. **Fluid typography** — `text-lg` and above use `clamp()` for responsive scaling without breakpoint overrides.
19. **CSS var names (`--intent-surface-strong`) don't match class naming pattern** — low priority, vars are internal plumbing.

## Sources & References

- **Brainstorm:** [docs/brainstorms/2026-03-31-tailwind-migration-brainstorm.md](../brainstorms/2026-03-31-tailwind-migration-brainstorm.md)
- **Branch:** `feature/v2-tailwind-migration`
- **Prototypes:** `packages/ui-v2/`, `/Users/lukebrooker/Code/prototype/`
- **Consumer analysis:** `/Users/lukebrooker/Code/ticketsolutions.oztix.website/` (Oztix Website)
- **Migration plan:** `/Users/lukebrooker/.claude/plans/piped-jingling-kite.md`
