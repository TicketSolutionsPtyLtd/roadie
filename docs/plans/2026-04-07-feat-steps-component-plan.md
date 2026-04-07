---
title: Steps Component
type: feat
status: active
date: 2026-04-07
---

# Steps Component

## Overview

A multi-step wizard/stepper component for Roadie v2, wrapping `@ark-ui/react/steps` for accessible state management and keyboard navigation. Styled with Tailwind v4 utilities + CVA, following Roadie's compound component pattern.

The existing v1 Steps component (in the Oztix website repo) uses Ark UI + Panda CSS. This v2 version ports the same Ark UI foundation to Roadie's Tailwind-based styling system with minimal dependency overhead.

## Problem Statement / Motivation

Multi-step forms are used across Oztix applications (sales enquiry, ticket buyer support, corporate enquiry). The current Steps component lives in the website repo with v1 Panda CSS shims. Moving it into Roadie v2 as a first-class component:

- Eliminates per-app reimplementation
- Ensures consistent step indicator styling across products
- Provides accessible keyboard navigation and ARIA roles out of the box
- Integrates with Roadie's intent/emphasis system

## Proposed Solution

### Dependency Strategy: Minimal Ark UI Import

Add `@ark-ui/react` as a dependency but import **only** `@ark-ui/react/steps`. The package supports deep imports and tree-shaking -- only the Steps state machine (Zag.js) ships to the consumer's bundle, not the full Ark UI library.

```ts
// Only this entry point is used -- tree-shaking drops everything else
import { Steps as ArkSteps } from '@ark-ui/react/steps'
```

**Bundle impact:** The Steps state machine from Zag.js is ~4-5KB gzipped. No other Ark UI components are imported. The `@ark-ui/react` package uses subpath exports (`@ark-ui/react/steps`, `@ark-ui/react/accordion`, etc.) so bundlers only include what's imported.

**Why Ark UI over building from scratch:**

- Steps requires complex state: linear vs free navigation, validation gating, step skipping, controlled/uncontrolled mode
- Ark UI provides accessible keyboard navigation (arrow keys between triggers, Enter/Space to activate) and ARIA roles (`tablist`/`tab`/`tabpanel`) automatically
- Building this natively would be 200+ lines of state management and ARIA wiring that Ark UI already handles correctly
- The Accordion uses native `<details>` because HTML provides that behavior for free -- there's no equivalent native element for steps

### Component Architecture

```
packages/components/src/components/Steps/
├── index.tsx        # Compound component, CVA variants, types, exports
└── Steps.test.tsx   # Tests
```

### Sub-components

| Part                     | Wraps                       | Purpose                                                                |
| ------------------------ | --------------------------- | ---------------------------------------------------------------------- |
| `Steps` (Root)           | `ArkSteps.Root`             | Container, accepts `count`, `step`, `linear`, `orientation`, callbacks |
| `Steps.List`             | `ArkSteps.List`             | Step indicator bar (renders as `<ol>` with `role="tablist"`)           |
| `Steps.Item`             | `ArkSteps.Item`             | Individual step container, requires `index`                            |
| `Steps.Trigger`          | `ArkSteps.Trigger`          | Clickable step label (`role="tab"`)                                    |
| `Steps.Indicator`        | `ArkSteps.Indicator`        | Circular number/check indicator                                        |
| `Steps.Separator`        | `ArkSteps.Separator`        | Connector line between steps                                           |
| `Steps.Content`          | `ArkSteps.Content`          | Step content panel (`role="tabpanel"`), requires `index`               |
| `Steps.CompletedContent` | `ArkSteps.CompletedContent` | Shown when all steps are done                                          |
| `Steps.NextTrigger`      | `ArkSteps.NextTrigger`      | Advance button (compose with `asChild` + Roadie Button)                |
| `Steps.PrevTrigger`      | `ArkSteps.PrevTrigger`      | Back button (compose with `asChild` + Roadie Button)                   |
| `Steps.Progress`         | `ArkSteps.Progress`         | Optional progress bar (uses `--percent` CSS variable)                  |
| `Steps.Context`          | `ArkSteps.Context`          | Render prop for accessing step state                                   |
| `Steps.RootProvider`     | `ArkSteps.RootProvider`     | External state control with `useSteps`                                 |

**Dropped from v1:** `TriggerText` -- unnecessary wrapper. Consumers use a `<span>` with utility classes inside `Steps.Trigger`. Responsive hiding is consumer-controlled via `sr-only sm:not-sr-only` or `hidden sm:block`, matching how other Roadie components handle responsive behavior (no built-in breakpoint opinions).

