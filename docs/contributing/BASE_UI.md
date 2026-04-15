# Base UI Authoring Guide

How Roadie wraps Base UI primitives. Read this before creating or modifying
any component that sits on top of `@base-ui/react`.

This guide codifies the existing Select / Combobox / Autocomplete / Button /
RadioGroup patterns so new components stay consistent. If you find yourself
doing something different, update the guide — don't drift.

External docs:

- Handbook: https://base-ui.com/react/overview/quick-start
- LLM reference: https://base-ui.com/llms.txt

## 1. Import pattern

Always import per-component from the subpath and alias to a namespace:

```tsx
import { Button as ButtonPrimitive } from '@base-ui/react/button'
import { Combobox as ComboboxPrimitive } from '@base-ui/react/combobox'
import { Radio } from '@base-ui/react/radio'
import { RadioGroup as RadioGroupPrimitive } from '@base-ui/react/radio-group'
import { Select as SelectPrimitive } from '@base-ui/react/select'
```

Never import from the package root (`@base-ui/react`). The per-component
subpath is what lets the consumer's bundler tree-shake unused primitives and
is what the `deps.neverBundle` pattern in `tsdown.config.ts` matches.

## 2. Compound component shape

Base UI primitives follow a canonical compound:

```
Root → Trigger → Portal → Positioner → Popup → Item
```

Roadie wraps them as **per-file leaves** with a server-safe `index.tsx`
that assigns each leaf as a static property on the root function.
Consumers write bare `<Select>` (or the `<Select.Root>` alias) plus dot
access for every sub-component (`<Select.Trigger>`, `<Select.Popup>`,
…). The pattern is RSC-safe end to end and works in both server and
client components from both the subpath and the root barrel.

**Before wrapping any Base UI compound, read
[`docs/contributing/COMPOUND_PATTERNS.md`](./COMPOUND_PATTERNS.md).**
It is the canonical reference for:

- Per-file folder layout
- Server-safe `index.tsx` property-assignment pattern
- `'use client'`-only-where-needed rule
- `data-slot` attribute convention
- Authoring checklist

See `packages/components/src/components/Fieldset/` for the reference
implementation (small compound). Larger compounds like Select / Combobox
/ Autocomplete are in the process of migrating from the pre-Phase-3
monolithic layout — treat `Fieldset` as the target shape.

## 3. The `render` prop (element replacement)

Base UI primitives accept a `render` prop to swap the underlying element.
There are three forms:

```tsx
// Element form — swap the tag
<Button render={<a href='/foo' />}>Link</Button>

// Component form — swap the component
<Button render={<NextLink href='/foo' />}>Link</Button>

// Function form — full control, spread props yourself
<Button render={(props, state) => <a {...props} data-active={state.pressed} />}>
  Link
</Button>
```

Rules for custom components used in `render`:

- They must use `forwardRef` (or React 19 refs-as-props).
- They must spread the provided props onto the rendered element.

### Policy for new components

When wrapping a Base UI primitive, **use Base UI's `render` prop** for
polymorphic rendering. Do not invent a custom `as` / `ElementType` / `asChild`
API on top of it.

`packages/components/src/components/Button/Button.tsx:51` is the in-repo reference: it sets
`nativeButton={!props.render}` so the default stays a `<button>` but a
consumer can pass `render={<a>}` to swap it out.

> The `as` / `ElementType` pattern in Breadcrumb, Card, and LinkButton is
> fine — those are **not** Base UI consumers. This policy applies only to
> new wrappers built on a Base UI primitive.

## 4. Type conventions

Base UI uses TypeScript union types for its part props. That breaks
`interface extends`, which silently widens unions. Rules:

**Base UI parts — use a type alias with intersection:**

```tsx
export type SelectTriggerProps = SelectPrimitive.Trigger.Props &
  RefAttributes<HTMLButtonElement> &
  VariantProps<typeof selectTriggerVariants>
```

- `type = X.Part.Props & RefAttributes<Element> & CustomExtras`
- Always intersect `RefAttributes<ElementType>` — Base UI's `Props` types do
  not include ref on their own.
- **Never** `interface SelectTriggerProps extends SelectPrimitive.Trigger.Props`.

**Native DOM wrappers — `interface extends` is fine:**

HelperText, ErrorText, Label and similar thin wrappers around raw DOM
elements can use the nominal form:

```tsx
interface FieldHelperTextProps extends ComponentProps<'p'> {}
```

**Never** use `ComponentProps<typeof X>` for Base UI parts. The
`check:dts` grep guard in `package.json` fails the build if that pattern
shows up in emitted declarations. Use the named `X.Part.Props` instead.

