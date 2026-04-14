# @oztix/roadie-components

## 2.2.0

### Minor Changes

- f2eb334: Components consistency cleanup, Phases 1 & 2 of the `2026-04-15-refactor-components-consistency-cleanup-plan`. No runtime behaviour change; the minor bump is for the server-safety improvement plus the removal of three `@deprecated` type aliases.

  **New: server-safe by default.** `Input`, `Textarea`, and `Highlight` no longer emit `'use client'`. Consumers can render them from Next.js server components without forcing a client boundary. Verified on the compiled dist — the entries no longer start with the directive. Existing client-component usage continues to work unchanged.

  **Removed: deprecated type aliases.** The three `@deprecated` aliases left in place by the Pattern A migration (#36) are deleted:
  - `SelectRootProps` → use `SelectProps`
  - `ComboboxRootProps` → use `ComboboxProps`
  - `AutocompleteRootProps` → use `AutocompleteProps`

  Also removed (never re-exported from the package barrel, so not part of the documented surface): `SelectTriggerVariantProps` (misnamed re-export) and the `HighlightChunk` type export (kept as a local type inside `Highlight/index.tsx`).

  **Internal cleanups (no API change):**
  - Every Phosphor import in the components package now uses `@phosphor-icons/react/ssr` (Accordion, Select, Combobox, Autocomplete, Steps; Carousel was already on `/ssr`). One import path now works in both server and client components.
  - `Steps` and `Carousel` `direction` variant entries switched from dead `''` strings to `undefined` so the variant API stays intact without stringly-typed noise.
  - `Highlight`'s redundant `query === ''` clause dropped (already covered by `!query`).
  - `BASE_UI.md` §7 gained a "server-safe by default" authoring rule, and the §11 skeleton template's `Object.assign` form was replaced with direct assignment + a `TODO(Phase 3)` marker pointing at the upcoming `export * as` migration.

## 2.1.1

### Patch Changes

- ba58fd6: Migrate every compound component to Pattern A (named exports + property assignment), matching the Carousel convention. Purely structural — consumer imports and the compound API (`<Select>`, `<Select.Trigger>`, `<Card.Header>`, etc.) are unchanged.

  Affected compounds: Accordion, Autocomplete, Breadcrumb, Card, Combobox, Field, Fieldset, RadioGroup, Select, Steps.

  Under the hood:
  - Root functions renamed from `XRoot` → `X` where applicable (internal names only; these were never exported from the package barrel)
  - Subcomponent `interface X extends Y` prop types converted to `type X = Y & { ... }` for `BreadcrumbSeparatorProps`, `FieldLabelProps`, `FieldHelperTextProps`, `FieldErrorTextProps`, `FieldsetLegendProps`, `FieldsetHelperTextProps`, `FieldsetErrorTextProps`, `RadioGroupLabelProps`, `RadioGroupHelperTextProps`, `RadioGroupErrorTextProps`, `SelectHelperTextProps`, `SelectErrorTextProps`, `SelectContentProps`
  - Root prop types renamed to match convention where previously suffixed with `Root` (`SelectRootProps` → `SelectProps`, `ComboboxRootProps` → `ComboboxProps`, `AutocompleteRootProps` → `AutocompleteProps`, `FieldsetRootProps` → `FieldsetProps`, `FieldRootProps` → `FieldProps`, `RadioGroupRootProps` → `RadioGroupProps`). The old `*RootProps` names remain as `@deprecated` type aliases where they were re-exported from the package barrel (`SelectRootProps`, `ComboboxRootProps`, `AutocompleteRootProps`) for backwards compatibility
  - `LinkButton` / `LinkIconButton`: inlined CVA variant props (`intent`, `emphasis`) as literal unions rather than `VariantProps<typeof buttonVariants>['key']`, which `react-docgen-typescript` couldn't drill into. New exported type aliases: `LinkButtonIntent`, `LinkButtonEmphasis`, `LinkButtonSize`, `LinkIconButtonSize` for consumers who want to annotate their own wrappers

## 2.1.0

### Minor Changes

- 7685819: Add `Carousel` compound component built on Embla v9.

  New parts:
  - `Carousel` root with `direction`, `autoPlay`, `opts`, and `aria-label` props.
  - `Carousel.Header` — responsive three-slot layout (title left, dots
    centered, controls right on desktop; collapses to flex `justify-between`
    on mobile). Children are placed by source order so consumers can drop
    arbitrary nodes into any slot.
  - `Carousel.Title` (`<h2>` with `as` prop for heading level) and
    `Carousel.TitleLink` (anchor with trailing arrow icon and `as` for
    framework router links).
  - `Carousel.Controls` — inline flex row that hides on mobile by default
    (`hidden md:flex`) and hides entirely when there's nothing to scroll
    to. Pass `forceVisible` to keep it rendered.
  - `Carousel.Content` — Embla viewport + container. New `overflow` prop
    with `subtle` (default) / `hidden` / `visible` options. `subtle`
    bleeds slides past the gutter and fades them to the page background
    via `::before` / `::after` gradient overlays.
  - `Carousel.Item` — single slide. Uses Embla's `slidesinview` event to
    drive the `inert` attribute, so every visible slide in a multi-visible
    layout (e.g. `basis-1/3` with 4 cards) stays interactive.
  - `Carousel.Previous` / `Carousel.Next` — nav buttons compose `IconButton`.
    Auto-hide when `canScroll` is false.
  - `Carousel.PlayPause` — play/pause toggle, renders only when `autoPlay`
    is set.
  - `Carousel.Dots` — one button per _Embla snap_ (not per slide), so
    multi-visible layouts get the correct dot count. Also auto-hides when
    there's nothing to scroll.
  - `useCarousel()` hook returns `{ state, actions }`. `useCarouselUnsafeEmbla()`
    is the explicit escape hatch for consumers that need the raw Embla
    `api` — named separately so raw-Embla coupling is greppable.

  Behaviour notes:
  - `align: 'start'` is the Roadie default in `resolvedOpts` (consumers can
    still override via `opts`).
  - Embla's `snapList()` feeds a `snapCount` state that powers all
    navigation logic, so `canGoToPrev` / `canGoToNext` / `canScroll` /
    `Carousel.Dots` all work correctly for multi-visible layouts.
  - Keyboard nav (`ArrowLeft`/`Right`, `ArrowUp`/`Down` in vertical mode,
    `Home` / `End`) on the viewport; arrow keys yield to focusable
    content inside slides.
  - `prefers-reduced-motion: reduce` disables the autoplay plugin
    entirely and sets Embla's `duration` to 0 for instant transitions.
  - WCAG 2.2.2-compliant pause model: `Carousel.PlayPause` is a sticky
    toggle; hover / focus pause the plugin transiently without retriggering
    the live region.
  - `safePluginCall` warns in dev when Embla's autoplay plugin throws
    instead of silently swallowing the error.

## 2.0.2

### Patch Changes

- 4f929b8: Migrate build pipeline from tsup to tsdown (Rolldown). Internal build-tool
  change with no consumer-facing API differences — dist shape, exports map,
  and type declarations are unchanged.
  - Rolldown preserves `"use client"` directives on entries natively, so the
    post-build hook that previously re-inserted them is gone.
  - `build:css` now invokes the `tailwindcss` bin directly instead of
    `npx @tailwindcss/cli`, eliminating stray npm warnings during builds.
  - Adds `RefAttributes` to `RadioGroup.Root` and `RadioGroup.Item` prop
    types so they match the Select/Combobox/Autocomplete convention.
  - Adds `docs/contributing/BASE_UI.md` as the canonical authoring guide
    for new Base UI wrappers.

- Updated dependencies [4f929b8]
  - @oztix/roadie-core@2.0.1

## 2.0.1

### Patch Changes

- d4f9539: Fix .d.ts type resolution for pnpm consumers. Use named prop types with type aliases instead of ComponentProps, add RefAttributes for ref forwarding, and move @base-ui/react and class-variance-authority to peer dependencies so consumers can resolve exported types. Adds attw and check:dts build guards to prevent regressions.

## 2.0.0

### Major Changes

- 0645262: Migrate design system from PandaCSS to Tailwind CSS v4 + Base UI

  **Breaking changes:**
  - Replace PandaCSS with Tailwind CSS v4 — all `css()`, `styled()`, `sva()`, and `cva()` (PandaCSS) APIs removed
  - Replace Ark UI with Base UI for interactive component primitives
  - Remove `View`, `Container`, `Text`, and `Heading` components — use raw HTML elements with utility classes
  - Remove `useAccent()` hook — replaced by `useTheme()`
  - Remove `useColorMode()` hook — replaced by `useTheme()` with `isDark`/`setDark`
  - Rename `colorPalette` prop to `intent` (`information` -> `info`, `primary` -> `brand`)
  - Rename `appearance` prop to `emphasis` across all components
  - Rename emphasis level `default` to `normal` (scale: strong -> normal -> subtle -> subtler)
  - Components no longer set a default intent — they inherit from CSS cascade context
  - Default Tailwind color utilities disabled (`--color-*: initial`) — use semantic colors (`bg-normal`, `text-subtle`, `border-normal`)
  - `getAccentStyleTag()` is now async (lazy-loads colorjs.io)
  - Dark mode changed from `data-color-mode="dark"` to `className="dark"` with CSS `color-scheme`
  - Icons migrated from Lucide to Phosphor (`@phosphor-icons/react`, `weight="bold"`)

  **New features:**
  - CSS-native OKLCH color system with 7 intents x 14-step scales
  - Intent/emphasis/semantic-color utility system via Tailwind `@utility` directives
  - Intent-tinted elevation shadows and rim-light scale
  - Fluid typography via `clamp()` for text-lg and above
  - Motion tokens (duration, easing, keyframes) with `prefers-reduced-motion` reset
  - `is-interactive` and `is-interactive-field` interaction utilities
  - Flash-free dark mode SSR via `getThemeScript()`
  - 19 new components: Prose, Badge, Card, Input, Textarea, Field, Label, Select, Combobox, Autocomplete, RadioGroup, Fieldset, Accordion, Breadcrumb, Separator, Steps, LinkButton, Indicator, Marquee
  - Field as universal form control wrapper with context inheritance
  - Sub-component API pattern for Select and Combobox
  - ThemeProvider with `followSystem`, `defaultDark`, `setDark`, localStorage persistence
  - Vue integration support (tokens + utility classes only)

### Patch Changes

- Updated dependencies [0645262]
  - @oztix/roadie-core@2.0.0

## 1.2.0

### Minor Changes

- d9a0534: Add essential components and design tokens for B2B website development (INNO-170)

  **New Components:**
  - Add Container component for responsive page-level layouts with max-width constraints
  - Add IconButton component for square, icon-only button variant
  - Add Mark component for semantic text highlighting with theme-aware styling
  - Add Highlight component for intelligent search result highlighting using Ark UI
  - Add SpotIllustration system with automated SVG-to-component pipeline and 12 initial illustrations

  **Design Token Enhancements:**
  - Add `brandSecondary` color palette to type system
  - Add `surface.highlight` tokens for all color palettes with hover/active states
  - Update `surface.strong` token colors for improved contrast

  **Font System:**
  - Rename from Inter Variable to Intermission (Oztix's customized version)
  - Enable OpenType features: case, ss03, cv01-cv05, cv08-cv11
  - Subset to Basic Latin (U+0020-007F) and typographic quotes (U+2018-201F) for optimized file size

  **Build System:**
  - Add automated SpotIllustration build pipeline with SVGO optimization and watch mode
  - Add chokidar and svgo dependencies for illustration tooling
  - Add tree-shakeable exports for spot illustrations

### Patch Changes

- Updated dependencies [d9a0534]
  - @oztix/roadie-core@1.2.0

## 1.1.0

### Minor Changes

- 6e05fb8: Add color mode utilities and improve design tokens

  **New Features:**
  - Add vanilla JavaScript `colorMode` utilities for framework-agnostic color mode management
  - Export `useColorMode` hook separately from components for better tree-shaking
  - Add CSS custom properties and utilities for color mode tokens

  **Token Improvements:**
  - Align brand color names with lighting metaphor system (luminary, beacon, radiance, brilliance, spark)
  - Normalize all hex color codes to lowercase for consistency
  - Adjust semantic token `surface.strong` mappings for better contrast
  - Fix `Heading` component default `colorPalette` to use `neutral`

  **Developer Experience:**
  - Improve generated CSS token formatting to match Prettier rules
  - Optimize PandaCSS codegen to eliminate duplicate type generation
  - Add TypeScript incremental compilation support for faster builds

  **Documentation:**
  - Update docs to demonstrate color mode utilities usage
  - Add vanilla CSS tokens documentation and examples
  - Improve code preview component styling

### Patch Changes

- Updated dependencies [6e05fb8]
  - @oztix/roadie-core@1.1.0

## 1.0.0

### Major Changes

- 8481943: Upgrade to PandaCSS 1.4.3 and Ark UI with modernized component system

  **Breaking Changes:**
  - Upgraded PandaCSS from 0.48.1 to 1.4.3
  - Migrated from React Aria Components to Ark UI factory pattern
  - Button component now uses native HTML props: `disabled` instead of `isDisabled`, `onClick` instead of `onPress`
  - Removed `colors.solid.*` tokens (use `surface.strong` instead)
  - Renamed all `muted` emphasis levels to `subtler` (e.g., `fg.muted` → `fg.subtler`)
  - Changed primary font from Inter Variable to Intermission
  - Refined letter spacing token scale (values changed significantly)
  - Complete rewrite of Text, Heading, Button, and Code components to use Ark UI factory
  - New styled() API for components replacing previous implementation
  - Simplified View component implementation
  - Component props standardized across all components

  **New Features:**
  - All components now support `colorPalette` prop for flexible theming
  - Button component rewritten with `styled()` API and new `xs` size variant
  - Components modernized to use semantic `colorPalette.*` tokens
  - New standardized component API with consistent props across all components
  - Enhanced typings with HTMLStyledProps for comprehensive prop support
  - Updated Text, Heading, Button, and Code components with consistent styling system
  - View is now a PandaCSS pattern component
  - Improved recipe system with shared patterns and consistent APIs

  **Migration:**

  Update Button props:

  ```diff
  - <Button isDisabled onPress={handlePress}>
  + <Button disabled onClick={handlePress}>
  ```

  Replace removed tokens:

  ```diff
  - color: {colors.accent.solid.default}
  + color: {colors.accent.surface.strong}
  ```

  Update emphasis levels:

  ```diff
  - <Text emphasis="muted">
  + <Text emphasis="subtler">
  ```

### Patch Changes

- 0125940: Added src files to package
- Updated dependencies [8481943]
  - @oztix/roadie-core@1.0.0

## 0.2.1

### Patch Changes

- f2aa279: Update neutral solid colors to work better with default button
- Updated dependencies [f2aa279]
  - @oztix/roadie-core@0.2.1

## 0.2.0

### Minor Changes

- 94d8153: Add new semantic color token system
  - Introduce new color palette structure with semantic tokens
  - Update components to use new color token system
  - Add emphasis and colorPalette props to components
  - Update tests to reflect new token structure

### Patch Changes

- Updated dependencies [94d8153]
  - @oztix/roadie-core@0.2.0

## 0.1.1

### Patch Changes

- 77cd753: Improve build for tree-shaking and code-splitting

## 0.1.0

### Minor Changes

- Initial pre-release of the Roadie Design System for internal testing

### Patch Changes

- Updated dependencies
  - @oztix/roadie-core@0.1.0
