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

Work on branch `feature/v2-tailwind-migration` from `main`.

## Implementation Phases

### Phase 1: Core Foundation — COMPLETE

- [x] Spike: validate `@utility` + CSS custom property scoping + `.dark &` nesting
- [x] `tokens.css` — 7 color scales (0-13) in OKLCH, light + dark. Elevation shadows. Typography tokens (fluid font sizes, line heights, letter spacings).
- [x] `intents.css` — 7 `@utility` intent directives with dark mode raised/sunken swap
- [x] `emphasis.css` — Property-specific primitives + combined shortcuts
- [x] `typography.css` — Text style `@utility` composites (display-ui-1–6, display-prose-1–6, text-ui, text-prose, text-code)
- [x] `interactions.css` — `is-interactive` utility
- [x] `fonts.css` — Intermission + IBM Plex Mono font-face
- [x] `roadie.css` — Main entry importing all above + tailwindcss
- [x] `radix-generator.ts` — Extended 0-13 OKLCH scale generator with WCAG contrast check
- [x] `contrast.ts` + `cn.ts` — Utilities
- [x] Package setup: exports map, tsup config, build scripts
- [x] Old PandaCSS/token system fully removed (presets, recipes, patterns, types, token JSON, build scripts, ESLint plugin)

### Phase 2: Component Migration — COMPLETE

- [x] Package setup: remove Ark UI/PandaCSS, add Base UI/CVA/Tailwind
- [x] Button + IconButton — Base UI + CVA (intent, emphasis, size + icon variants)
- [x] Text — semantic `<p>` with CVA (intent, emphasis, size)
- [x] Heading — semantic h1-h6 with CVA (intent, emphasis, size, level)
- [x] Code — `<code>` with CVA (intent, emphasis)
- [x] Mark — `<mark>` with intent + emphasis styling
- [x] Highlight — reimplemented useHighlight in-house
- [x] SpotIllustration — rewritten with Tailwind classes
- [x] ThemeProvider — dynamic accent via generateRadixScale + SSR-safe getAccentStyleTag()
- [x] View/Container/hooks deprecated and removed
- [x] All 74 tests rewritten and passing
- [x] Build, typecheck, lint all clean

### Phase 3: Documentation Site — COMPLETE

- [x] Removed PandaCSS (config, generated artifacts, dep)
- [x] Added Tailwind v4 + PostCSS, globals.css imports roadie.css
- [x] Migrated layout.tsx, mdx-components.tsx, all shared components
- [x] Migrated all page files (TSX + MDX), removed View/Container references
- [x] Removed deprecated View/Container component pages
- [x] Created placeholder pages for token reference and colors (need v2 content)
- [x] All 16 pages build successfully as static content

### Phase 4: New Components — DEFERRED

- [ ] Badge — with intent/emphasis
- [ ] Card — with intent/emphasis
- [ ] Field + Label — form field wrapper
- [ ] Input + Textarea — Base UI input primitives
- [ ] Select — Base UI Select
- [ ] Separator — simple `<hr>` styled

### Phase 5: Migration Guide + Polish — DEFERRED

- [ ] Migration guide (v1→v2 breaking changes with before/after)
- [ ] Vue integration guide
- [ ] Codemods for View/Container/colorPalette→intent
- [ ] CLAUDE.md update with v2 conventions
- [ ] Accessibility audit
- [ ] CSS bundle size measurement
- [ ] Changesets + release

## Sources & References

- **Brainstorm:** [docs/brainstorms/2026-03-31-tailwind-migration-brainstorm.md](../brainstorms/2026-03-31-tailwind-migration-brainstorm.md)
- **Branch:** `feature/v2-tailwind-migration`
- **Prototypes:** `packages/ui-v2/`, `/Users/lukebrooker/Code/prototype/`
