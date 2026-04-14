# Compound export pattern for RSC safety

**Symptom.** A Next.js server component imports a Roadie compound and renders a subcomponent:

```tsx
import { Accordion } from '@oztix/roadie-components'

export default function Page() {
  return (
    <Accordion>
      <Accordion.Item value='a'>
        <Accordion.Trigger>A</Accordion.Trigger>
      </Accordion.Item>
    </Accordion>
  )
}
```

Next.js throws at render:

> Error: Cannot access .Item on the server. You cannot dot into a client module from a server component. You can only pass the imported name through.

## Root cause

The legacy pattern was function-plus-property-assignment:

```tsx
export function Accordion(props) { ... }
export function AccordionItem(props) { ... }
Accordion.Item = AccordionItem
```

When the consumer is a Next.js **server component** and the compound file carries `'use client'`, Next wraps the module in a **client-reference proxy**. The proxy only exposes top-level named exports as client references. `Accordion.Item = AccordionItem` is runtime property assignment on the client — invisible to the proxy on the server — so `Accordion.Item` resolves to `undefined`.

This is tracked upstream as [vercel/next.js#51593](https://github.com/vercel/next.js/issues/51593). Dan Abramov's canonical reply:

> "I'd say we don't generally consider this very idiomatic: `Object.assign(Navigation, { Brand: NavigationBrand, ... })`. The idiomatic way would be to express this with multiple exports. And then use `import * as Navigation`. … That's better for tree shaking etc too."

## Fix: Base UI's shape + tsdown unbundle mode

The fix has two halves. They're load-bearing together.

### Library side: per-file leaves + namespace re-export

Each compound is split into per-file sub-components. An `index.tsx` at the top of the compound folder does the **server-safe** namespace re-export:

```ts
// packages/components/src/components/Fieldset/index.tsx
// NO 'use client' — this file is a pure server-safe re-export layer.
export * as Fieldset from './parts'
```

```ts
// packages/components/src/components/Fieldset/parts.ts
// NO 'use client' — another pure re-export layer.
export { FieldsetRoot as Root } from './FieldsetRoot'
export type { FieldsetRootProps as RootProps } from './FieldsetRoot'

export { FieldsetLegend as Legend } from './FieldsetLegend'
export type { FieldsetLegendProps as LegendProps } from './FieldsetLegend'

// ... every other sub-component
```

Leaves carry `'use client'` only where they actually need it — when they use hooks, `createContext`, or wrap a Base UI client primitive:

```tsx
// FieldsetRoot.tsx — needs 'use client' because it provides React context
'use client'

import type { ComponentProps } from 'react'
import { cn } from '@oztix/roadie-core/utils'
import { FieldsetContext } from './FieldsetContext'

export type FieldsetRootProps = ComponentProps<'fieldset'> & {
  invalid?: boolean
}

export function FieldsetRoot({ className, invalid, ...props }: FieldsetRootProps) {
  return (
    <FieldsetContext value={{ invalid }}>
      <fieldset className={cn('m-0 border-none p-0', className)} {...props} />
    </FieldsetContext>
  )
}
FieldsetRoot.displayName = 'Fieldset.Root'
```

```tsx
// FieldsetLegend.tsx — pure presentational, no 'use client'
import type { ComponentProps } from 'react'
import { cn } from '@oztix/roadie-core/utils'

export type FieldsetLegendProps = ComponentProps<'legend'>

export function FieldsetLegend({ className, ...props }: FieldsetLegendProps) {
  return <legend className={cn('text-lg font-semibold text-strong', className)} {...props} />
}
FieldsetLegend.displayName = 'Fieldset.Legend'
```

### Build side: tsdown `unbundle: true`

The second load-bearing piece is in `packages/components/tsdown.config.ts`:

```ts
export default defineConfig({
  entry: ['src/**/*.{ts,tsx}', '!**/*.test.{ts,tsx}'],
  unbundle: true,
  // ...
})
```

Unbundle mode compiles every source file individually, preserving the source directory structure 1:1 in the output. Instead of one `dist/Fieldset.js` containing every leaf, tsdown produces:

```
dist/components/Fieldset/
  FieldsetRoot.js          # 'use client' preserved
  FieldsetLegend.js        # no directive — server-safe
  FieldsetHelperText.js    # no directive — server-safe
  FieldsetErrorText.js     # 'use client' preserved
  FieldsetContext.js       # 'use client' preserved (createContext)
  parts.js                 # no directive — server-safe re-export
  index.js                 # no directive — server-safe namespace re-export
```

Each leaf is its own on-disk module. Rolldown preserves `'use client'` on per-file outputs natively. `index.js` imports from `parts.js` which imports from the individual leaves — the static re-export chain Next.js follows at build time to resolve `Fieldset.Root` → a client reference at the leaf.

### Consumer surface

```tsx
// app/page.tsx — a Next.js server component
import { Fieldset } from '@oztix/roadie-components/fieldset'

export default function Page() {
  return (
    <Fieldset.Root>
      <Fieldset.Legend>Contact information</Fieldset.Legend>
      <Fieldset.HelperText>We'll get back to you.</Fieldset.HelperText>
    </Fieldset.Root>
  )
}
```

Base UI's exact import form. Bare `import { Fieldset }`, dot access via `<Fieldset.Root>`, works in server components, works in client components, works from the barrel (`@oztix/roadie-components`), works from the subpath (`@oztix/roadie-components/fieldset`).

## Why this works

Next.js server components can import from modules that are themselves server-safe (no `'use client'`). When a server-safe module re-exports a client-safe module statically, Next follows the chain at build time and resolves each named export to the client reference it ultimately points at.

The chain for `<Fieldset.Root />` from a server component:

1. Consumer's server component does `import { Fieldset } from '@oztix/roadie-components/fieldset'`.
2. Resolves to `dist/components/Fieldset/index.js` — **server-safe**, no `'use client'`.
3. `index.js` does `export * as Fieldset from './parts'`, pulling in `parts.js` — also **server-safe**.
4. `parts.js` does `export { FieldsetRoot as Root } from './FieldsetRoot'`, pulling in `FieldsetRoot.js` — a **client module** with `'use client'`.
5. Next sees `Root` ultimately points at a client module, records it as a client reference, and the chain collapses statically to `Fieldset.Root = <client reference for FieldsetRoot>`.
6. On the server, `<Fieldset.Root>` is a JSX tag referencing a client reference. The RSC payload serializes a client-component boundary at that tag. Dot access on `Fieldset` is resolved at compile time against the namespace object that `export * as Fieldset` produces — it's not a proxy access at all.

The essential requirement: **the re-export layer must be a separate on-disk module from the client leaves**. Bundling `index.tsx` + `parts.ts` + the leaves into a single file forces a choice between marking the whole thing `'use client'` (and hitting the client-reference-proxy wall) or leaving it un-marked (and tripping Next's compile-time check on `createContext`). Tsdown unbundle mode is how we keep them separate.

Base UI's published `@base-ui/react/esm/combobox/` folder has exactly this shape — one file per leaf with `'use client'`, an `index.js` that does `export * as Combobox from './index.parts.js'`, and an `index.parts.js` aggregator, all on disk. Roadie matches that shape 1:1.

## Target folder layout

```
packages/components/src/components/Fieldset/
  FieldsetRoot.tsx          # 'use client' — provides FieldsetContext
  FieldsetLegend.tsx        # server-safe presentational leaf
  FieldsetHelperText.tsx    # server-safe presentational leaf
  FieldsetErrorText.tsx     # 'use client' — reads FieldsetContext
  FieldsetContext.ts        # 'use client' — module-scope createContext
  parts.ts                  # server-safe short-name re-export aggregator
  index.tsx                 # server-safe — export * as Fieldset from './parts'
  Fieldset.test.tsx         # namespace-level integration tests
```

## The `'use client'` rule

Mark files with `'use client'` **only where they actually need it**:

- **Always** — files that use React hooks (`useState`, `useEffect`, `useCallback`, `useMemo`, `useRef`, `useReducer`, `useContext`, `use`, etc.)
- **Always** — files that call `createContext` at module scope
- **Always** — files that wrap a Base UI client primitive
- **Never** — pure presentational leaves (function components that just render HTML)
- **Never** — `index.tsx` and `parts.ts` aggregators (pure re-exports)
- **Never** — variant maps, type-only files, non-React utilities

Stricter than the old rule-of-thumb "mark every compound leaf" — under unbundle mode, pure presentational leaves ship as server-safe components, matching Base UI's shape.

## Package shape

Each compound gets a kebab-case subpath entry in `packages/components/package.json`:

```json
{
  "exports": {
    ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" },
    "./fieldset": {
      "types": "./dist/components/Fieldset/index.d.ts",
      "import": "./dist/components/Fieldset/index.js"
    }
  }
}
```

The generator script `packages/components/scripts/generate-package-exports.mjs` produces the map from the `packages/components/src/components/` folder listing. **Hand-editing the `exports` block is forbidden** — run `pnpm --filter @oztix/roadie-components generate:exports`, or let `pnpm build` do it automatically.

## RSC canary

`docs/src/app/debug/rsc-smoke/page.tsx` is a permanent **server component** debug route. It renders every migrated compound's `.Root` plus at least one sub-component via both the subpath import (`@oztix/roadie-components/fieldset`) and the barrel (`@oztix/roadie-components`) to verify both forms work in server components. If a future compound regresses from RSC-safe — via property assignment, wrong export shape, or accidentally turning off unbundle mode — the docs build fails here.

## References

- [vercel/next.js#51593 — "Dot notation client component breaks consuming RSC"](https://github.com/vercel/next.js/issues/51593)
- [Dan Abramov's reply recommending multiple exports + namespace form](https://github.com/vercel/next.js/issues/51593#issuecomment-1748001262)
- [vercel/next.js#60449 — barrel-file client-reference proxy boundary](https://github.com/vercel/next.js/issues/60449)
- [Next.js `'use client'` directive docs](https://nextjs.org/docs/app/api-reference/directives/use-client)
- [tsdown unbundle mode](https://tsdown.dev/options/unbundle)
- `@base-ui/react@1.3.0` on-disk source — `node_modules/.pnpm/@base-ui+react@1.3.0.../esm/combobox/`
- `docs/contributing/COMPOUND_PATTERNS.md` — authoring checklist
- `docs/plans/2026-04-15-refactor-components-consistency-cleanup-plan.md` — Phase 3 migration plan
