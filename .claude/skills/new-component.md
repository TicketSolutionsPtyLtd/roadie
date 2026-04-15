---
name: new-component
description: Create a new Roadie component end-to-end (files, tests, exports, doc page). Triggers on "add component", "new Roadie component", "scaffold a component".
user_invocable: true
---

# New Component

Scaffold a new Roadie design system component. This is a workflow — the
actual patterns live in reference docs. Read them first, then execute.

## Required reading (before writing code)

1. [`AGENTS.md`](../../AGENTS.md) — overall patterns (intent/emphasis, CVA,
   layout, shape, typography, interaction utilities).
2. [`docs/contributing/COMPOUND_PATTERNS.md`](../../docs/contributing/COMPOUND_PATTERNS.md)
   — **required** for any component with sub-components. Canonical reference
   for the per-file leaf layout, server-safe `index.tsx` property
   assignment, `data-slot` rules, and the `'use client'`-only-where-needed
   discipline that keeps compounds RSC-safe. A new compound that skips any
   of these falls out of sync with the rest of the codebase.
3. [`docs/contributing/BASE_UI.md`](../../docs/contributing/BASE_UI.md) —
   **required** if wrapping a Base UI primitive. Canonical reference for
   imports, types, `render` prop policy, data-attribute styling, and
   `'use client'` rules. Violating anything here will break
   `check:dts` or `check:exports`.
4. [`docs/contributing/COMPONENT_DOC_TEMPLATE.md`](../../docs/contributing/COMPONENT_DOC_TEMPLATE.md)
   — doc page structure, section order, applicability table.
5. [`docs/solutions/rsc-patterns/compound-export-namespace.md`](../../docs/solutions/rsc-patterns/compound-export-namespace.md)
   — why compounds ship the way they do. Read if anything about the
   authoring pattern feels arbitrary.
6. A similar existing component for a live reference:
   - **Single component**: `packages/components/src/components/Badge/index.tsx`
   - **Form control**: `packages/components/src/components/Input/index.tsx`
   - **Compound (per-file, post-Phase-3)**: `packages/components/src/components/Fieldset/`
   - **Compound (monolithic, pre-Phase-3 — migrating)**: `packages/components/src/components/Select/index.tsx`

## Decision: is this a compound?

- **Single component** (Badge, Input, Label) → one file, single `index.tsx`, section A below.
- **Compound** (Fieldset, Card, Select — multiple dot-notation sub-components like `Select.Trigger`, `Select.Popup`, etc.) → per-file layout, section B below.

## A. Single component workflow

1. **Create** `packages/components/src/components/{Name}/index.tsx` following the patterns in `AGENTS.md` and one of the reference components above.
   - **`data-slot={name}`** on the rendered root element (kebab-case, same as the subpath). Non-negotiable.
   - If wrapping a Base UI primitive, use the skeleton in `BASE_UI.md` §11.
2. **Test** `packages/components/src/components/{Name}/{Name}.test.tsx`. Assert CVA class names and behaviour. Default intent should NOT appear on default render.
3. **Export** from `packages/components/src/index.tsx`:
   ```tsx
   export { Foo, fooVariants, type FooProps } from './components/Foo'
   ```
4. **Regenerate subpath exports**:
   ```bash
   pnpm --filter @oztix/roadie-components generate:exports
   ```
5. **Document** at `docs/src/app/components/{name}/page.mdx` per `COMPONENT_DOC_TEMPLATE.md`. Default example first. Skip Intents section for form controls.
6. **Verify** (section D below).

## B. Compound component workflow (per-file)

The only shape that is RSC-safe with zero consumer migration. Every compound in the codebase ships (or is being migrated) to this layout.

1. **Create the folder** `packages/components/src/components/{Compound}/`.

2. **Per-file sub-components.** One file per leaf, named `{Compound}{Sub}.tsx` (`FieldsetRoot.tsx`, `FieldsetLegend.tsx`, …):
   - Add `'use client'` **only if** the leaf uses hooks, `createContext`, or wraps a Base UI client primitive. Pure presentational leaves ship server-safe — no directive.
   - Compound-prefixed function name (`FieldsetRoot`, not `Root`) for readable stack traces.
   - Exported `{Compound}{Sub}Props` type alias (prefer `type =` over `interface extends`).
   - Dot-notation `displayName` (`'Fieldset.Root'`, `'Fieldset.Legend'`).
   - **`data-slot` attribute** on the rendered DOM element. Kebab-case dot-path (`fieldset-legend`, `carousel-nav-button`). The root slot is just the compound name (`fieldset`, not `fieldset-root`). Position: immediately after the opening tag, before `className` and `...props`.

3. **Shared context** (if any) → `{Compound}Context.ts` with `'use client'` at the top (`createContext` at module scope forces a client module).

4. **CVA variants** (if any) → `variants.ts`.

