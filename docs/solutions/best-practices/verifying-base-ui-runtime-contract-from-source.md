---
title: Verify Base UI runtime contract from source before wrapping
date: 2026-04-28
category: best-practices
module: packages/components
problem_type: best_practice
component: tooling
severity: medium
applies_when:
  - Wrapping a @base-ui/react primitive in a Roadie compound component
  - Writing CVA variants that key off Base UI data attributes (data-[active], data-[open], etc.)
  - Authoring vitest + RTL assertions against Base UI part state
  - Styling Base UI indicators or positioners that expose CSS custom properties
  - Bumping `@base-ui/react` and re-validating data-attribute / CSS-var names
symptoms:
  - Test fails with `expected element to have attribute "data-selected", received null`
  - CVA `data-[selected]:*` variants never apply at runtime despite the part appearing active
  - Indicator part renders empty / collapsed in jsdom because hydration script bails on `offsetWidth === 0`
  - Assumed ARIA-tabs attribute names from other libraries don't match Base UI's contract
related_components:
  - Tabs
  - '@base-ui/react'
tags:
  - base-ui
  - compound-components
  - data-attributes
  - css-variables
  - node-modules
  - testing
verified_against: '@base-ui/react@1.3.0'
---

# Verify Base UI runtime contract from source before wrapping

## Context

While building tests for a new `Tabs` compound wrapping `@base-ui/react/tabs`, the implementer assumed the active-tab marker was `data-selected` — a common ARIA-tabs convention and a reasonable guess from reading the Base UI website. The variant class `data-[selected]:text-strong` rendered nothing and the test `expect(tab).toHaveAttribute('data-selected')` failed with `received: null`.

The actual attribute, `data-active`, was not surfaced in the external docs the implementer had read, but it was sitting in the package itself as an enum constant: `@base-ui/react/tabs/tab/TabsTabDataAttributes.js`. The same was true for the `Indicator` part's CSS variables (`--active-tab-{left,right,top,bottom,width,height}` declared in `TabsIndicatorCssVars.js`) and for its prehydration semantics (`prehydrationScript.min.js` reveals an `offsetWidth > 0` hidden-attribute toggle that breaks naïve jsdom tests).

The fix was mechanical once the names were known — but the durable lesson is the discovery workflow, not the specific names.

## Guidance

**Before you write a `data-[*]:` Tailwind variant, consume a Base UI CSS variable, or assert a state attribute in a test, grep the part's own contract files in `node_modules`.**

Each Base UI part directory ships a self-describing runtime contract alongside the implementation:

- `<Part>DataAttributes.{js,d.ts}` — every `data-*` state attribute the part emits.
- `<Part>CssVars.{js,d.ts}` — every CSS custom property the part sets (when applicable).
- `prehydrationScript.min.js` — the inline SSR/hydration script (when applicable). Useful for parts with visibility logic that runs before React hydrates (Tabs Indicator, Toast, Tooltip, Popover, etc.).

List the contract files for a part, then read them directly:

```bash
ls node_modules/.pnpm/@base-ui+react@*/node_modules/@base-ui/react/tabs/*/
```

Concrete example — the Tabs primitive (Base UI v1.3 ships these as real TS `enum`s; the JS form is `Foo["key"] = "value"`):

```ts
// TabsTabDataAttributes.d.ts
export declare enum TabsTabDataAttributes {
  active = 'data-active', // <-- active tab marker (not data-selected)
  disabled = 'data-disabled',
  orientation = 'data-orientation'
  // ...
}

// TabsIndicatorCssVars.d.ts
export declare enum TabsIndicatorCssVars {
  activeTabLeft = '--active-tab-left',
  activeTabRight = '--active-tab-right',
  activeTabTop = '--active-tab-top',
  activeTabBottom = '--active-tab-bottom',
  activeTabWidth = '--active-tab-width',
  activeTabHeight = '--active-tab-height'
}
```

Apply this lookup whenever you are:

- Writing `data-[*]:` Tailwind variants in a wrapper's CVA (the variant only fires if Base UI actually emits the attribute).
- Consuming Base UI CSS variables in arbitrary-value classes (e.g. `left-[var(--active-tab-left)]`).
- Asserting attributes or computed styles in vitest/RTL tests.
- Reproducing Base UI's prehydration behaviour in SSR-aware components — read the minified prehydration script to see what runs before React hydrates.

## Why This Matters

The Base UI website and changelog can lag the shipped package, and naming conventions sometimes differ from the ARIA defaults you might guess (Tabs uses `data-active`, not the ARIA-flavoured `data-selected`). Grounding variants, CSS-var consumers, and test assertions in the package's own enum modules makes them resilient across minor version bumps — if Base UI renames an attribute, your typecheck or build picks it up immediately rather than silently rendering an unstyled element.

## Examples

**1. Variant class — assumed name vs. shipped name**

```tsx
import { cva } from 'class-variance-authority'

// Wrong — Base UI never emits data-selected on the Tab part.
// `data-[active]:` belongs in the base class string (it's a runtime
// selector keyed off Base UI's attribute, not an author-controlled
// CVA option).
const tabsTabVariants = cva(
  'text-subtle data-[selected]:text-strong',
  { variants: { size: { sm: 'h-8 px-3', md: 'h-10 px-4' } } }
)

// Right — confirmed via TabsTabDataAttributes (`active = "data-active"`).
const tabsTabVariants = cva(
  'text-subtle data-[active]:text-strong',
  { variants: { size: { sm: 'h-8 px-3', md: 'h-10 px-4' } } }
)
```

The wrong version compiles and renders nothing — Tailwind generates the selector, but the attribute is never present, so the variant never matches.

**2. Test assertion — guessed attribute vs. enum-confirmed attribute**

```ts
// Wrong — fails with `received: null`.
expect(activeTab).toHaveAttribute('data-selected')

// Right — matches the enum value Base UI actually sets.
expect(activeTab).toHaveAttribute('data-active')
```

**3. CSS-variable consumer — verified against `TabsIndicatorCssVars`**

```tsx
// Wrong — plausible-looking name, but not what Base UI sets.
<Tabs.Indicator className='absolute left-[var(--tab-left)] w-[var(--tab-width)]' />

// Right — names taken straight from TabsIndicatorCssVars.
<Tabs.Indicator
  className='absolute left-[var(--active-tab-left)] top-[var(--active-tab-top)]
             h-[var(--active-tab-height)] w-[var(--active-tab-width)]'
/>
```

## Related

- `docs/contributing/BASE_UI.md` §5 (Styling via data attributes) and §6 (CSS custom properties exposed by Base UI) — the in-repo authoring guide. The lists there are the consumption-side companion to this discovery workflow; for any part not listed, fall back to the `<Part>DataAttributes.{js,d.ts}` and `<Part>CssVars.{js,d.ts}` files in `node_modules`.
- `docs/contributing/COMPOUND_PATTERNS.md` — per-file leaves + server-safe `index.tsx` shape for compounds. The same `node_modules` inspection muscle was used to validate that pattern (see the next entry).
- `docs/solutions/rsc-patterns/compound-export-namespace.md` — uses the same source-reading muscle for a different question (how Base UI ships its compound parts).
- `docs/solutions/build-errors/react-docgen-cva-literal-props.md` — relates to writing CVA variants whose values surface in `<PropsDefinitions>`, which often combines with `data-[*]:` variants from this learning.
