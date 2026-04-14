# Compound Patterns

Roadie compounds ship as a single **namespace export per compound**, sourced from a per-file split and delivered via a subpath package export. The pattern is committed across every compound — new components and migrations use it without exception.

This file covers:

1. **Context wiring** — the two runtime idioms (context-only vs. index-injection). These haven't changed.
2. **Compound assembly** — the `export * as Namespace` + per-file split + subpath export pattern. Rewritten April 2026.
3. **Authoring checklist** — end-to-end steps for creating a new compound.

If you only need the why, read [`docs/solutions/rsc-patterns/compound-export-namespace.md`](../solutions/rsc-patterns/compound-export-namespace.md). This document is the _how_.

---

## 1. Context wiring

Pick one of the two idioms consciously when you design a compound. Both ship in Roadie today.

### 1.1 Context-only compounds

**Examples:** `Card`, `Accordion`, `Field`, `Steps`, `Fieldset`.

The root owns state and creates a context provider. Each sub-component reads from the context via `use(Context)`. Children are rendered as-is — no walking, no cloning — and can be wrapped in fragments, conditionals, or arbitrary other elements. The React cascade does the work.

```tsx
const FooContext = createContext<FooState | null>(null)

function FooRoot({ children }: { children: ReactNode }) {
  const [state, setState] = useState(initialState)
  const value = useMemo(() => ({ state, setState }), [state])
  return <FooContext value={value}>{children}</FooContext>
}

function FooItem() {
  const ctx = use(FooContext)
  // ...
}
```

**When to use:** the sub-component's behaviour depends only on shared root state (theme, intent, accordion `name`, fieldset `invalid`). Items don't need to know their own position.

**Trade-off:** items can't easily know "I'm the third child" without lifting that information up some other way (refs, IDs).

### 1.2 Index-injection compounds

**Example:** `Carousel`.

The root owns global state via context, but a _container_ sub-component (like `Carousel.Content`) walks its direct children with `Children.map` and wraps each one in a per-item context provider that carries position metadata (`{ index, total, isActive }`). Items read both contexts.

```tsx
const FooContext = createContext<FooState | null>(null)
const FooItemContext = createContext<{ index: number; total: number } | null>(
  null
)

function FooContainer({ children }: { children: ReactNode }) {
  const total = Children.count(children)
  const wrapped = Children.map(children, (child, index) => {
    if (!isValidElement(child)) return child
    return (
      <FooItemContext
        key={child.key ?? index}
        value={{ index, total }}
      >
        {child}
      </FooItemContext>
    )
  })
  return <div>{wrapped}</div>
}

function FooItem() {
  const { index, total } = use(FooItemContext)!
  return <div aria-label={`${index + 1} of ${total}`} />
}
```

**When to use:** items need to know their own position (slide N of M, step N of M) and you want to compute it once at render time without per-item refs. Per-item ARIA labels (`aria-label="3 of 5"`) are the canonical use case.

**Always key the wrapping provider by `child.key ?? index`, not just `index`.** Using the iteration index alone defeats React's reconciler when consumers reorder / insert / delete items — any stateful content inside a wrapped child (forms, uncontrolled inputs, video players mid-playback) remounts on every parent update even though the consumer passed stable keys.

**Direct-children constraint:** `Children.map` walks only _direct_ children. Fragments, mapped arrays where each element renders multiple `Item`s, and conditionally rendered children that wrap an `Item` inside another component will _not_ be unwrapped. The contributing rule:

> Inside `Carousel.Content` (or any index-injection container), only render direct `<Carousel.Item>` children.

Roadie ships a dev-only warning (gated on `process.env.NODE_ENV`) when a non-Item element is found at a direct-child position, so authors find this fast.

### 1.3 Decision matrix

| Need                                              | Pattern         |
| ------------------------------------------------- | --------------- |
| Children share theme / intent / config            | Context-only    |
| Items need to know their own position             | Index injection |
| Children may include fragments or conditionals    | Context-only    |
| Per-item ARIA labels (e.g. `aria-label="3 of 5"`) | Index injection |
| Direct children API is acceptable                 | Either          |

