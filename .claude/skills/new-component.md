---
name: new-component
description: Create a new Roadie component with CVA variants, tests, exports, and documentation
user_invocable: true
---

# New Component

Create a new Roadie design system component end-to-end.

## Steps

1. **Read references** before writing any code:
   - `AGENTS.md` for component patterns (CVA, intent/emphasis, interaction utilities, layout, shape, typography)
   - `docs/COMPONENT_DOC_TEMPLATE.md` for documentation structure
   - Foundation docs in `docs/src/app/foundations/` for detailed styling conventions
   - An existing similar component for real patterns (e.g., `Badge` for simple, `Select` for compound)

2. **Determine component type:**
   - **Simple** (Badge, Button, Code, Mark) — single element with CVA variants
   - **Compound** (Select, Accordion, Field, Combobox) — multiple sub-components composed via `Object.assign` on root

3. **Create component file** at `packages/components/src/components/{Name}/index.tsx`:

   **Imports pattern:**
   ```tsx
   import type { ComponentProps } from 'react'
   import { type VariantProps, cva } from 'class-variance-authority'
   import { cn } from '@oztix/roadie-core/utils'
   ```
   - For interactive components using Base UI: `import { X as XPrimitive } from '@base-ui/react/x'`
   - For icons: `import { XIcon } from '@phosphor-icons/react'` with `weight='bold'` and `className='size-4'`

   **CVA pattern:**
   ```tsx
   export const fooVariants = cva('base-classes', {
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
       emphasis: {
         strong: 'emphasis-strong',
         normal: 'emphasis-normal',
         subtle: 'emphasis-subtle',
         subtler: 'emphasis-subtler'
       },
       size: { /* component-specific */ }
     },
     defaultVariants: {
       emphasis: 'normal',
       size: 'md'
     }
   })
   ```

   **Key rules:**
   - **Do not set a default intent** in `defaultVariants` — components inherit intent from CSS cascade
   - Use `cn()` from `@oztix/roadie-core/utils` for className merging
   - Use `is-interactive` for clickable elements, `is-interactive-field` for form inputs
   - Use `grid gap-*` for internal layout (not `flex flex-col`)
   - Border-radius tiers: `rounded-full` (buttons/badges/pills), `rounded-xl` (cards/popovers), `rounded-lg` (form inputs), `rounded-md` (code), `rounded-2xl` (modals)
   - All `emphasis-*`, `intent-*`, `is-interactive` utilities are from Roadie core CSS — not Tailwind plugins

   **Type pattern:**
   ```tsx
   export interface FooProps
     extends ComponentProps<'div'>,  // or ComponentProps<typeof Primitive>
       VariantProps<typeof fooVariants> {}
   ```

   **Component pattern:**
   ```tsx
   export function Foo({ className, intent, emphasis, size, ...props }: FooProps) {
     return (
       <div
         className={cn(fooVariants({ intent, emphasis, size, className }))}
         {...props}
       />
     )
   }

   Foo.displayName = 'Foo'
   ```

   **Compound component pattern** (Select, Accordion, etc.):
   - Create sub-components as separate named functions with their own Props interfaces
   - Set `.displayName` on each: `FooItem.displayName = 'Foo.Item'`
   - Export compound via `Object.assign`:
     ```tsx
     export const Foo = Object.assign(FooRoot, {
       Item: FooItem,
       Content: FooContent,
     })
     ```

   **Form component extras:**
   - Import and use `useFieldContext` from `../Field` for Field integration
   - Support `invalid`, `required`, `disabled` from Field context
   - Wire up `aria-labelledby`, `aria-describedby`, `aria-invalid`, `aria-required`

   **Directives:**
   - Add `'use client'` at the top for any component that uses hooks, context, or event handlers
   - Components that are purely presentational (no hooks/state) do not need `'use client'`

4. **Create test file** at `packages/components/src/components/{Name}/{Name}.test.tsx`:

   **Import pattern:**
   ```tsx
   import { render } from '@testing-library/react'
   import userEvent from '@testing-library/user-event'
   import { describe, expect, it, vi } from 'vitest'

   import { Foo } from '.'
   ```

   **Test coverage:**
   - Default rendering (correct tag, base classes present)
   - Each emphasis variant applies correct class (`emphasis-strong`, `emphasis-normal`, etc.)
   - Each size variant applies correct class
   - Intent variants apply correct class (`intent-accent`, `intent-danger`, etc.)
   - Default intent is NOT set (verify no `intent-*` class on default render)
   - Disabled state if applicable
   - Custom className forwarding
   - Click handler if interactive
   - Combined props work together

5. **Add exports** to `packages/components/src/index.tsx`:
   ```tsx
   export { Foo, fooVariants, type FooProps } from './components/Foo'
   ```
   - Export the component, variants, and all public type interfaces
   - For compound components, export all sub-component prop types too

6. **Create doc page** at `docs/src/app/components/{name}/page.mdx`:
   - Follow `docs/COMPONENT_DOC_TEMPLATE.md` exactly
   - Include only applicable sections (see template's applicability table)
   - metadata: title, description, status ('beta'), category
   - No Intents section for form controls (Input, Textarea, Select, Field, RadioGroup)
   - States section for interactive components — single example with all states labelled
   - Use `tsx-live` code fence for interactive examples

7. **Verify**:
   - `pnpm --filter @oztix/roadie-components build`
   - `pnpm test`
   - `pnpm --filter docs dev` and check the new page renders