See commit d4f9539 for the incident that motivated these rules.

## 5. Styling via data attributes

Base UI exposes state as `data-*` attributes. Target them in Tailwind with
`data-[attr]:` variants. Common ones:

**Popup state:**

```
data-[popup-open]
data-[starting-style]
data-[ending-style]
```

**Selection / highlight:**

```
data-[highlighted]
data-[checked]
```

**Field state** (flows from Base UI Field):

```
data-[disabled]  data-[invalid]  data-[required]
data-[focused]   data-[valid]    data-[dirty]   data-[touched]
```

**Placement:**

```
data-[side]       (top | right | bottom | left)
data-[align]      (start | center | end)
```

**Placeholder (Select.Value):**

```
data-[placeholder]
```

Example — dim the Select value when the placeholder is showing:

```tsx
<SelectPrimitive.Value className='truncate data-[placeholder]:text-subtle' />
```

## 6. CSS custom properties exposed by Base UI

Use these for dynamic sizing/positioning instead of measuring in JS:

| Variable             | Where | Purpose                      |
| -------------------- | ----- | ---------------------------- |
| `--available-height` | Popup | Cap popup max-height         |
| `--available-width`  | Popup | Cap popup max-width          |
| `--anchor-width`     | Popup | Match trigger width          |
| `--anchor-height`    | Popup | Match trigger height         |
| `--transform-origin` | Popup | Scale-from-anchor animations |

Example — a popup that never overflows the viewport and grows up to the
trigger's width:

```tsx
<SelectPrimitive.Popup
  className={cn(
    'max-h-[var(--available-height)] max-w-[var(--available-width)]',
    'min-w-[var(--anchor-width)] overflow-y-auto',
    'origin-[var(--transform-origin)]',
    'data-[ending-style]:opacity-0 data-[starting-style]:scale-95'
  )}
/>
```

## 7. `'use client'` requirement

**Server-safe by default.** Do not add `'use client'` unless the
component calls a React hook (`useState`, `useEffect`, `useRef`, `useId`,
etc.), uses `createContext`, or wraps a Base UI primitive that needs a
client boundary. Pure presentational wrappers (e.g. `Input`, `Textarea`,
`Highlight`) must stay server-safe so Next.js consumers can render them
in server components without forcing the entire tree into the client
bundle.

Every file that imports from `@base-ui/react/*` (or uses React client
hooks like `useState`, `createContext`) must start with `'use client'`.

```tsx
'use client'

import { Select as SelectPrimitive } from '@base-ui/react/select'

// ...
```

This is load-bearing for Next.js / RSC consumers. tsdown (via Rolldown)
preserves the directive on the emitted entry file natively. Verify after
a build:

```bash
head -c 13 packages/components/dist/Select.js
# → "use client";
```

If you add a new Base UI wrapper and forget the directive, the docs site
build will fail with a server/client boundary error.

## 8. Roadie's intentional divergences

Two places where Roadie deviates from Base UI's default compound shape.
They are deliberate — don't "fix" them.

### `Select.Content` collapses Portal + Positioner + Popup

`packages/components/src/components/Select/index.tsx:425`

```tsx
export function SelectContent({ children, ...props }: SelectContentProps) {
  return (
    <SelectPortal>
      <SelectPositioner>
        <SelectPopup {...props}>{children}</SelectPopup>
      </SelectPositioner>
    </SelectPortal>
  )
}
```

Why: ~90% of consumers don't need to customise positioner and popup
separately. `Select.Portal`, `Select.Positioner`, and `Select.Popup`
remain exported for the 10% that do.

### `RadioGroup.Item` wraps Radio.Root + Indicator + label

`packages/components/src/components/RadioGroup/index.tsx:126`

A single `<RadioGroup.Item value='x' label='X' description='...' />`
replaces the raw Base UI compound of
`<Radio.Root><Radio.Indicator /></Radio.Root>` plus a sibling label.

Why: the raw compound is verbose for the common case (labelled radio in
a group). Consumers who need full control can still compose
`Radio.Root` directly.

## 9. Required app-level setup

Consumers embedding Roadie components must set these at the app root:

- `isolation: isolate` on a root element so portaled popups stack above
  app content without z-index battles.
- `position: relative` on `<body>` for iOS 26+ Safari backdrop
  correctness.

Both are documented in the Base UI quick-start. If you find they are
missing from `docs/src/app/layout.tsx`, fix it in the same PR.

## 10. Accessibility boundary

Base UI owns: keyboard navigation, focus management, ARIA roles and
states, roving tabindex, focus trap, and screen-reader announcements.

