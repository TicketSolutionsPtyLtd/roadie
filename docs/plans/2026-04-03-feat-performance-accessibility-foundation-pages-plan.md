---
title: 'feat: Add Performance and Accessibility foundation pages'
type: feat
status: active
date: 2026-04-03
---

# Add Performance and Accessibility foundation pages

## Overview

Add two new foundation pages to the Roadie docs site — **Performance** and **Accessibility** — that codify frontend development principles for Oztix applications. These pages fill the two major gaps in the current foundations section: there's no unified accessibility reference (guidelines are scattered across Interactions and Motion), and no performance guidance at all.

Both pages provide Roadie-specific context, do/don't patterns using the `Guideline` component, and cross-references to existing foundations.

## Motivation

The existing foundation pages cover _design system usage_ well (colors, layout, typography, motion, interactions) but don't address two core engineering concerns:

1. **Performance** — No guidance on bundle size, rendering, CLS, font loading, or measuring.
2. **Accessibility** — Keyboard, focus, and reduced motion are covered in Interactions and Motion respectively, but there's no unified page covering semantic HTML, ARIA, color contrast, screen reader testing, or the "HTML is the accessible baseline" principle.

The driving concerns: **performance** and **accessibility**. Consistency follows from having documented standards for both.

## Proposed solution

Add two new TSX pages under `docs/src/app/foundations/`:

### 1. Performance page (`foundations/performance/page.tsx`)

Covers frontend performance principles for anyone building with or on top of Roadie.

**Sections:**

- **Intro** — "Speed is a feature. Performance is the foundation of user trust."
- **Measure reliably** — Throttle CPU/network, disable extensions, test on real devices. Guideline do/don't.
- **Core Web Vitals** — CLS (set explicit dimensions, no layout shift), LCP (preload above-fold images), INP (offload main thread). Guideline do/don'ts for each.
- **Rendering** — Track re-renders (React DevTools / React Scan), minimize layout work (batch DOM reads/writes), virtualize large lists. Guidelines.
- **Network** — Network budgets (<500ms writes), preconnect to origins, preload wisely (above-fold eager, below-fold lazy). Guidelines.
- **Fonts** — Preload critical fonts, subset to used characters, `font-display: swap`. Link to existing [Typography foundation](/foundations/typography). Guideline.
- **What Roadie handles** — Callout box listing what the design system already does: fluid typography (`clamp()`), motion tokens with `prefers-reduced-motion` reset, CSS-only utilities (no JS runtime), tree-shakeable components via `tsup`.
- **Quick reference** — Table mapping rules to existing foundation pages (e.g., "No CLS" → Layout, "Font optimization" → Typography).

### 2. Accessibility page (`foundations/accessibility/page.tsx`)

Unifies scattered accessibility guidance into one reference. Links back to Interactions and Motion for detailed implementation.

**Sections:**

- **Intro** — "Accessibility is not a feature — it's a quality bar." Principle: "HTML is the accessible baseline."
- **Semantic HTML first** — Use `<button>`, `<a>`, `<input>`, `<nav>`, `<main>`, `<article>` etc. Browsers provide accessibility for free with semantic elements. Guideline do/don't.
- **ARIA as a last resort** — ARIA supplements HTML semantics, it doesn't replace them. The first rule of ARIA is don't use ARIA (if a native element exists). Guideline do/don't.
- **Color and contrast** — WCAG AA minimums (4.5:1 text, 3:1 large text/UI). Never convey meaning through color alone. Link to existing [Colors foundation](/foundations/colors). Guideline.
- **Keyboard and focus** — Signpost only (1-2 sentences + link). Full coverage lives in [Interactions foundation](/foundations/interactions). No guidelines duplicated here.
- **Reduced motion** — Signpost only (1-2 sentences + link). Full coverage lives in [Motion foundation](/foundations/motion). No guidelines duplicated here.
- **Screen readers** — Test with VoiceOver (macOS) / NVDA (Windows). Ensure meaningful alt text, announce dynamic content with live regions, logical heading hierarchy.
- **Forms** — Only the ARIA-specific guidance not already in Interactions: associate errors with `aria-describedby`, use `aria-invalid`, group related fields with `fieldset`/`legend`. Link to [Interactions foundation](/foundations/interactions) for the full forms section.
- **What Roadie handles** — Callout box: Base UI primitives provide ARIA attributes, focus management, keyboard navigation. `is-interactive` provides focus-visible rings. `is-field-interactive` provides invalid state styling. Semantic color tokens maintain contrast ratios in light/dark modes.
- **Testing checklist** — Compact checklist: keyboard navigation, screen reader, color contrast tool, reduced motion emulation, zoom to 200%.