If you find yourself wanting both — items need both global state AND positional metadata — use index injection at the container level _and_ a separate root context for the global state. That's exactly what `Carousel` does (`CarouselStateContext` + `CarouselItemContext`).

---

## 2. Compound assembly: flat library exports + consumer-side `import * as` + subpath export

The runtime wiring from section 1 decides how your compound **works**. This section decides how it **ships**.

### 2.1 Why this shape

Three things are non-negotiable:

1. **Flat top-level exports on the library side.** The compound's `index.tsx` subpath entry does `export * from './parts'`, not `export * as Namespace`. Each sub-component becomes its own top-level named export in the built subpath bundle, and each one becomes its own client reference across the Next.js RSC boundary.
2. **`import * as` on the consumer side.** Server components write `import * as Fieldset from '@oztix/roadie-components/fieldset'`, creating a consumer-side namespace object. `<Fieldset.Root />` is a compile-time property access on that local object — the JS compiler resolves it statically, no runtime proxy dot access is ever involved. This is the half of the pattern that actually resolves the Next.js server-component proxy bug ([vercel/next.js#51593](https://github.com/vercel/next.js/issues/51593)).
3. **Subpath package exports.** Every compound ships from its own subpath entry (`@oztix/roadie-components/fieldset`). Consumers that use the barrel (`@oztix/roadie-components`) force the Next.js compiler to walk every `'use client'` module transitively reachable from the barrel, even the ones the page doesn't touch. Subpath imports scope the walk to one compound — and, crucially, the barrel-shaped `{ Fieldset }` export can't provide RSC safety no matter how it's structured. Server components **must** use the subpath form.

`export * as Namespace` on the library side is a trap: it ships the namespace as a **single** top-level export whose dot access is runtime property access on a client-reference proxy — the exact same failure mode as the old `Compound.Sub = SubFn` property assignment. The fix is to make the namespace a **consumer-side** construct.

See [`docs/solutions/rsc-patterns/compound-export-namespace.md`](../solutions/rsc-patterns/compound-export-namespace.md) for the full background, the Dan Abramov quote, and why Base UI's on-disk `export * as` works for them (they ship one file per leaf) but not for Roadie (we bundle each compound into one file).

### 2.2 Folder layout

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

**Every file in the compound folder carries `'use client'`**, including pure presentational leaves, the context module, the `parts.ts` aggregator, and `index.tsx`. Roadie bundles the whole folder into one tsdown entry, and rolldown's `'use client'` preservation requires every contributing source to have the directive so the built chunk inherits it. Matching Base UI (which marks every leaf as `'use client'`), the RSC safety property is "the server component can dot into the namespace", not "every leaf runs on the server."

Additional files when the compound needs them:

- `variants.ts` — CVA variant maps and any shared literal-union types (e.g. `CarouselContentOverflow`).
- `useX.ts` / `useX.ts` — custom hooks the compound exposes (e.g. `useCarousel`, `useSteps`).

### 2.3 Leaf file shape

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
      <fieldset
        className={cn('m-0 border-none p-0 [&>*+*]:mt-6', className)}
        {...props}
      />
    </FieldsetContext>
  )
}

FieldsetRoot.displayName = 'Fieldset.Root'
```

Non-negotiable rules:

- **Function name is compound-prefixed** (`FieldsetRoot`, not `Root`). Keeps stack traces, React DevTools, and error overlays readable.
- **`displayName` is dot-notation** (`'Fieldset.Root'`). `<PropsDefinitions>` derives its accordion headings from this field.
- **Types live beside their function** — export the `*Props` type from the same file.
- **Every file carries `'use client'`.** See 2.2 — this is required by how Roadie bundles compound folders with tsdown. The directive goes on pure presentational leaves, passthroughs, the context module, `parts.ts`, and `index.tsx`.

### 2.4 Passthrough file shape

When a sub-component is a direct re-export of a Base UI (or Ark UI) primitive with no wrapper styling, it's a one-line passthrough file — no wrapper function, no extra typing:

```tsx
// ComboboxPortal.tsx
'use client'

import { Combobox as ComboboxPrimitive } from '@base-ui-components/react/combobox'

