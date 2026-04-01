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

Work on branch `feature/v2-tailwind-migration` (~47 commits from `main`).

## Implementation Phases

### Phase 1: Core Foundation — COMPLETE

- [x] Spike: validate `@utility` + CSS custom property scoping + `.dark &` nesting
- [x] `tokens.css` — 8 color scales (0-13) in OKLCH (neutral, brand, brand-secondary/orange, accent, danger, success, warning, info), light + dark. Elevation shadows. Typography tokens. Illustration color tokens (fixed, don't change in dark mode).
- [x] `intents.css` — 7 `@utility` intent directives with dark mode raised/sunken swap. Raw scale steps `--intent-0` through `--intent-13` exposed for granular access.
- [x] `emphasis.css` — Property-specific primitives (`emphasis-{level}-{surface|fg|border}`) + combined shortcuts (`emphasis-{level}`). Hover/active/focus-visible states per emphasis using intent scale steps. `emphasis-default` includes border. Dark mode uses lighter border (step 7).
- [x] `typography.css` — Text style `@utility` composites (display-ui-1–6, display-prose-1–6, text-ui, text-prose, text-code)
- [x] `interactions.css` — `is-interactive` utility with transitions, active scale, semi-transparent focus ring via `color-mix(in oklch)` (30% light / 20% dark)
- [x] `layout.css` — `view` utility (flex column + min-h/w 0 for migration)
- [x] `reset.css` — Modern CSS reset with body defaults, font smoothing, text wrapping, inline code word-break
- [x] `fonts.css` — Intermission + IBM Plex Mono font-face
- [x] `roadie.css` — Main entry importing all above + tailwindcss
- [x] `radix-generator.ts` — Extended 0-13 OKLCH scale generator with WCAG contrast check
- [x] `contrast.ts` + `cn.ts` — Utilities
- [x] Package setup: exports map, tsup config, build scripts
- [x] Old PandaCSS/token system fully removed (presets, recipes, patterns, types, token JSON, build scripts, ESLint plugin)

### Phase 2: Component Migration — COMPLETE

**Original v1 components (7 migrated):**

- [x] Button + IconButton — Base UI + CVA (intent, emphasis, size + icon variants). Default intent=neutral.
- [x] Text — semantic `<p>` with CVA (intent, emphasis, size)
- [x] Heading — semantic h1-h6 with CVA (intent, emphasis, size, level)
- [x] Code — `<code>` with CVA (intent, emphasis). Default emphasis=default.
- [x] Mark — `<mark>` with intent + emphasis styling
- [x] Highlight — reimplemented useHighlight in-house
- [x] SpotIllustration — inline styles using `--color-illustration-*` tokens (fixed colors, don't change in dark mode)
- [x] ThemeProvider — dynamic accent via generateRadixScale + SSR-safe getAccentStyleTag()
- [x] View/Container/hooks deprecated and removed

**New components (11 added):**

- [x] Badge — intent/emphasis/size, indicator with pulse, icons as children via `[&_svg]:size-[1em]`
- [x] Card — generic card with Header/Content/Footer (emphasis: raised/subtle/default)
- [x] Input — styled text input with intent/emphasis/size
- [x] Textarea — styled textarea with same variant system
- [x] Field — compound form field (Label, Input, Textarea, HelperText, ErrorText)
- [x] Select — Base UI Select with trigger/popup/item
- [x] RadioGroup — Base UI Radio with default/card appearances
- [x] Fieldset — form grouping with Legend, HelperText, ErrorText
- [x] Accordion — Base UI Collapsible with single/multiple + default/contained
- [x] Breadcrumb — semantic nav with List/Item/Link/Separator/Current
- [x] Separator — horizontal/vertical divider

**Testing:** 156 tests across 20 test files, all passing.

### Phase 3: Documentation Site — COMPLETE

- [x] Removed PandaCSS (config, generated artifacts, dep)
- [x] Added Tailwind v4 + PostCSS, globals.css imports roadie.css + `@source` for component dist scanning
- [x] Migrated layout.tsx (body uses `bg-neutral-1 text-neutral-12`), mdx-components.tsx, all shared components
- [x] Replaced all Lucide icons with Phosphor (`@phosphor-icons/react`, `weight='bold'`). Server components use `/ssr` import.
- [x] All component pages have live examples via `tsx-live` code fence. CodePreview scope includes all components + SpotIllustrations + 18 Phosphor icons.
- [x] MDX tables wrapped in `overflow-x-auto`. Mobile-responsive code blocks with `min-w-0`, responsive text/padding.
- [x] Foundations pages: Colors (interactive scale visualization + emphasis demo), Typography (fluid type table + text style reference), Spacing (visual bar chart)
- [x] Token pages: Overview (intent/emphasis architecture) + Reference (color scales, semantic tokens, typography, elevation)
- [x] 29 pages building successfully as static content
- [x] AGENTS.md rewritten for v2 architecture

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
5. **All components default to `emphasis='default'`** and `intent='neutral'`.
6. **Button text uses `emphasis-subtle-fg`** (step 11) for visible intent color on non-strong buttons.
7. **Strong emphasis hover uses `filter: brightness()`** — works on any intent's solid color. Other emphasis levels use raw intent steps for hover/active.
8. **Focus rings use `color-mix(in oklch, var(--intent-9) 30%, transparent)`** in light, 20% in dark.
9. **SpotIllustration colors are fixed** — hardcoded OKLCH in `@theme`, don't change in dark mode.
10. **`@source` directive required** in consumer CSS to scan component dist files.
11. **Icons: Phosphor with `weight='bold'`**. Use `/ssr` import for server components. Icons in Badge/Button are just children, not props.
12. **No `flex-row` utility** — standard Tailwind `flex flex-row` is sufficient. Only `view` (column) has a custom utility.
13. **CSS var names (`--intent-surface-strong`) don't match class naming pattern** — low priority, vars are internal plumbing.

## Sources & References

- **Brainstorm:** [docs/brainstorms/2026-03-31-tailwind-migration-brainstorm.md](../brainstorms/2026-03-31-tailwind-migration-brainstorm.md)
- **Branch:** `feature/v2-tailwind-migration`
- **Prototypes:** `packages/ui-v2/`, `/Users/lukebrooker/Code/prototype/`
- **Consumer analysis:** `/Users/lukebrooker/Code/ticketsolutions.oztix.website/` (Oztix Website)
- **Migration plan:** `/Users/lukebrooker/.claude/plans/piped-jingling-kite.md`