## Technical considerations

- **Page format:** TSX (matching all other foundation pages), not MDX
- **Navigation:** Auto-discovered — just create the directories. No config changes needed.
- **Nav ordering:** Foundation pages appear in filesystem order. `accessibility/` and `performance/` will sort naturally near the top (alphabetically before `colors/`). If ordering matters, we can rename directories or add sort logic later.
- **Components used:** `Guideline` (with `Guideline.Do` / `Guideline.Dont`), `Code` from `@oztix/roadie-components`, `Link` from `next/link`
- **No new components needed** — existing `Guideline` component handles all do/don't patterns
- **Cross-linking:** Both pages link to existing foundations (Interactions, Motion, Colors, Typography, Layout) rather than duplicating content
- **Content sourced from:** The team's Engineering Collection Rulestacks (Frontend Performance Standard, Engineering Standard, Engineering Foundations) — used as reference material during implementation, not linked in the public docs.

## Acceptance criteria

- [x] `docs/src/app/foundations/performance/page.tsx` exists with metadata export (`title`, `description`)
- [x] `docs/src/app/foundations/accessibility/page.tsx` exists with metadata export (`title`, `description`)
- [x] Both pages appear in the sidebar navigation automatically
- [x] Both pages use `Guideline` do/don't patterns consistent with other foundation pages
- [x] Performance page content aligns with Frontend Performance Standard principles (measure reliably, CLS, rendering, network, fonts)
- [x] Accessibility page content aligns with Engineering Standard principles (semantic HTML, ARIA, contrast, screen readers)
- [x] Both pages cross-reference existing foundation pages (not duplicating content)
- [x] Pages follow existing foundation page structure: hero → sections → guidelines → quick reference
- [x] Code quality: passes `pnpm lint` and `pnpm typecheck`
- [ ] Dev server renders both pages without errors (`pnpm --filter docs dev`)

## Success metrics

- Contributors have a single reference for performance and accessibility expectations
- No duplicated guidelines between the new pages and existing foundations (Interactions, Motion)
- Guidelines are self-contained — no external dependencies for the reader

## Follow-up: Component-level accessibility docs

The Accessibility foundation page covers system-wide principles, but each component should also document its own accessibility characteristics. This is a separate task to do after the foundation pages are built.

**What to add:**

1. **Update `COMPONENT_DOC_TEMPLATE.md`** — Add an "Accessibility" section (after Guidelines, before PropsDefinitions) covering: keyboard interaction pattern, ARIA roles/attributes provided, screen reader announcements, and any gotchas.
2. **Audit existing component docs** — Review each component page against the new template section and fill in missing accessibility documentation.
3. **Consistency check** — Ensure accessibility guidance in component docs aligns with the new Accessibility foundation page (semantic HTML, ARIA usage, contrast).

This gives us a two-tier system: the foundation page sets the principles, component docs show the specifics.

## Dependencies & risks

- **Low risk:** These are new pages with no changes to existing code. No breaking changes.
- **Nav ordering:** Alphabetical filesystem order may place these before Colors. Acceptable for now — can be addressed separately if needed.

## Sources & references

### Implementation reference (not linked in docs)

- Engineering Collection Rulestacks: Frontend Performance Standard, Engineering Standard, Engineering Foundations — used to inform content during implementation

### Internal references (existing foundation pages)

- Interactions: `docs/src/app/foundations/interactions/page.tsx` — keyboard, focus, forms, hit targets
- Motion: `docs/src/app/foundations/motion/page.tsx` — reduced motion, animation guidelines
- Layout: `docs/src/app/foundations/layout/page.tsx` — grid/flex, spacing
- Typography: `docs/src/app/foundations/typography/page.tsx` — fluid scaling, font families
- Colors: `docs/src/app/foundations/colors/page.tsx` — color system, contrast
