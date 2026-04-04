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

2. **Create component file** at `packages/components/src/components/{Name}/index.tsx`:
   - Use CVA for variants (intent, emphasis, size as applicable)
   - **Do not set a default intent** in `defaultVariants` — components inherit intent from CSS cascade
   - Use `cn()` from `@oztix/roadie-core/utils` for className merging
   - Use emphasis utilities for visual presentation
   - Use `is-interactive` for clickable elements, `is-interactive-field` for form inputs
   - Use `grid gap-*` for internal layout (not `flex flex-col`)
   - Use the correct border-radius tier: `rounded-full` (buttons/badges), `rounded-xl` (cards/popovers), `rounded-lg` (fields), `rounded-md` (code)
   - Export variants and component
   - Add `'use client'` directive
   - Add `.displayName`

3. **Create test file** at `packages/components/src/components/{Name}/{Name}.test.tsx`:
   - Test default rendering
   - Test each variant (intent, emphasis, size)
   - Test disabled state if applicable
   - Test custom className forwarding
   - Test HTML attribute forwarding
   - Assert CVA class names (e.g. `intent-brand`, `emphasis-strong`)

4. **Add export** to `packages/components/src/index.tsx`

5. **Create doc page** at `docs/src/app/components/{name}/page.mdx`:
   - Follow `docs/COMPONENT_DOC_TEMPLATE.md` exactly
   - Include only applicable sections
   - metadata: title, description, status ('beta'), category
   - No Intents section for form controls
   - States section for interactive components

6. **Verify**:
   - `pnpm --filter @oztix/roadie-core build`
   - `pnpm test`
   - `pnpm --filter docs dev` and check the new page
