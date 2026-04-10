---
name: new-component
description: Create a new Roadie component end-to-end (file, tests, exports, doc page). Triggers on "add component", "new Roadie component", "scaffold a component".
user_invocable: true
---

# New Component

Scaffold a new Roadie design system component. This is a workflow — the
actual patterns live in reference docs. Read them first, then execute.

## Required reading (before writing code)

1. [`AGENTS.md`](../../AGENTS.md) — overall patterns (intent/emphasis, CVA,
   layout, shape, typography, interaction utilities).
2. [`docs/contributing/BASE_UI.md`](../../docs/contributing/BASE_UI.md) —
   **required** if wrapping a Base UI primitive. Canonical reference for
   imports, types, `render` prop policy, data-attribute styling, and
   `'use client'` rules. Violating anything in here will break
   `check:dts` or `check:exports`.
3. [`docs/contributing/COMPONENT_DOC_TEMPLATE.md`](../../docs/contributing/COMPONENT_DOC_TEMPLATE.md)
   — doc page structure, section order, applicability table.
4. A similar existing component for a live reference:
   - **Simple**: `packages/components/src/components/Badge/index.tsx`
   - **Compound** (Base UI): `packages/components/src/components/Select/index.tsx`
   - **Form control**: `packages/components/src/components/Input/index.tsx`

## Workflow

1. **Create** `packages/components/src/components/{Name}/index.tsx`
   following the patterns in the references above. If wrapping a Base UI
   primitive, use the skeleton template in `BASE_UI.md` §11.

2. **Test** `packages/components/src/components/{Name}/{Name}.test.tsx`.
   Assert CVA class names (`emphasis-strong`, `intent-accent`) and
   behaviour. Default intent should NOT appear on default render.

3. **Export** from `packages/components/src/index.tsx`:
   ```tsx
   export { Foo, fooVariants, type FooProps } from './components/Foo'
   ```
   Export the component, variants, and all public prop types (including
   sub-component types for compound components).

4. **Document** at `docs/src/app/components/{name}/page.mdx` following
   `COMPONENT_DOC_TEMPLATE.md`. Default example first. Skip Intents
   section for form controls.

5. **Verify**:
   ```bash
   pnpm --filter @oztix/roadie-components build   # catches dts + attw issues
   pnpm --filter @oztix/roadie-components test
   pnpm --filter docs dev                         # visual check at /components/{name}
   ```

## Common pitfalls

- **Don't** use `ComponentProps<typeof Primitive>` on Base UI parts — the
  `check:dts` guard in `packages/components/package.json` fails the build
  on this pattern. Use `BaseUI.Part.Props & RefAttributes<Element>` as
  documented in `BASE_UI.md` §4.
- **Don't** set a default intent in `defaultVariants`. Components inherit
  intent from CSS cascade.
- **Don't** forget `'use client'` on files that import from
  `@base-ui/react/*` or use React hooks.
- **Don't** use `flex flex-col gap-*` for stacks — use `grid gap-*`.
