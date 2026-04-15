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

## Fix: per-file leaves + server-safe property assignment + tsdown unbundle mode

The fix has two halves. They're load-bearing together.

### Library side: per-file leaves + server-safe root with properties

Each compound is split into per-file sub-components. An `index.tsx` at the top of the compound folder is a **server-safe module** (no `'use client'`) that imports each leaf by name and attaches them to the root function as static properties. It then exports the augmented root as the compound's name:

```tsx
// packages/components/src/components/Fieldset/index.tsx
// NO 'use client' — this file is a server-safe module.
import { FieldsetErrorText } from './FieldsetErrorText'
import { FieldsetHelperText } from './FieldsetHelperText'
import { FieldsetLegend } from './FieldsetLegend'
import { FieldsetRoot } from './FieldsetRoot'

const Fieldset = FieldsetRoot as typeof FieldsetRoot & {
  Root: typeof FieldsetRoot
  Legend: typeof FieldsetLegend
  HelperText: typeof FieldsetHelperText
  ErrorText: typeof FieldsetErrorText
}

Fieldset.Root = FieldsetRoot
Fieldset.Legend = FieldsetLegend
Fieldset.HelperText = FieldsetHelperText
Fieldset.ErrorText = FieldsetErrorText

export { Fieldset }
export type { FieldsetRootProps as FieldsetProps } from './FieldsetRoot'
```

Notes:

- **`Fieldset` is the root function.** It's aliased to `FieldsetRoot` with a type cast that widens the function's type to include the attached sub-components. Consumers write bare `<Fieldset>…</Fieldset>` and it just works.
- **`Fieldset.Root = FieldsetRoot`** is the explicit alias, a self-reference. It's there so consumers migrating from Base UI can write `<Fieldset.Root>` if they prefer. Both forms reference the same function.
- **No `'use client'` on this file.** That's the whole trick — see "Why this works" below.
- **`FieldsetProps`** is the primary root prop type, re-exported for consumer convenience (`import { Fieldset, type FieldsetProps }`).

Leaves carry `'use client'` only where they actually need it — when they use hooks, `createContext`, or wrap a Base UI client primitive:

```tsx
// FieldsetRoot.tsx — needs 'use client' because it provides React context
'use client'

import type { ComponentProps } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { FieldsetContext } from './FieldsetContext'

// FieldsetRoot.tsx — needs 'use client' because it provides React context

// FieldsetRoot.tsx — needs 'use client' because it provides React context

// FieldsetRoot.tsx — needs 'use client' because it provides React context

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

```tsx
// FieldsetLegend.tsx — pure presentational, no 'use client'
import type { ComponentProps } from 'react'

import { cn } from '@oztix/roadie-core/utils'

export type FieldsetLegendProps = ComponentProps<'legend'>