**Not yet consumed:** `CompletedContent`, `Progress`, `RootProvider`, and `Context` are thin Ark UI pass-throughs included for API completeness. None are used by current v1 consumers -- they're zero-cost to include but won't be tested against real usage until a consumer needs them.

### CVA Variants

```tsx
// packages/components/src/components/Steps/index.tsx

export const stepsVariants = cva('grid w-full gap-4', {
  variants: {
    intent: {
      neutral: 'intent-neutral',
      brand: 'intent-brand',
      'brand-secondary': 'intent-brand-secondary',
      accent: 'intent-accent',
      danger: 'intent-danger',
      success: 'intent-success',
      warning: 'intent-warning',
      info: 'intent-info'
    },
    orientation: {
      horizontal: '',
      vertical: 'grid-cols-[auto_1fr] gap-3'
    }
  },
  defaultVariants: {
    orientation: 'horizontal'
  }
})
```

**No intent default** -- intent flows via CSS cascade (per Roadie convention).

**No emphasis variant on root** -- the step indicators have fixed visual states (incomplete/current/complete) driven by Ark UI's `data-*` attributes. Unlike Accordion where emphasis changes the container treatment, Steps indicators need distinct states that don't map cleanly to the emphasis system.

### Indicator Visual States

Styled via Ark UI's data attributes, mapped to Roadie semantic tokens:

| State      | Attribute         | Background  | Border               | Text            |
| ---------- | ----------------- | ----------- | -------------------- | --------------- |
| Incomplete | `data-incomplete` | `bg-raised` | `border-subtle`      | `text-subtler`  |
| Current    | `data-current`    | `bg-subtle` | `border-strong`      | `text-normal`   |
| Complete   | `data-complete`   | `bg-strong` | `border-transparent` | `text-inverted` |

All states use Roadie's semantic tokens -- no arbitrary values needed. Inside an `intent-*` container, these automatically resolve to the correct intent palette. Dark mode works via the token system.

### Separator States

| State      | Attribute       | Color            |
| ---------- | --------------- | ---------------- |
| Incomplete | (default)       | `border-subtler` |
| Complete   | `data-complete` | `bg-strong`      |

### Completed Indicator Content

The indicator renders both the step number and a `CheckIcon` (Phosphor, weight `bold`, `size-4`), using CSS to toggle visibility based on Ark UI's data attributes. No JS state reading needed:

```tsx
// Implementation inside Steps.Indicator
<ArkSteps.Indicator className={cn(indicatorClasses, className)} {...props}>
  <span className='group-data-[complete]:hidden'>{children}</span>
  <CheckIcon
    weight='bold'
    className='hidden size-4 group-data-[complete]:block'
  />
</ArkSteps.Indicator>
```

The indicator element gets `group` so children can use `group-data-[complete]:` selectors. Consumers who want full control can skip `Steps.Indicator` and build their own using `Steps.Context`.

### NextTrigger / PrevTrigger Composition

These render as plain `<button>` elements by default. Consumers compose with Roadie's Button via Ark UI's `asChild`:

```tsx
<Steps.NextTrigger asChild>
  <Button intent='accent' emphasis='strong'>
    Next step <ArrowRightIcon weight='bold' className='size-4' />
  </Button>
</Steps.NextTrigger>
```

This matches the existing v1 usage pattern in StepNavigation.tsx.

### Progress Bar

Optional standalone element. Renders a bar that fills based on `--percent` CSS variable set by Ark UI on the Root. Styled with intent-aware fill color.

```css
/* Built into the component's className */
h-1 w-full bg-subtler rounded-sm overflow-hidden
/* Pseudo-element for fill */
after:absolute after:inset-y-0 after:left-0 after:bg-[var(--intent-9)]
after:transition-[width] after:duration-300 after:ease-out
after:w-[calc(var(--percent)*1%)]
```

### Re-exports

Re-export `useSteps` from Ark UI so consumers using `Steps.RootProvider` don't need to import from `@ark-ui/react` directly:

```tsx
// In packages/components/src/components/Steps/index.tsx
export { useSteps } from '@ark-ui/react/steps'
```

## Technical Considerations

### Bundle Size

- `@ark-ui/react/steps` pulls in the Zag.js steps machine (verify exact size during implementation)
- Tree-shaking ensures no other Ark UI components are included
- The `CheckIcon` from Phosphor is already a peer dependency

