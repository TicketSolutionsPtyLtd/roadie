---
title: 'feat: Migrate design system from PandaCSS to Tailwind v4 + Base UI'
type: feat
status: active
date: 2026-03-31
updated: 2026-04-05
origin: docs/brainstorms/2026-03-31-tailwind-migration-brainstorm.md
---

# feat: Migrate Design System from PandaCSS to Tailwind v4 + Base UI

## Overview

Major v2 overhaul of the Roadie design system: replace PandaCSS with Tailwind CSS v4, replace Ark UI with Base UI, and introduce a Tailwind-native intent/emphasis semantic styling system using `@utility` directives. The system must serve React apps (full component library) and a legacy Vue app (tokens + utility classes).

Work on branch `feature/v2-tailwind-migration` (~98 commits from `main`).

## Implementation Phases

### Phase 1: Core Foundation — COMPLETE

- [x] Spike: validate `@utility` + CSS custom property scoping + `.dark &` nesting
- [x] `tokens.css` — 8 color scales (0-13) in OKLCH (neutral, brand, brand-secondary/orange, accent, danger, success, warning, info), light + dark. Elevation shadows. Typography tokens. Illustration color tokens (fixed, don't change in dark mode). Semantic color namespaces (`--background-color-*`, `--text-color-*`, `--border-color-*`) with default Tailwind color utilities disabled (`--color-*: initial`).
- [x] `intents.css` — 7 `@utility` intent directives with dark mode raised/sunken swap. Raw scale steps `--intent-0` through `--intent-13` exposed for granular access.
- [x] `emphasis.css` — Property-specific primitives (`emphasis-{level}-{surface|fg|border}`) + combined shortcuts (`emphasis-{level}`). Hover/active/focus-visible states per emphasis using intent scale steps. `emphasis-normal` includes border. Dark mode uses lighter border (step 7).
- [x] `elevation.css` — Intent-tinted shadows (shadow-xs through shadow-2xl) using `oklch()` with `var(--intent-hue)`. Inset shadows for sunken surfaces. Rim-light scale (`--rim-light-subtler` through `--rim-light-strong`).
- [x] `typography.css` — Text style `@utility` composites (display-ui-1-6, display-prose-1-6). Fluid scaling via `clamp()` for text-lg and above.
- [x] `interactions.css` — `is-interactive` utility with transitions, active scale, semi-transparent focus ring via `color-mix(in oklch)` (30% light / 20% dark). `is-interactive-field` for form inputs (neutral->accent->danger state transitions).
- [x] `motion.css` — Duration scale (`--duration-instant` through `--duration-slowest`), easing curves (`--ease-standard`, `--ease-enter`, `--ease-exit`, `--ease-spring` via `linear()`), keyframes (fade-in/out, scale-in/out), motion utilities (`motion-fade-in`, `motion-fade-out`, `motion-scale-in`, `motion-scale-out`), stagger token (`--stagger-base: 30ms`), `prefers-reduced-motion` global reset (0.01ms durations so JS events still fire).
- [x] `layout.css` — `view` utility (flex column + min-h/w 0 for migration compatibility)
- [x] `reset.css` — Modern CSS reset with body defaults (`bg-normal text-normal font-sans leading-ui`), font smoothing, text wrapping, inline code word-break
- [x] `fonts.css` — Intermission + IBM Plex Mono font-face
- [x] `roadie.css` — Main entry importing all 11 CSS modules + tailwindcss
- [x] `safelist.html` — Ensures all utilities appear in compiled CSS output
- [x] `radix-generator.ts` — Extended 0-13 OKLCH scale generator with WCAG contrast check
- [x] `contrast.ts` + `cn.ts` — Utilities
- [x] Package setup: exports map, tsup config, build scripts
- [x] Old PandaCSS/token system fully removed (presets, recipes, patterns, types, token JSON, build scripts, ESLint plugin)

### Phase 2: Component Migration — COMPLETE

**Original v1 components (migrated/evolved):**

- [x] Button + IconButton — Base UI + CVA (intent, emphasis, size + icon variants). Uses native `<button>` when no custom render prop.
- [x] Code — `<code>` with CVA (intent, emphasis). Default emphasis=normal.
- [x] Mark — `<mark>` with intent + emphasis styling
- [x] Highlight — reimplemented useHighlight in-house
- [x] SpotIllustration — inline styles using `--color-illustration-*` tokens (fixed colors, don't change in dark mode)
- [x] ThemeProvider — dynamic accent via generateRadixScale + SSR-safe getAccentStyleTag()
- [x] View/Container/hooks deprecated and removed
- [x] **Text component removed** — replaced with raw `<p>`, `<span>` + utility classes
- [x] **Heading component removed** — replaced with raw `<h1>`-`<h6>` + `text-display-ui-*` / `text-display-prose-*` utilities

**New components (13 added):**

- [x] Prose — rich content container with `size` prop (sm/md/lg) for CMS/markdown
- [x] Badge — intent/emphasis/size, indicator with pulse, icons as children via `[&_svg]:size-[1em]`
- [x] Card — generic card with Header/Content/Footer (emphasis: raised/subtle/normal)
- [x] Input — styled text input with `is-interactive-field`
- [x] Textarea — styled textarea with same variant system
- [x] Field — compound form field (Label, Input, Textarea, HelperText, ErrorText)
- [x] Select — Base UI Select with full sub-component API (Root/Trigger/Value/Icon/Portal/Positioner/Popup/Item/ItemText/ItemIndicator/Group/GroupLabel/Label/ScrollUpArrow/ScrollDownArrow)
- [x] Combobox — Base UI Combobox with full sub-component API (Root/Label/InputGroup/Input/Trigger/Clear/Portal/Positioner/Popup/List/Item/Collection/ItemIndicator/Group/GroupLabel/Empty/Status) + `useFilter` hook + `is-interactive-field-group` utility
- [x] RadioGroup — Base UI Radio with emphasis on Root (subtler/normal), items inherit via context
- [x] Fieldset — form grouping with Legend, HelperText, ErrorText
- [x] Accordion — Base UI Collapsible with single/multiple + emphasis (normal/subtle/subtler) + intent
- [x] Breadcrumb — semantic nav with List/Item/Link/Separator/Current
- [x] Separator — horizontal/vertical divider

**Key refactors during Phase 2:**

- Components no longer set a default intent — they inherit from CSS cascade context
- Grid-first layout adopted throughout (replaced `flex flex-col` stacks with `grid gap-*`)
- Tailwind Prettier plugin added for consistent class ordering
- Accordion `appearance` prop replaced with `emphasis` and `intent` for consistency
- Select enhanced from simple component to full sub-component API alongside Combobox
- All icon imports migrated to Icon suffix convention (`HeartIcon` not `Heart`)
- Emphasis `default` renamed to `normal` across all CSS, components, tests, and docs (strong → normal → subtle → subtler)
- RadioGroup `appearance` prop on Item refactored to `emphasis` on Root with context inheritance

**Testing:** 153 tests across 19 test files, all passing.

### Phase 3: Documentation Site — COMPLETE

- [x] Removed PandaCSS (config, generated artifacts, dep)
- [x] Added Tailwind v4 + PostCSS, globals.css imports roadie.css + `@source` for component dist scanning
- [x] Migrated layout.tsx, mdx-components.tsx, all shared components. Body uses `bg-normal text-normal`.
- [x] Replaced all Lucide icons with Phosphor (`@phosphor-icons/react`, `weight='bold'`). Server components use `/ssr` import. All imports use Icon suffix convention.
- [x] All component pages have live examples via `tsx-live` code fence. CodePreview scope includes all components + SpotIllustrations + Phosphor icons.
- [x] MDX tables wrapped in `overflow-x-auto`. Mobile-responsive code blocks with `min-w-0`, responsive text/padding.
- [x] 10 Foundation pages:
  - Colors — color system, intent scales, dark mode
  - Typography — redone with fluid type table + text style reference
  - Layout — renamed from Spacing, grid-first guidelines, wrapping, sizing, container queries
  - Shape — border-radius tiers, increased border-radius across components
  - Elevation — shadows + rim-light
  - Interactions — is-interactive + is-interactive-field
  - Motion — duration/easing tokens, keyframes, reduced motion, animation guidelines
  - Iconography — Phosphor icon library, sizing tiers, import conventions
  - Performance — Core Web Vitals, rendering, network, fonts
  - Accessibility — semantic HTML, ARIA, contrast, screen readers, testing checklist
- [x] Token pages: Overview (intent/emphasis architecture) + Reference (color scales, semantic tokens, typography, elevation)
- [x] Guideline component with `<Guideline.Do>` / `<Guideline.Dont>` subcomponents for do/don't patterns
- [x] Home page redesigned with component overview, skeletons, and categorized navigation
- [x] ~34 pages building successfully as static content
- [x] AGENTS.md fully rewritten for v2 architecture (updated multiple times — latest includes all conventions)

### Phase 4a: Migration Guide — COMPLETE

Based on analysis of the Oztix Website (`TicketSolutions.Oztix.Website`):

- 496 View instances, 25 Containers, 43 colorPalette usages, 12+ sva() recipes, 40+ responsive objects

**Migration guide (`docs/src/app/migration/page.tsx`):**

- [x] All code examples verified — no stale `default` references, uses `normal` throughout
- [x] RadioGroup listed as new component (no v1→v2 migration needed)
- [x] Component API change table accurate with current API

Setup:

- [x] Remove PandaCSS: uninstall `@pandacss/dev`, delete `panda.config.ts`, remove `styled-system/` generated dir
- [x] Add Tailwind v4: install `tailwindcss@4`, `@tailwindcss/postcss`
- [x] Import `@oztix/roadie-core/css` in app CSS entry
- [x] Add `@source "../../node_modules/@oztix/roadie-components/dist"` to scan component classes

Component migration:

- [x] View -> `div` with layout classes: `flexDirection='row'` -> `flex flex-row`, `display='grid'` -> `grid`, default -> `grid gap-*` (grid-first), complex -> map props to Tailwind
- [x] Container -> Tailwind `container` class or `mx-auto max-w-*`
- [x] Text -> raw `<p>`, `<span>` + utility classes (`text-sm`, `text-subtle`, etc.)
- [x] Heading -> raw `<h1>`-`<h6>` + `text-display-ui-*` / `text-display-prose-*`

Prop/API migration:

- [x] `colorPalette` -> `intent` prop rename (`information` -> `info`, `primary` -> `brand`)
- [x] `appearance` -> `emphasis` where applicable (RadioGroup: `appearance` on Item → `emphasis` on Root)
- [x] `data-color-mode='dark'` -> `className="dark"`

Token migration:

- [x] Spacing token map: PandaCSS `'200'`=16px -> Tailwind `4`=16px (full mapping table)
- [x] Color token map -> intent/emphasis classes
- [x] Responsive syntax -> Tailwind breakpoint prefixes (`{{ base: 'x', md: 'y' }}` -> `x md:y`)

CSS-in-JS removal:

- [x] `css()` -> Tailwind utility classes
- [x] `sva()` recipes -> CVA with Tailwind classes
- [x] `cva()` (PandaCSS version) -> CVA (class-variance-authority)
- [x] `styled()` -> raw elements + `cn()` utility
- [x] `splitCssProps()` -> removed (no longer needed)
- [x] PandaCSS import removal (`import { css, styled, ... } from 'styled-system/*'`)

Icons:

- [x] Lucide -> Phosphor (`@phosphor-icons/react`), `weight='bold'`, Icon suffix imports, sizing via `className` not `size` prop, SSR import path

New concepts (no v1 equivalent):

- [x] Emphasis system — full explanation of shortcuts replacing manual bg/text/border combinations
- [x] Motion tokens — `--duration-*`, `--ease-*`, keyframes, `motion-*` utilities
- [x] Combobox adoption guide
- [x] `is-interactive-field-group` for composite form controls
- [x] Shape tiers reference

Component API changes:

- [x] Table of all renamed/changed props across components
- [x] New sub-component APIs (Select, Combobox)
- [x] Removed components (View, Container, Text, Heading) with replacements

**Verified 2026-04-04:** All content uses `normal` naming. No stale references.

### Phase 4b: Codemods — TODO

jscodeshift transforms:

- [ ] View -> div (with layout class mapping)
- [ ] Container -> div with container class
- [ ] colorPalette -> intent (with value mapping)
- [ ] appearance -> emphasis
- [ ] data-color-mode -> dark class
- [ ] Spacing props -> Tailwind classes (with token value mapping)
- [ ] PandaCSS import removal
- [ ] Icon migration (Lucide -> Phosphor with Icon suffix)

### Phase 5a: API Review + Accessibility Audit — COMPLETE

API review:

- [x] Review all 18 component APIs for consistency (prop naming, sub-component patterns, defaults)
- [x] Verify Combobox and Select sub-component API naming is consistent
- [x] Check `is-interactive-field-group` is documented in Interactions foundation page
- [x] Review all component exports in `packages/components/src/index.tsx`
- [x] Add component-level accessibility sections to each component doc page (Accordion, Button, Input, Textarea, RadioGroup, Field, Breadcrumb)
- [x] Update `COMPONENT_DOC_TEMPLATE.md` with Accessibility section
- [x] Rename `is-field-interactive` → `is-interactive-field`, `is-field-group-interactive` → `is-interactive-field-group` (consistent prefix)
- [x] Rename `--rim-light-default` → `--rim-light-normal` in elevation CSS + docs
- [x] Fix remaining `default` → `normal` references in migration page + colors foundation

Accessibility audit:

- [x] Contrast ratios: all emphasis levels meet WCAG AA in light + dark (visual audit)
- [x] Focus rings: verify across all intents and emphasis levels (visual audit)
- [x] Reduced motion: verified `motion.css` global reset disables all transitions/animations via `!important`
- [ ] Keyboard navigation: manual test all interactive components (deferred — Base UI handles this)
- [ ] Screen reader testing: VoiceOver walkthrough (deferred — requires manual testing)

### Phase 5b: Dark Mode + Code Review — COMPLETE

Dark mode (commit `d226e35`):

- [x] CSS `color-scheme` dark mode with `getThemeScript()` for flash-free SSR
- [x] `ThemeProvider` with `followSystem`, `defaultDark`, `setDark`, localStorage persistence
- [x] Dark-mode-immune Mark with `-light` token layer (commit `f62fbca`)

Code review (commit `395507e`):

- [x] Fix Highlight `regex.test()` lastIndex bug — global flag caused incorrect alternating matches (replaced with non-global test regex + regression tests)
- [x] Normalize Badge `subtler` emphasis to use `emphasis-subtler` utility (was using raw `bg-subtler`, missed hover states)
- [x] Add Prose component tests (was the only untested component — 6 tests added)
- [x] Remove deprecated `useAccent()` hook (v2 breaking change, replaced by `useTheme()`)
- [x] Remove stale partial `components/index.ts` barrel (unused, missing 8 of 18 components)
- [x] Optimize ThemeProvider accent effect to skip regeneration when SSR values already match
- [x] Add font preconnect hints to Getting Started docs

**Open items from code review (needs triage):**

- [ ] Verify font format: `fonts.css` declares `format('woff2')` but file has `.woff` extension — check actual format on CDN
- [ ] Document or resolve form field intent cascade: `is-interactive-field` hardcodes accent for focus/invalid regardless of parent intent, while `is-interactive` respects intent cascade. Form controls expose `intent` CVA variants that change border/bg but focus ring stays accent. Decide: (a) document as intentional, (b) make field interactions intent-aware, or (c) remove intent variant from form controls
- [ ] Consider lazy-loading `colorjs.io` (~60-80KB) via dynamic import — most consumers use fixed accent and never need runtime generation

**Testing:** 179 tests across 21 test files, all passing. Full build (core → components → docs) succeeds.

### Phase 5c: Polish + Release — TODO

- [ ] Vue integration guide (tokens + utility classes only, no components)
- [ ] CSS bundle size measurement
- [ ] Changesets setup + major version bump (v2.0.0)
- [ ] Update README files
- [ ] Tag release, publish to npm
- [ ] Deploy updated docs site

## Key Architecture Decisions

These decisions were made during implementation and should be maintained:

1. **Intent = color context only.** Sets `--intent-*` CSS vars + raw `--intent-0` to `--intent-13`. No visual presentation.
2. **Emphasis = visual presentation.** Consumes intent vars. Includes hover/active/focus-visible states.
3. **Naming: `{concept}-{modifier}` shorthand, `{concept}-{modifier}-{property}` specific.** Drop the last segment = shortcut.
4. **emphasis-normal includes a border** (`--intent-border-normal`, step 7 in dark mode).
5. **Components inherit intent from CSS cascade.** No default intent in `defaultVariants` — intent flows via CSS custom properties.
6. **No Text or Heading components.** Use raw `<p>`, `<h1>`-`<h6>` with utility classes (`text-display-ui-*`, `text-display-prose-*`). Prose component for CMS/markdown content.
7. **Grid-first layout.** Use `grid gap-*` for vertical stacks. `flex` only when children should control sizing.
8. **Button text uses `emphasis-subtle-fg`** (step 11) for visible intent color on non-strong buttons.
9. **Strong emphasis hover uses `filter: brightness()`** — works on any intent's solid color. Other emphasis levels use raw intent steps for hover/active.
10. **Focus rings use `color-mix(in oklch, var(--intent-9) 30%, transparent)`** in light, 20% in dark.
11. **SpotIllustration colors are fixed** — hardcoded OKLCH in `@theme`, don't change in dark mode.
12. **`@source` directive required** in consumer CSS to scan component dist files.
13. **Icons: Phosphor with `weight='bold'`**. Use `/ssr` import for server components. Icons in Badge/Button are just children, not props. Import with Icon suffix (`HeartIcon` not `Heart`).
14. **Shape tiers:** `rounded-sm` (inline) -> `rounded-md` (small) -> `rounded-lg` (field) -> `rounded-xl` (container) -> `rounded-2xl` (large) -> `rounded-full` (buttons/badges).
15. **Elevation is intent-tinted** — shadows use `oklch()` with `var(--intent-hue)`. Rim-light scale for raised surfaces.
16. **Two interaction utilities:** `is-interactive` (buttons, cards) and `is-interactive-field` (form inputs with neutral->accent->danger state transitions). Plus `is-interactive-field-group` for composite inputs (Combobox InputGroup).
17. **Semantic color utilities replace default Tailwind colors** — `bg-normal`, `text-subtle`, `border-normal` etc. Default Tailwind `--color-*` disabled.
18. **Fluid typography** — `text-lg` and above use `clamp()` for responsive scaling without breakpoint overrides.
19. **CSS var names (`--intent-surface-strong`) don't match class naming pattern** — low priority, vars are internal plumbing.
20. **Motion tokens are CSS-native** — duration scale, easing curves (including spring via `linear()`), stagger base. Global `prefers-reduced-motion` reset uses `0.01ms` (not `0ms`) so JS events still fire.
21. **Sub-component API pattern** — Select and Combobox use compound component pattern via `Object.assign`. Each sub-component has its own typed props interface.
22. **Accordion uses `emphasis` + `intent`, not `appearance`** — consistent with every other component in the system.
23. **Emphasis scale uses `normal` not `default`** — avoids collision with the programming concept of "default value". Scale: strong → normal → subtle → subtler. Each component independently chooses its default emphasis level.
24. **RadioGroup emphasis is set on Root, not Item** — Root accepts `emphasis` (subtler/normal, default subtler), items inherit via React context. `emphasis='normal'` gives the "card" look.
25. **Component-level accessibility docs** — each component page should document keyboard patterns, ARIA roles, and screen reader behavior (template update pending in Phase 5a).
26. **`useAccent()` removed in v2** — replaced by `useTheme()` which also exposes `isDark`, `setDark`, `accentColor`, `setAccentColor`.
27. **Dark mode uses `color-scheme` + `.dark` class** — `getThemeScript()` provides a blocking inline script for flash-free SSR. ThemeProvider syncs state with localStorage and optional OS preference following.

## Sources & References

- **Brainstorm:** [docs/brainstorms/2026-03-31-tailwind-migration-brainstorm.md](../brainstorms/2026-03-31-tailwind-migration-brainstorm.md)
- **Branch:** `feature/v2-tailwind-migration`
- **Prototypes:** `packages/ui-v2/`, `/Users/lukebrooker/Code/prototype/`
- **Consumer analysis:** `/Users/lukebrooker/Code/ticketsolutions.oztix.website/` (Oztix Website)
- **Related plans:** `docs/plans/2026-04-03-feat-performance-accessibility-foundation-pages-plan.md`
