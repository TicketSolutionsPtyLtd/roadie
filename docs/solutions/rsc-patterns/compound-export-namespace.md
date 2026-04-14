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

Or, with a refactored-but-still-wrong approach that ships the namespace as a single export, the server component renders but React throws at runtime:

> Error: Element type is invalid: expected a string (for built-in components) or a class/function (for composite components) but got: undefined.

## Root cause

The legacy pattern was function-plus-property-assignment:

```tsx
export function Accordion(props) { ... }
export function AccordionItem(props) { ... }
Accordion.Item = AccordionItem
```

When the consumer is a Next.js **server component** and the compound file carries `'use client'`, Next wraps the module in a **client-reference proxy**. The proxy only exposes top-level named exports as client references. `Accordion.Item = AccordionItem` is runtime property assignment on the client — invisible to the proxy on the server — so `Accordion.Item` resolves to `undefined`.

This is tracked upstream as [vercel/next.js#51593](https://github.com/vercel/next.js/issues/51593). Dan Abramov's canonical reply:

> "I'd say we don't generally consider this very idiomatic: `Object.assign(Navigation, { Brand: NavigationBrand, ... })`. The idiomatic way would be to express this with **multiple exports**. And then use `import * as Navigation`. … That's better for tree shaking etc too."

The emphasis matters: "multiple exports" on the **library** side, `import * as` on the **consumer** side. Both halves are necessary.

## The fix

### Library: flat top-level exports

Each compound is split into per-file sub-components. The compound's subpath entry (`index.tsx`) re-exports them as flat, top-level named exports — no namespace wrapping on the library side:

```ts
// packages/components/src/components/Fieldset/index.tsx
'use client'

export * from './parts'
```

```ts
// packages/components/src/components/Fieldset/parts.ts
'use client'

export { FieldsetRoot as Root } from './FieldsetRoot'
export type { FieldsetRootProps as RootProps } from './FieldsetRoot'

export { FieldsetLegend as Legend } from './FieldsetLegend'
export type { FieldsetLegendProps as LegendProps } from './FieldsetLegend'

// ... every other sub-component
```

The resulting `@oztix/roadie-components/fieldset` subpath ships four top-level exports: `Root`, `Legend`, `HelperText`, `ErrorText`. Each one becomes its own top-level client reference when a Next.js server component imports it.

### Consumer: `import * as` creates the namespace on its side

```tsx
// app/page.tsx — a Next.js server component
import * as Fieldset from '@oztix/roadie-components/fieldset'

export default function Page() {
  return (
    <Fieldset.Root>
      <Fieldset.Legend>Contact information</Fieldset.Legend>
      <Fieldset.HelperText>We'll get back to you.</Fieldset.HelperText>
    </Fieldset.Root>
  )
}
```

`import * as Fieldset` creates a **consumer-side** namespace object. `Fieldset.Root` is a compile-time property access on that local object — the JavaScript compiler resolves it statically, before any runtime proxy is involved. Each dot access maps to a top-level client reference in the library, which Next.js can honour.

RSC-safe end to end. No client wrapper. No barrel walking.

## Why `export * as Namespace` on the library side **doesn't** fix it

It's tempting to ship the namespace from the library directly:

```ts
// ❌ Doesn't work
export * as Fieldset from './parts'
```

This compiles to a single top-level export named `Fieldset` whose value is a namespace object. From Next.js's server-component point of view, this is **one** client reference — the namespace as a whole. Dotting into it (`Fieldset.Root`) is runtime property access on a client-reference proxy, which is the exact same failure mode as `Compound.Sub = SubFn` property assignment.

Base UI's published `combobox/index.js` happens to use `export * as Combobox from './index.parts.js'`, but that works for them because each leaf is its **own on-disk file** (`combobox/root/ComboboxRoot.js`, etc.). Base UI consumers don't import from that namespace entry at all in practice — subpath imports or deep imports resolve directly to the leaf modules, each of which is a separate top-level `'use client'` module from Next's perspective.

Roadie ships one bundled file per compound (`dist/Fieldset.js`) via tsdown, so mimicking Base UI's on-disk layout isn't free. The flat-library + consumer-side-`import *` split gives us the same RSC safety in a single bundled module.

## Target folder layout

```
packages/components/src/components/Fieldset/
  FieldsetRoot.tsx          # 'use client' + function + displayName 'Fieldset.Root'
  FieldsetLegend.tsx        # 'use client' + function + displayName 'Fieldset.Legend'
  FieldsetHelperText.tsx    # 'use client'
  FieldsetErrorText.tsx     # 'use client' — reads FieldsetContext
  FieldsetContext.ts        # 'use client' + createContext
  parts.ts                  # 'use client' + short-name re-export aggregator
  index.tsx                 # 'use client' + export * from './parts'
  Fieldset.test.tsx         # namespace-level integration tests
```

## Rule: every file in the compound folder has `'use client'`

Roadie bundles each compound's folder into one tsdown entry plus shared chunks. Rolldown (tsdown's backend) preserves `'use client'` on entry outputs, but **not** reliably on shared chunks derived from a mix of directive / no-directive sources. In practice, every `.ts` / `.tsx` file in a compound folder — including the `parts.ts` aggregator, `index.tsx` namespace entry, and `*Context.ts` — must carry the directive. This guarantees the built chunk is marked as a client module regardless of how rolldown chooses to split code.

