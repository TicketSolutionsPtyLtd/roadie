# @oztix/roadie-components

## 2.6.0

### Minor Changes

- 1aaac77: Smart `href` routing across every link-bearing component, plus
  `RoadieLinkProvider` for app-level Link injection. `LinkButton` /
  `LinkIconButton` are now soft-deprecated.

  ## What's new
  - **`RoadieLinkProvider`** — a single context-injected provider that
    supplies the consumer's Link component (typically `next/link`) to
    every Roadie surface that accepts `href`. Wire it once at the app
    root, and internal links route through your client router
    automatically. Apps without a provider fall back to plain `<a>`.

    ```tsx
    import NextLink from 'next/link'

    import { RoadieLinkProvider, ThemeProvider } from '@oztix/roadie-components'

    ;<RoadieLinkProvider Link={NextLink}>
      <ThemeProvider>{children}</ThemeProvider>
    </RoadieLinkProvider>
    ```

  - **`href` on every link-bearing component** — `Button`, `IconButton`,
    `Card`, `Breadcrumb.Link`, `Carousel.TitleLink`, and `Tabs.Tab` now
    accept `href`. Internal hrefs route through the configured Link;
    external hrefs (`http(s)://`, `//…`) auto-render
    `<a target='_blank' rel='noopener noreferrer'>`; `mailto:` / `tel:` /
    `sms:` render plain `<a>` with no target. Override via `external`,
    `target`, or `rel`.

    ```tsx
    <Button href='/events/123'>View event</Button>
    <Button href='https://stripe.com/docs'>Stripe docs</Button>
    <Card href='/event/123'>{/* whole-card link, with is-interactive */}</Card>
    <Breadcrumb.Link href='/events'>Events</Breadcrumb.Link>
    <Tabs.Tab value='events' href='/events'>Events</Tabs.Tab>
    ```

  - **`IconButton` size DX** — accepts plain `'xs' | 'sm' | 'md' | 'lg'`
    and maps to the underlying `btn-icon-*` classes. Default flips from
    `'icon-md'` to `'md'`. Legacy `'icon-*'` literals still accepted via
    a `@deprecated` alias.

  ## What's deprecated (still works, removed in v3.0.0)
  - **`LinkButton` / `LinkIconButton`** — JSDoc `@deprecated`. They keep
    their public type signatures (including the `<T extends ElementType>`
    generic and the `as` prop) and their original anchor-with-button-
    classes rendering. New code should use `<Button href={…}>` and
    `<IconButton href={…}>` instead.
  - **`'icon-*'` size literals on `IconButton` / `LinkIconButton`** —
    use `'xs' | 'sm' | 'md' | 'lg'` instead.
  - **`as` prop on `Card` / `Breadcrumb.Link` / `Carousel.TitleLink`** —
    unified on `render` as the universal escape hatch. Every Roadie
    component now accepts the same `render` prop (element / component /
    function form), mirroring Base UI's contract. Non-Base-UI components
    compose a small `useRender` helper internally to deliver the same
    semantics. The `as` prop continues to work for back-compat.

    ```tsx
    // Before
    <Card as='button' onClick={handleSelect}>…</Card>
    <Card as={MyLink} href='/x'>…</Card>

    // After
    <Card render={<button type='button' onClick={handleSelect} />}>…</Card>
    <Card render={<MyLink href='/x' />}>…</Card>
    ```

  ## Notes for consumers
  - Existing `<Button onClick={…}>`, `<Button render={<a>}>`, and
    `<Card as='a' href=…>` call sites are untouched.
  - Passing both `href` and an explicit `render` to Button emits a
    one-shot dev-mode warning — `render` wins, provider routing is
    silently disabled. Pick one.
  - `as` always wins over `href` smart-routing for non-Base-UI
    components (Card, Breadcrumb.Link, Carousel.TitleLink). It's the
    documented escape hatch.
  - Server-safe components (Card, Breadcrumb.Link) stay server-safe —
    the smart-href delegation crosses to the client only when `href` is
    set, via Next's standard module-graph boundary.

  ## Where to read more
  - Full plan: `docs/plans/2026-04-28-001-feat-roadie-link-provider-and-tracking-pattern-plan.md`
  - Foundations / Linking docs page (forthcoming)

## 2.5.0

### Minor Changes

- 26cf350: Add `Tabs` compound built on Base UI Tabs. Four `emphasis` presets (`strong`,
  `normal`, `subtle`, `subtler`) share a single animated `<Tabs.Indicator>`
  whose geometry follows the active tab via Base UI's `--active-tab-*` CSS
  variables, with `prefers-reduced-motion` honoured. Roadie's `direction`
  prop renames Base UI's `orientation`; vertical mode left-aligns tab content
  and swaps the `subtler` underline onto the left edge. Per-file leaves with
  a server-safe `index.tsx` keep the compound RSC-safe via both the new
  `@oztix/roadie-components/tabs` subpath and the root barrel.

## 2.4.0

### Minor Changes