export function FieldsetLegend({ className, ...props }: FieldsetLegendProps) {
  return (
    <legend
      className={cn('text-lg font-semibold text-strong', className)}
      {...props}
    />
  )
}
FieldsetLegend.displayName = 'Fieldset.Legend'
```

### Build side: tsdown `unbundle: true`

The second load-bearing piece is in `packages/components/tsdown.config.ts`:

```ts
export default defineConfig({
  entry: ['src/**/*.{ts,tsx}', '!**/*.test.{ts,tsx}'],
  unbundle: true
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
  index.js                 # no directive — server-safe root + property assignments
```

Each leaf is its own on-disk module. Rolldown preserves `'use client'` on per-file outputs natively. `index.js` imports each leaf directly and attaches them as properties on the root function. It's a server-safe file, so Next.js never wraps it in a client-reference proxy — the property assignments happen at module load time on the server, and the attached sub-components are reachable from server-component dot access.

### Consumer surface

```tsx
// app/page.tsx — a Next.js server component
import { Fieldset } from '@oztix/roadie-components/fieldset'

export default function Page() {
  return (
    <Fieldset>
      <Fieldset.Legend>Contact information</Fieldset.Legend>
      <Fieldset.HelperText>We'll get back to you.</Fieldset.HelperText>
    </Fieldset>
  )
}
```

**Bare `<Fieldset>` is the canonical root form.** It works in server components, client components, subpath imports, and barrel imports. For consumers migrating from Base UI or who prefer explicit dot-notation roots, `<Fieldset.Root>` is a supported alias — `Fieldset === Fieldset.Root`, same function reference.

## Why this works

**Server-safe modules are not wrapped in client-reference proxies.** Next.js only wraps modules that carry `'use client'` in a proxy — that's the mechanism that exposes top-level exports as client references to server components. A server-safe module (no `'use client'`) is ordinary server-side JavaScript; Next imports it, runs its top-level code, and whatever the module exports is the actual value, with any properties the module attached to it at load time.

The chain for `<Fieldset.Legend />` (or bare `<Fieldset>`) from a server component:

1. Consumer's server component does `import { Fieldset } from '@oztix/roadie-components/fieldset'`.
2. Resolves to `dist/components/Fieldset/index.js` — **server-safe**, no `'use client'`.
3. `index.js` imports `FieldsetRoot`, `FieldsetLegend`, etc. by name from sibling files. Each sibling is a **client module** with `'use client'`, so Next hands back a client reference for each import.
4. `index.js`'s top-level code runs on the server: `const Fieldset = FieldsetRoot; Fieldset.Legend = FieldsetLegend; Fieldset.HelperText = ...` — ordinary JavaScript property assignments on the (client-reference) `FieldsetRoot` object.
5. The server component imports `Fieldset` and gets the augmented `FieldsetRoot` object with `.Root`, `.Legend`, `.HelperText`, `.ErrorText` attached.
6. `<Fieldset>` is a JSX tag referencing the root client reference. `<Fieldset.Legend>` is ordinary JavaScript property access on the server, resolving to the `FieldsetLegend` client reference. Either way, the RSC payload serializes a client-component boundary at the tag and the client renders the real component.

The essential requirement: **the property-assignment layer must be a separate on-disk module from the client leaves, and it must NOT carry `'use client'` itself**. Bundling `index.tsx` + the leaves into a single file forces a choice between marking the whole thing `'use client'` (and hitting the client-reference-proxy wall) or leaving it un-marked (and tripping Next's compile-time check on `createContext`). Tsdown unbundle mode is how we keep them separate.

### Why the pre-Phase-3 pattern was broken even though it looked the same

The pre-Phase-3 Roadie compounds used the same property-assignment shape:

```tsx
// Old Fieldset/index.tsx
'use client'  // ← THIS was the problem
export function Fieldset(...) { ... }
Fieldset.Legend = FieldsetLegend
```

The key difference: the old file carried `'use client'`. That made the entire module a client module, wrapped in a client-reference proxy on the server side. The proxy only exposes top-level named exports — `Fieldset` the function — and the runtime property assignment `Fieldset.Legend = FieldsetLegend` happens _inside_ the client runtime, invisible to the server proxy. Server-side dot access on `Fieldset.Legend` returns undefined.

Under unbundle mode + server-safe `index.tsx`, the property assignment happens **in the server-safe JavaScript layer**, not inside a client-reference proxy. The attached properties are real JavaScript properties on the imported client reference, reachable from the server.

Base UI's published `@base-ui/react/esm/combobox/` folder uses a different shape (`export * as Combobox from './index.parts.js'`), which also works for them because they ship one file per leaf on disk — their `index.js` is server-safe too. Roadie's direct property-assignment approach achieves the same RSC safety property with one less layer of indirection and gives us bare `<Compound>` as the canonical root form.

## Target folder layout

```
packages/components/src/components/Fieldset/
  FieldsetRoot.tsx          # 'use client' — provides FieldsetContext
  FieldsetLegend.tsx        # server-safe presentational leaf
  FieldsetHelperText.tsx    # server-safe presentational leaf
  FieldsetErrorText.tsx     # 'use client' — reads FieldsetContext
  FieldsetContext.ts        # 'use client' — module-scope createContext
  index.tsx                 # server-safe — root + attached sub-components
  Fieldset.test.tsx         # integration tests (both <Fieldset> and <Fieldset.Root>)
```

## The `'use client'` rule

Mark files with `'use client'` **only where they actually need it**:

- **Always** — files that use React hooks (`useState`, `useEffect`, `useCallback`, `useMemo`, `useRef`, `useReducer`, `useContext`, `use`, etc.)
- **Always** — files that call `createContext` at module scope
- **Always** — files that wrap a Base UI client primitive
- **Never** — pure presentational leaves (function components that just render HTML)
- **Never** — `index.tsx` (server-safe property-assignment layer — this is what makes the pattern work)
- **Never** — variant maps, type-only files, non-React utilities

Stricter than the old rule-of-thumb "mark every compound leaf" — under unbundle mode, pure presentational leaves ship as server-safe components.

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

`docs/src/app/debug/rsc-smoke/page.tsx` is a permanent **server component** debug route. It renders each migrated compound in three forms to prove all three work:

1. **Bare root** — `<Fieldset>…</Fieldset>` via the subpath import. The canonical form.
2. **Explicit `.Root` alias** — `<Fieldset.Root>…</Fieldset.Root>` — Base UI parity.
3. **Barrel** — bare `<FieldsetViaBarrel>` imported from `@oztix/roadie-components`, not the subpath.

If a future compound regresses from RSC-safe — via `'use client'` on `index.tsx`, accidentally turning off unbundle mode, or any other misconfiguration — the docs build fails here with "Element type is invalid" at prerender time.

## References

- [vercel/next.js#51593 — "Dot notation client component breaks consuming RSC"](https://github.com/vercel/next.js/issues/51593)
- [Dan Abramov's reply recommending multiple exports + namespace form](https://github.com/vercel/next.js/issues/51593#issuecomment-1748001262)
- [vercel/next.js#60449 — barrel-file client-reference proxy boundary](https://github.com/vercel/next.js/issues/60449)
- [Next.js `'use client'` directive docs](https://nextjs.org/docs/app/api-reference/directives/use-client)
- [tsdown unbundle mode](https://tsdown.dev/options/unbundle)
- `@base-ui/react@1.3.0` on-disk source — `node_modules/.pnpm/@base-ui+react@1.3.0.../esm/combobox/`
- `docs/contributing/COMPOUND_PATTERNS.md` — authoring checklist
- `docs/plans/2026-04-15-refactor-components-consistency-cleanup-plan.md` — Phase 3 migration plan