Pure presentational leaves (no hooks, no context) still get `'use client'`. The RSC safety property we need isn't "every leaf renders on the server" — it's "the server component can import the module and dot into it without proxy failure." Every Base UI leaf is `'use client'` too; we're matching that contract.

## Leaf file shape

```tsx
// FieldsetRoot.tsx
'use client'

import type { ComponentProps } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { FieldsetContext } from './FieldsetContext'

export type FieldsetRootProps = ComponentProps<'fieldset'> & {
  invalid?: boolean
}

export function FieldsetRoot({
  className,
  invalid,
  ...props
}: FieldsetRootProps) {
  return (
    <FieldsetContext value={{ invalid }}>
      <fieldset className={cn('m-0 border-none p-0', className)} {...props} />
    </FieldsetContext>
  )
}
FieldsetRoot.displayName = 'Fieldset.Root'
```

Notes:

- **Function name stays compound-prefixed** (`FieldsetRoot`) for readable stack traces and React DevTools.
- **`displayName` is dot-notation** (`'Fieldset.Root'`) — `<PropsDefinitions>` derives its accordion headings from this value.
- **Types live beside their function** — consumers reach them via the subpath import.

## Passthrough file shape

When a sub-component is a direct re-export of a Base UI primitive, the leaf is a one-line passthrough:

```tsx
// ComboboxPortal.tsx
'use client'

import { Combobox as ComboboxPrimitive } from '@base-ui-components/react/combobox'

export const ComboboxPortal = ComboboxPrimitive.Portal
export type ComboboxPortalProps = ComboboxPrimitive.Portal.Props
```

## Type access

Types are reachable the same way as values:

```tsx
import * as Fieldset from '@oztix/roadie-components/fieldset'

type RootProps = Fieldset.RootProps
type LegendProps = Fieldset.LegendProps
```

For edge cases, `ComponentProps<typeof Fieldset.Root>` always works.

## The package barrel

The root `@oztix/roadie-components` barrel still exists for compatibility, but its semantics are slightly different: it **synthesises** the `Fieldset` namespace with an internal `import * as`:

```ts
// packages/components/src/index.tsx
import * as Fieldset from './components/Fieldset'

export { Fieldset }
```

Consumers that use `import { Fieldset } from '@oztix/roadie-components'` still get a namespace-shaped `Fieldset` at runtime, and the dot-access form works inside client components. But server components importing from the barrel hit the client-reference-proxy wall the same way the old property-assignment pattern did — the barrel's `Fieldset` is a single named export whose dot access is a proxy property access. Server components must use the subpath form:

```tsx
// ✅ Server component — use the subpath
import * as Fieldset from '@oztix/roadie-components/fieldset'

// ⚠️ Barrel import works in client components only
import { Fieldset } from '@oztix/roadie-components'
```

This is the non-negotiable reason subpath imports are canonical: the barrel cannot provide RSC safety no matter how it's shaped.

## Subpath package exports

Each compound gets a kebab-case subpath entry in `packages/components/package.json`:

```json
{
  "exports": {
    ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" },
    "./fieldset": {
      "types": "./dist/Fieldset.d.ts",
      "import": "./dist/Fieldset.js"
    }
  }
}
```

The generator script `packages/components/scripts/generate-package-exports.mjs` produces the map from the `packages/components/src/components/` folder listing. **Hand-editing the `exports` block is forbidden** — run `pnpm --filter @oztix/roadie-components generate:exports` instead, or let `pnpm build` do it automatically.

Roadie uses **tsdown** (not tsup) as its bundler. `tsdown.config.ts` already reads every folder in `src/components/` and produces one `dist/<PascalCase>.js` output per folder, so the generator only touches `package.json` — no bundler config changes are required when adding or removing a compound.

## RSC canary

`docs/src/app/debug/rsc-smoke/page.tsx` is a permanent **server component** debug route. It renders every migrated compound's `.Root` plus at least one sub-component via `import * as` from the subpath. If a future compound regresses from RSC-safe, the docs build fails — either with "You cannot dot into a client module" (if someone reintroduces property assignment) or with "Element type is invalid" (if someone ships the namespace as a single `export * as`). Every new compound authoring step includes "add a section to the RSC canary page."

## References

- [vercel/next.js#51593 — "Dot notation client component breaks consuming RSC"](https://github.com/vercel/next.js/issues/51593)
- [Dan Abramov's reply recommending multiple exports + `import * as`](https://github.com/vercel/next.js/issues/51593#issuecomment-1748001262)
- [vercel/next.js#60449 — barrel-file client-reference proxy boundary](https://github.com/vercel/next.js/issues/60449)
- [Next.js `'use client'` directive docs](https://nextjs.org/docs/app/api-reference/directives/use-client)
- [Next.js `optimizePackageImports`](https://nextjs.org/docs/app/api-reference/config/next-config-js/optimizePackageImports)
- `docs/contributing/COMPOUND_PATTERNS.md` — authoring checklist
- `docs/plans/2026-04-15-refactor-components-consistency-cleanup-plan.md` — Phase 3 migration plan