- 225ce2c: **Theming API improvements — controlled accent, validation, and pre-hydration bootstrap**

  Add a new declarative theming surface on `ThemeProvider` plus the pieces
  needed to eliminate the "flash of default accent" on static-export apps.

  **New exports from `@oztix/roadie-components`:**
  - `DEFAULT_ACCENT_COLOR` — the Oztix blue default, previously
    module-local.
  - `InvalidColorError` / `isValidHexColor` — validation primitives.
    Consumers can guard untrusted hex at the fetch boundary instead of
    reinventing a zod schema.
  - `getAccentStyleTagSync(hex)` — synchronous sibling of
    `getAccentStyleTag`. Returns a full `<style>` tag with
    `--accent-hue` and `--accent-chroma`, ready for framework-agnostic
    `<head>` injection. Uses the new sync sRGB→OKLCH converter in core.
  - `getAccentStyleSync(hex)` — returns just the inner CSS body
    (`:root{--accent-hue:...;--accent-chroma:...}`), for React consumers
    that want to wrap it in a real `<style>` element via
    `dangerouslySetInnerHTML`.
  - `getBootstrapScript(opts)` — re-exported from `@oztix/roadie-core`.
    Composes `getThemeScript` + an optional accent style tag into one
    head injection for apps that want to do the whole bootstrap in one
    line.

  **Controlled `accentColor` prop on `ThemeProvider`:**

  ```tsx
  <ThemeProvider accentColor={collection?.themeColour ?? null}>
    {children}
  </ThemeProvider>
  ```

  - Pass `undefined` (or omit the prop) to stay uncontrolled — the old
    `defaultAccentColor`-seeded behaviour is unchanged.
  - Pass a hex string to take control: the prop overrides internal state
    on every render, imperative `setAccentColor` calls become no-ops with
    a dev warning, and there's no effect sync or cleanup to wire up.
  - Pass `null` to opt into controlled mode while falling back to
    `defaultAccentColor` (ideal for `collection?.themeColour ?? null`).
  - Invalid hex input in a controlled prop logs a dev warning and falls
    back to the default — the provider never renders with a broken
    theme.

  **`setAccentColor` now throws synchronously** with `InvalidColorError`
  when the argument isn't a valid hex. Previously the call "succeeded"
  and threw inside the async accent effect with no handler path. If your
  app validates at the boundary (or uses the new `isValidHexColor`
  helper), there's nothing to change.

  **Why this matters.** Consumer apps that theme from async data
  (per-tenant branding, promoter-coloured collection pages, feature
  flags) can now drop their bespoke effect-based accent sync, their
  hex validator, and their hardcoded default constant. The imperative
  API remains for simple cases like in-app colour pickers.

### Patch Changes

- Updated dependencies [225ce2c]
  - @oztix/roadie-core@2.1.0

## 2.3.0

### Minor Changes

- d317bad: Phase 3 of the `2026-04-15-refactor-components-consistency-cleanup-plan`. Every compound in the package is now **RSC-safe by construction**: consumers can render `<Fieldset>`, `<Accordion>`, `<Card>`, `<Carousel>`, `<Combobox>`, `<Select>`, `<Autocomplete>`, `<RadioGroup>`, `<Steps>`, `<Field>`, `<Breadcrumb>` — and dot into their sub-components like `<Accordion.Item>`, `<Select.Trigger>`, `<Carousel.Content>` — from a Next.js server component, via either the root barrel or the new per-compound subpath entries. The minor bump is for the new subpath surface and the new `.Root` alias; the bare-root consumer form (`<Compound>`) is unchanged so **nothing existing breaks**.

  **Zero breaking change.** `Fieldset === Fieldset.Root` (same function reference), and every other compound follows suit. Existing code using bare `<Fieldset>` / `<Card>` / `<Accordion>` works exactly as before. `.Root` is a Base UI-parity alias, not a required migration.

  **New subpath entries.** Every compound ships from its own subpath (`@oztix/roadie-components/fieldset`, `/card`, `/accordion`, `/select`, `/combobox`, `/autocomplete`, `/radio-group`, `/carousel`, `/steps`, `/field`, `/breadcrumb`, …). 24 subpath keys generated into `package.json`'s `exports` block. Subpath form is preferred in Next.js consumers because it scopes the compiler walk to one compound.

  **New: `data-slot` attribute on every rendered DOM element.** Shadcn-style addressable markers — `<Fieldset.Legend>` renders `data-slot="fieldset-legend"`, `<Carousel.NavButton>` renders `data-slot="carousel-nav-button"`. Consumers can target these in CSS, Tailwind variants, visual regression tooling, and tests without depending on internal class names.

  **New sub-component prop-type exports on the barrel.** Breadcrumb, Card, Field, Steps, Autocomplete, Combobox, Select, Carousel, RadioGroup, Fieldset, Accordion all now export their full per-sub-component prop type surface (e.g. `BreadcrumbListProps`, `CardHeaderProps`, `SelectTriggerProps`, `CarouselContentProps`, `StepsItemProps`, etc.) for consumers annotating custom wrappers.

  **Build shape: tsdown `unbundle: true`.** Previously the components package bundled each compound folder into a single dist file; it now emits one dist file per source file, preserving the source directory structure 1:1 under `dist/components/<Compound>/`. Rolldown (tsdown's backend) preserves `'use client'` on per-file outputs natively, so the directive stays exactly where it's marked in source. Each compound's `index.tsx` ships **without** `'use client'` — it's a server-safe property-assignment layer that Next.js can follow through to each leaf at build time. This is the load-bearing change that makes dot-access work across the RSC boundary.

  **11 compounds migrated** (pilot + follow-ups): Fieldset, Accordion, RadioGroup, Breadcrumb, Card, Steps, Field, Select, Autocomplete, Combobox, Carousel. Every compound folder now contains per-file sub-component leaves, a shared `*Context.ts` where needed, `variants.ts` where it has CVA maps, a server-safe `index.tsx` attachment layer, and a test file exercising both `<Compound>` (canonical) and `<Compound.Root>` (alias) forms.

  Full rationale, the three rejected attempts, and the authoring checklist for new compounds are in [`docs/solutions/rsc-patterns/compound-export-namespace.md`](../docs/solutions/rsc-patterns/compound-export-namespace.md) and [`docs/contributing/COMPOUND_PATTERNS.md`](../docs/contributing/COMPOUND_PATTERNS.md).

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