5. **Subpath entry** `{Compound}/index.tsx`:
   - **Server-safe — no `'use client'` directive.** This is load-bearing; adding the directive reinstates the pre-Phase-3 client-reference-proxy wall and breaks dot access in server components.
   - Imports each leaf directly, type-casts the root to include sub-component properties, assigns each leaf, exports the augmented root and a `{Compound}Props` alias.
   - See `packages/components/src/components/Fieldset/index.tsx` for the exact shape.

6. **Tests** `{Compound}.test.tsx` — exercise **both** `<{Compound}>` (canonical bare root) and `<{Compound}.Root>` (alias) forms. Assert `{Compound} === {Compound}.Root` — they must be the same reference.

7. **Package barrel** `packages/components/src/index.tsx`:
   ```tsx
   export { Foo } from './components/Foo'
   ```
   Bare re-export — the root's attached properties carry through.

8. **Regenerate subpath exports**:
   ```bash
   pnpm --filter @oztix/roadie-components generate:exports
   ```

9. **RSC canary** `docs/src/app/debug/rsc-smoke/page.tsx` — add a section rendering `<{Compound}>` (bare root) + at least one sub-component via `import { {Compound} } from '@oztix/roadie-components/{kebab-compound}'`. This is the CI surface that fails the docs build if the compound regresses from RSC-safe.

10. **Doc page** `docs/src/app/components/{kebab-compound}/page.mdx`:
    - Import section: `import { {Compound} } from '@oztix/roadie-components/{kebab-compound}'`
    - Use bare `<{Compound}>` (not `<{Compound}.Root>`) in code examples — bare is canonical.
    - `<PropsDefinitions componentPath='packages/components/src/components/{Compound}' />` — point at the **folder**, not a single file. The parser enumerates every non-test `.tsx` file.

## C. Consumer surface (what you're building toward)

Both forms work in server and client components:

```tsx
import { Fieldset } from '@oztix/roadie-components/fieldset'

<Fieldset>                              // bare root — canonical
  <Fieldset.Legend>...</Fieldset.Legend>
  <Fieldset.HelperText>...</Fieldset.HelperText>
</Fieldset>
```

`<Fieldset.Root>` is a supported alias (literally `Fieldset === Fieldset.Root`), but docs should use the bare form everywhere.

## D. Verify

```bash
pnpm --filter @oztix/roadie-components build   # catches dts + attw + use-client issues
pnpm --filter @oztix/roadie-components test    # all tests, including the new Compound.test.tsx
pnpm --filter @oztix/roadie-components typecheck
pnpm --filter @oztix/roadie-components lint
pnpm --filter docs build                       # prerenders the RSC canary; fails if anything regresses
pnpm --filter docs dev                         # visual check at /components/{name}
```

If `pnpm typecheck` errors on something you didn't touch:

```bash
find . -name "*.tsbuildinfo" -not -path "*/node_modules/*" -delete && pnpm typecheck
```

(TypeScript's incremental cache can mask stale errors — see `docs/solutions/build-errors/stale-tsbuildinfo-masks-local-errors.md`.)

## Common pitfalls

- **Don't** add `'use client'` to `{Compound}/index.tsx`. It must stay server-safe — that's the whole trick behind RSC-safe property assignment. Marking it as a client module reinstates the client-reference-proxy wall and `<Compound.Sub>` breaks in server components.
- **Don't** add `'use client'` to pure presentational leaves. If a leaf has no hooks, no context, and no client primitive, it ships as a server-safe component.
- **Don't** skip `data-slot` on a new leaf. Every rendered DOM element carries one, including passthroughs of Base UI primitives. Consumers rely on it as the stable DOM-level selector.
- **Don't** use `<{Compound}.Root>` in new docs code — bare `<{Compound}>` is canonical. The `.Root` alias exists for Base UI parity, not as the preferred syntax.
- **Don't** use `export * as {Compound} from './parts'` on the library side. It compiles to a single namespace export whose dot access is a runtime proxy access in server components, which breaks. Use the property-assignment form from `packages/components/src/components/Fieldset/index.tsx` instead.
- **Don't** use `ComponentProps<typeof Primitive>` on Base UI parts — `check:dts` fails the build on this pattern. Use `BaseUI.Part.Props & RefAttributes<Element>` as documented in `BASE_UI.md` §4.
- **Don't** set a default intent in `defaultVariants`. Components inherit intent from CSS cascade.
- **Don't** forget `'use client'` on leaf files that import from `@base-ui/react/*` or use React hooks — the rule is "only where needed," not "never."
- **Don't** use `flex flex-col gap-*` for stacks — use `grid gap-*`.
- **Don't** hand-edit `packages/components/package.json`'s `exports` block. It's generated by `scripts/generate-package-exports.mjs`. Run `pnpm generate:exports`.