Roadie owns: visible focus styles (via `:focus-visible` or
`data-[focused]`), label text, `aria-label` on icon-only controls,
colour contrast, and `prefers-reduced-motion` handling.

Never reimplement what Base UI already does — if keyboard handling
feels wrong, check that you're spreading `...props` and not
intercepting `onKeyDown`.

## 11. Component skeleton template

Compound components ship as **per-file leaves + a server-safe `index.tsx`
property-assignment layer**. Drop these files into a new
`NewThing/` folder and adjust:

### `variants.ts`

```tsx
import { cva } from 'class-variance-authority'

import { intentVariants } from '../../variants'

export const newThingRootVariants = cva('base-classes is-interactive', {
  variants: {
    intent: intentVariants,
    emphasis: {
      normal: 'emphasis-normal',
      subtle: 'emphasis-subtle'
    },
    size: {
      sm: 'h-8 px-3',
      md: 'h-10 px-4'
    }
  },
  defaultVariants: { emphasis: 'normal', size: 'md' }
})
```

### `NewThingRoot.tsx` (leaf)

```tsx
'use client'

import { type RefAttributes } from 'react'

import { NewThing as NewThingPrimitive } from '@base-ui/react/new-thing'
import { type VariantProps } from 'class-variance-authority'

import { cn } from '@oztix/roadie-core/utils'

import { newThingRootVariants } from './variants'

export type NewThingRootProps = NewThingPrimitive.Root.Props &
  RefAttributes<HTMLDivElement> &
  VariantProps<typeof newThingRootVariants>

export function NewThingRoot({
  className,
  intent,
  emphasis,
  size,
  ...props
}: NewThingRootProps) {
  return (
    <NewThingPrimitive.Root
      data-slot='new-thing'
      className={cn(
        newThingRootVariants({ intent, emphasis, size, className })
      )}
      {...props}
    />
  )
}

NewThingRoot.displayName = 'NewThing.Root'
```

### `NewThingItem.tsx` (leaf)

```tsx
'use client'

import { type RefAttributes } from 'react'

import { NewThing as NewThingPrimitive } from '@base-ui/react/new-thing'

import { cn } from '@oztix/roadie-core/utils'

export type NewThingItemProps = NewThingPrimitive.Item.Props &
  RefAttributes<HTMLDivElement>

export function NewThingItem({ className, ...props }: NewThingItemProps) {
  return (
    <NewThingPrimitive.Item
      data-slot='new-thing-item'
      className={cn('data-[highlighted]:bg-subtle', className)}
      {...props}
    />
  )
}

NewThingItem.displayName = 'NewThing.Item'
```

### `index.tsx` (server-safe entry — **no `'use client'`**)

```tsx
// NO 'use client' — this file MUST stay a server-safe module. Under tsdown
// `unbundle: true`, it's emitted as its own dist file, and the property
// assignments below execute on the server. Adding 'use client' here
// reinstates the Next.js client-reference-proxy wall and breaks
// <NewThing.Item /> in server components.

import { NewThingItem } from './NewThingItem'
import { NewThingRoot } from './NewThingRoot'

const NewThing = NewThingRoot as typeof NewThingRoot & {
  Root: typeof NewThingRoot
  Item: typeof NewThingItem
}

NewThing.Root = NewThingRoot
NewThing.Item = NewThingItem

export { NewThing }
export type { NewThingRootProps as NewThingProps } from './NewThingRoot'
export { newThingRootVariants } from './variants'
```

### Consumer surface

```tsx
// Works in server components AND client components, via subpath OR barrel.
import { NewThing } from '@oztix/roadie-components/new-thing'

<NewThing>
  <NewThing.Item value='a'>A</NewThing.Item>
</NewThing>
```

Both `<NewThing>` and `<NewThing.Root>` resolve to the same function —
bare is canonical; `.Root` is a supported alias for Base UI parity.

See
[`docs/contributing/COMPOUND_PATTERNS.md`](./COMPOUND_PATTERNS.md)
for the full authoring checklist (13 steps), including the `data-slot`
rule, the `'use client'`-only-where-needed rule, tests, barrel
re-export, subpath generator, and RSC canary page. See
`packages/components/src/components/Fieldset/` for the reference
implementation.

## 12. Reference links

- Quick start: https://base-ui.com/react/overview/quick-start
- Styling / data attrs: https://base-ui.com/react/overview/styling
- Composition / render prop: https://base-ui.com/react/overview/composition
- TypeScript: https://base-ui.com/react/overview/typescript
- Forms & Field: https://base-ui.com/react/utils/field
- Accessibility: https://base-ui.com/react/overview/accessibility
- LLM reference (for future agent loads): https://base-ui.com/llms.txt