### Two Headless Libraries

This introduces `@ark-ui/react` alongside `@base-ui/react`. The rationale:

- Base UI has no Steps equivalent
- Only the `/steps` subpath is used -- this is a surgical addition, not a broad adoption
- The `asChild` pattern (Ark UI) vs `render` prop (Base UI) difference only surfaces on NextTrigger/PrevTrigger, which consumers rarely customize beyond `asChild` + Button
- Document this in AGENTS.md to prevent confusion

### Dark Mode

All colors use intent scale vars or semantic tokens. Dark mode swaps happen at the token level -- no `dark:` variants needed (per Roadie convention).

### Accessibility (Provided by Ark UI)

- `role="tablist"` on List, `role="tab"` on Triggers, `role="tabpanel"` on Content
- Arrow key navigation between triggers
- Enter/Space to activate triggers
- `aria-selected` on active trigger
- `aria-controls` linking triggers to content
- `aria-disabled` on disabled triggers (linear mode)
- Content panels focusable with `tabindex="0"`

### Validation UX

When `isStepValid` returns false and navigation is blocked:

- `onStepInvalid` callback fires -- consumer handles feedback (form validation, toast)
- The component itself does NOT render error states automatically
- This matches the existing v1 pattern where form validation is handled by `react-hook-form` + `useMultiStepForm`

## Acceptance Criteria

### Core

- [x] Component renders horizontal steps with circular indicators, separators, and content panels
- [x] `orientation="vertical"` renders steps vertically with content beside the list
- [x] `linear` mode restricts navigation to sequential order
- [x] Free navigation (default) allows clicking any step trigger
- [x] Indicators show three states: incomplete (muted), current (intent-tinted), complete (solid + check icon)
- [x] Separators change color when preceding step is complete
- [x] Content panels show/hide based on active step (instant swap, no animation)
- [x] `CompletedContent` renders when all steps are finished
- [x] `Progress` bar fills based on completion percentage

### Integration

- [x] Intent classes apply via CSS cascade (no default intent)
- [x] NextTrigger/PrevTrigger compose with Roadie Button via `asChild`
- [x] `useSteps` hook re-exported for RootProvider pattern
- [x] Controlled mode works (`step` + `onStepChange`)
- [x] Uncontrolled mode works (`defaultStep`)

### Styling

- [x] Uses `cn()` for all class merging
- [x] Custom `className` passthrough on all sub-components
- [x] Dark mode works via token system (no `dark:` variants)
- [x] No hardcoded colors -- all via semantic tokens or intent scale

### Quality

- [x] Tests: renders with default props, indicator states, orientation variant, className passthrough, context/intent inheritance
- [x] TypeScript: all props typed, exported types for Root and Item
- [x] Build: auto-discovered by tsup entry point config
- [x] Export: compound component + variants + types from `packages/components/src/index.tsx`

## Files to Create/Modify

### New Files

- `packages/components/src/components/Steps/index.tsx` -- Component implementation
- `packages/components/src/components/Steps/Steps.test.tsx` -- Tests

### Modified Files

- `packages/components/package.json` -- Add `@ark-ui/react` dependency
- `packages/components/src/index.tsx` -- Add Steps exports
- `AGENTS.md` -- Note Ark UI usage for Steps component

## Dependencies & Risks

**Dependencies:**

- `@ark-ui/react` (new dependency, only `/steps` subpath used)
- `@phosphor-icons/react` (existing peer dep, for `CheckIcon`)

**Risks:**

- Ark UI major version changes could break the component -- pin to a specific major version range
- If more components need Ark UI in the future, evaluate whether to migrate from Base UI entirely or maintain both

## Success Metrics

- Steps component is usable in the Oztix website multi-step forms (sales, support, corporate enquiry)
- Bundle size increase < 10KB gzipped
- No accessibility regressions vs the v1 component
- Documentation page with examples (horizontal, vertical, linear, free navigation, with Button composition)

## Sources & References

- Existing v1 component: `ticketsolutions.oztix.website/.../components/Form/Steps/Steps.tsx`
- Consumer usage: `ticketsolutions.oztix.website/.../contact/sales/SalesEnquiryForm.tsx`
- Ark UI Steps docs: https://ark-ui.com/docs/components/steps
- Roadie Accordion (compound component reference): `packages/components/src/components/Accordion/index.tsx`
- Roadie RadioGroup (context + Base UI reference): `packages/components/src/components/RadioGroup/index.tsx`