export const ComboboxPortal = ComboboxPrimitive.Portal
export type ComboboxPortalProps = ComboboxPrimitive.Portal.Props
```

Passthroughs still live in their own file so `parts.ts` can import them uniformly, and so HMR invalidation is isolated.

### 2.5 Shared context (`*Context.ts`)

Sub-components that share React context factor it into a sibling `*Context.ts` file. The context file is TypeScript-only (`.ts`, not `.tsx`) and carries no JSX, but it **still needs `'use client'`** — `createContext` is a React-client API and rolldown's chunk hoisting requires every contributing source file to be marked.

```ts
// FieldsetContext.ts
'use client'

import { createContext } from 'react'

export type FieldsetContextValue = {
  invalid?: boolean
}

export const FieldsetContext = createContext<FieldsetContextValue>({})
```

The context module is imported by each leaf that needs it. Don't re-export context from `parts.ts` — it's an implementation detail of the compound, not a public surface.

### 2.6 Aggregator (`parts.ts`)

One line per sub-component. The _only_ place short-name renames happen. Carries `'use client'` per the directive rule in section 2.2.

```ts
// parts.ts
'use client'

export { FieldsetRoot as Root } from './FieldsetRoot'
export type { FieldsetRootProps as RootProps } from './FieldsetRoot'

export { FieldsetLegend as Legend } from './FieldsetLegend'
export type { FieldsetLegendProps as LegendProps } from './FieldsetLegend'

export { FieldsetHelperText as HelperText } from './FieldsetHelperText'
export type { FieldsetHelperTextProps as HelperTextProps } from './FieldsetHelperText'

export { FieldsetErrorText as ErrorText } from './FieldsetErrorText'
export type { FieldsetErrorTextProps as ErrorTextProps } from './FieldsetErrorText'
```

### 2.7 Subpath entry (`index.tsx`)

```tsx
// index.tsx
'use client'

export * from './parts'
```

This is the public face of the compound's subpath. It ships flat top-level exports (`Root`, `Legend`, `HelperText`, `ErrorText`) — **not** a pre-namespaced object. Consumers create the namespace on their side via `import * as Fieldset`.

Variant maps and shared literal-union types (if the compound has any) ship as flat re-exports alongside the parts:

```tsx
// Combobox/index.tsx
'use client'

export * from './parts'
export {
  comboboxInputGroupVariants,
  type ComboboxInputGroupVariants
} from './variants'
```

Co-locating the variant map with its compound means consumers extending CVA get the map from the same subpath (`@oztix/roadie-components/combobox`) as the component.

### 2.8 Subpath registration

`packages/components/package.json` ships one `exports` entry per compound (kebab-case key → PascalCase dist file). The entry map is **generated** — do not hand-edit it. Run:

```bash
pnpm --filter @oztix/roadie-components generate:exports
```

or let `pnpm --filter @oztix/roadie-components build` do it automatically. The generator script (`packages/components/scripts/generate-package-exports.mjs`) reads the components folder and emits the `exports` block. Adding a new compound is a matter of creating the folder and rerunning the generator.

Roadie's bundler is **`tsdown`**. `tsdown.config.ts` already reads every component folder dynamically and produces one `dist/<PascalCase>.js` output per folder, so the generator only touches `package.json` — no bundler config changes are required when adding or removing a compound.

### 2.9 Consumer surface

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

RSC-safe end to end. No client wrapper, no barrel walking, no `optimizePackageImports` configuration in consumer apps.

The `import * as Fieldset` form is **required** for server components. The barrel import (`import { Fieldset } from '@oztix/roadie-components'`) synthesises a namespace via `import * as` internally and re-exports it as a single named export — which works inside client components but hits the client-reference-proxy wall when imported from a server component. See 2.10.

### 2.10 Type access from consumer code

Types are reachable the same way as values:

```tsx
import * as Fieldset from '@oztix/roadie-components/fieldset'

type RootProps = Fieldset.RootProps
type LegendProps = Fieldset.LegendProps
```

`parts.ts` re-exports types alongside values, and `import * as` surfaces both in the consumer-side namespace. For edge cases — e.g. anonymising a subcomponent inside a wrapper — fall back to `ComponentProps<typeof Fieldset.Root>`.

### 2.11 Barrel compatibility

The root barrel `@oztix/roadie-components` still exports `Fieldset`, but it synthesises the namespace via an internal `import * as` and re-exports it as a single named export:

```ts
// packages/components/src/index.tsx
import * as Fieldset from './components/Fieldset'

export { Fieldset }
```

Two consequences:

1. **In client components, barrel usage still works.** `import { Fieldset } from '@oztix/roadie-components'` gives you a namespace-shaped object and `<Fieldset.Root />` resolves at runtime.
2. **In server components, barrel usage fails** with "Element type is invalid." The barrel's `Fieldset` is a single client-reference proxy and dotting into it is a runtime property access. **Always use the subpath form (`import * as Fieldset from '@oztix/roadie-components/fieldset'`) in server components.**

This is why the subpath imports are the canonical form: they're the only form that provides RSC safety. The barrel exists for backwards compatibility and client-component convenience.

### 2.12 Sub-component prop types

Prefer `type X = Base & { ... }` over `interface X extends Base` for sub-component prop types:

```tsx
// ✅ Preferred
export type FieldsetLegendProps = ComponentProps<'legend'> & {
  emphasis?: 'normal' | 'strong'
}
```

The type-alias form composes more cleanly with CVA intersections and union types than `interface extends`, which can't extend union types at all. Section headings in `<PropsDefinitions>` derive from `displayName` regardless of the declaration form, so both render correctly in the docs — this is a style preference, not a correctness rule.

A related rule: **don't type CVA variant props as `VariantProps<typeof variants>['key']` on the public prop shape**. `react-docgen-typescript` can't drill into CVA's conditional types, so the literal values never reach the table and the prop silently vanishes from the docs. Inline the literal union on the prop itself and export a sibling type alias (`export type XOverflow = 'a' | 'b' | 'c'`) from the same file for consumers who want to annotate their own wrappers. Full backstory in [`../solutions/build-errors/react-docgen-cva-literal-props.md`](../solutions/build-errors/react-docgen-cva-literal-props.md).

---

## 3. Authoring checklist

Use this as the end-to-end flow when creating a new compound (or migrating an old one):

1. [ ] Create `packages/components/src/components/<Compound>/`.
2. [ ] For each sub-component, create a file `<Compound><Sub>.tsx` containing:
       - `'use client'` at the top
       - A compound-prefixed function or const
       - An exported `<Compound><Sub>Props` type alias (prefer `type =` over `interface extends`)
       - A dot-notation `displayName` (`'<Compound>.<Sub>'`)
3. [ ] For pure passthroughs of a Base UI / Ark UI primitive, create a one-line file: `'use client'` + `export const <Compound><Sub> = <Primitive>.<Sub>` + a `type` re-export.
4. [ ] If multiple leaves share React context, factor it into `<Compound>Context.ts` with `'use client'` at the top.
5. [ ] If the compound has CVA variant maps, create `variants.ts` and export the maps + any literal-union type aliases. `'use client'` required.
6. [ ] Create `parts.ts` with `'use client'` at the top plus one short-name re-export pair per leaf (value + type).
7. [ ] Create `index.tsx` containing:
       - `'use client'` at the top
       - `export * from './parts'` (**not** `export * as <Compound>` — that ships the namespace as a single client-reference proxy and breaks dot access in server components)
       - Any flat variant / type re-exports (from `./variants`)
8. [ ] Write `<Compound>.test.tsx` at the namespace level. Use `import * as <Compound> from '.'` so the test exercises the same consumer-side namespace form that production code uses.
9. [ ] Update the root package barrel `packages/components/src/index.tsx` with `import * as <Compound> from './components/<Compound>'; export { <Compound> }` so barrel consumers still see the namespace.
10. [ ] Run `pnpm --filter @oztix/roadie-components generate:exports` to register the subpath in `package.json`.
11. [ ] Add a `<section>` to `docs/src/app/debug/rsc-smoke/page.tsx` rendering `<Compound>.Root` and at least one sub-component via `import * as <Compound> from '@oztix/roadie-components/<kebab-compound>'`. This is the CI canary — it fails the docs build if the compound regresses from RSC-safe.
12. [ ] Write the docs page `docs/src/app/components/<kebab-compound>/page.mdx`. Point `<PropsDefinitions componentPath='packages/components/src/components/<Compound>' />` at the **folder path**, not a single file. The parser enumerates every non-test `.tsx` file in the folder.
13. [ ] Run `pnpm build && pnpm test && pnpm typecheck && pnpm lint` and verify the docs site builds with the RSC canary page rendering.

### Don'ts

- **Don't hand-edit `packages/components/package.json`'s `exports` block** — it's generated. Run the generator.
- **Don't re-export context from `parts.ts`** — it's an implementation detail of the compound, not a public surface.
- **Don't skip `'use client'` on any file in the compound folder** — even pure presentational leaves and the `index.tsx` aggregator need the directive for rolldown chunk hoisting to work.
- **Don't use `export * as <Compound>` on the library side.** That ships the namespace as a single client-reference proxy whose dot access fails in server components. Library side is `export * from './parts'`; namespace creation happens on the consumer side via `import * as`.
- **Don't use `import { <Compound> }` from the barrel in server components.** The barrel's `Fieldset` / `Combobox` / etc. are synthesised namespaces that hit the client-reference-proxy wall in server components. Use `import * as <Compound> from '@oztix/roadie-components/<compound>'` instead. The barrel is fine in client components.
- **Don't use property assignment (`Compound.Sub = SubFn`) or `Object.assign + cast`.** Both are broken across the RSC boundary. Any new or migrated compound that uses either form will fail review and fail the RSC canary build.

### Subpath naming

| Compound      | Folder         | Subpath                                     | Dist file          |
| ------------- | -------------- | ------------------------------------------- | ------------------ |
| `Fieldset`    | `Fieldset/`    | `@oztix/roadie-components/fieldset`         | `dist/Fieldset.js` |
| `Combobox`    | `Combobox/`    | `@oztix/roadie-components/combobox`         | `dist/Combobox.js` |
| `RadioGroup`  | `RadioGroup/`  | `@oztix/roadie-components/radio-group`      | `dist/RadioGroup.js` |
| `LinkButton`  | `LinkButton/`  | `@oztix/roadie-components/link-button`      | `dist/LinkButton.js` |

Folder names stay PascalCase (matching the React component name). Subpath keys are kebab-case (matching Base UI's consumer surface). Dist filenames match the folder name — the generator handles the translation.

---

## 4. Historical note

Before April 2026, Roadie compounds used runtime property assignment (`Compound.Sub = SubFn`). That pattern broke across the Next.js server-component / client-component proxy boundary, and PR #38 shipped a client-component wrapper (`docs/src/components/PropsAccordion.tsx`) specifically to dot into `<Accordion.Item>` from the server-rendered `<PropsDefinitions>`.

Phase 3 of the April 2026 components cleanup plan replaced that pattern with flat library-side exports + per-file split + subpath package exports + consumer-side `import * as`. The full migration rationale and evidence trail live in [`docs/solutions/rsc-patterns/compound-export-namespace.md`](../solutions/rsc-patterns/compound-export-namespace.md) and the plan document [`docs/plans/2026-04-15-refactor-components-consistency-cleanup-plan.md`](../plans/2026-04-15-refactor-components-consistency-cleanup-plan.md).

Initial versions of the plan and this document recommended `export * as Namespace` on the library side (matching Base UI's published `@base-ui/react` source). That shape works for Base UI because each leaf is its **own on-disk file**, so consumers can deep-import directly without crossing the proxy boundary. Roadie bundles each compound into a single file, so the namespace wrapping turned into a single client-reference proxy and broke dot access in server components. The flat-library + consumer-side-`import *` shape gives us the same RSC safety in a single bundled module.

If you encounter an older compound in a fork or a cherry-pick that still uses `Object.assign` or property assignment, migrate it to the current pattern in a single commit — purely structural, no public API change beyond the `<Compound>` → `<Compound.Root>` root-tag rename and switching consumers to `import * as`.
