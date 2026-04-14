# Compound Patterns

Roadie compounds ship as a single **namespace export per compound**, sourced from a per-file split and delivered via a subpath package export. Under the hood each leaf is its own on-disk module (tsdown `unbundle: true`), and a server-safe `index.tsx` + `parts.ts` layer re-exports them as a namespace. Consumers write `import { Fieldset } from '@oztix/roadie-components/fieldset'` and `<Fieldset.Root>…</Fieldset.Root>` — Base UI's exact ergonomics — in both server and client components.

This file covers:

1. **Context wiring** — the two runtime idioms (context-only vs. index-injection). These haven't changed.
2. **Compound assembly** — per-file leaves + server-safe namespace re-export + tsdown unbundle mode. Rewritten April 2026.
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
      <FooItemContext key={child.key ?? index} value={{ index, total }}>
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

## 2. Compound assembly: per-file leaves + namespace re-export + tsdown unbundle mode

The runtime wiring from section 1 decides how your compound **works**. This section decides how it **ships**.

### 2.1 Why this shape

Three things are load-bearing:

1. **Per-file sub-components on disk.** Every leaf (`FieldsetRoot`, `FieldsetLegend`, `FieldsetHelperText`, `FieldsetErrorText`, `FieldsetContext`, etc.) is its own source file in the compound folder. **Tsdown builds with `unbundle: true`**, which emits each source file as its own dist file — `dist/components/Fieldset/FieldsetRoot.js`, `dist/components/Fieldset/FieldsetLegend.js`, etc. Rolldown preserves `'use client'` on per-file outputs natively, so the directive stays exactly where it's marked in source.
2. **Server-safe namespace re-export.** `index.tsx` and `parts.ts` are pure re-export layers with **no `'use client'` directive**. `index.tsx` does `export * as Fieldset from './parts'` (Base UI's exact shape). Because these two files are server-safe and re-export statically from the individual leaves, Next.js's RSC compiler follows the chain at build time and resolves `Fieldset.Root` to a client reference pointing at `FieldsetRoot.js`. No proxy, no runtime dot access — the whole chain collapses to a static reference.
3. **Subpath package exports.** Each compound ships from its own subpath entry (`@oztix/roadie-components/fieldset`). Subpath imports scope the Next.js compiler walk to one compound. Both the subpath form and the root barrel (`@oztix/roadie-components`) work in server components now, because the barrel just re-exports the same server-safe `Fieldset` namespace the subpath exposes.

See [`docs/solutions/rsc-patterns/compound-export-namespace.md`](../solutions/rsc-patterns/compound-export-namespace.md) for the full background, the Dan Abramov quote, and the failure modes ruled out along the way.

### 2.2 Folder layout

```
packages/components/src/components/Fieldset/
  FieldsetRoot.tsx          # 'use client' — provides FieldsetContext
  FieldsetLegend.tsx        # server-safe presentational leaf
  FieldsetHelperText.tsx    # server-safe presentational leaf
  FieldsetErrorText.tsx     # 'use client' — reads FieldsetContext via use()
  FieldsetContext.ts        # 'use client' — module-scope createContext
  parts.ts                  # server-safe short-name re-export aggregator
  index.tsx                 # server-safe — export * as Fieldset from './parts'
  Fieldset.test.tsx         # namespace-level integration tests
```

`'use client'` goes **only** on files that actually need it — hooks, `createContext`, or wrapping a Base UI client primitive. Pure presentational leaves (`FieldsetLegend`, `FieldsetHelperText`) and the pure re-export layer (`parts.ts`, `index.tsx`) stay server-safe. See section 2.11 for the full rule.

Additional files when the compound needs them:

- `variants.ts` — CVA variant maps and any shared literal-union types (e.g. `CarouselContentOverflow`). Server-safe unless it imports a client-only API.
- `useX.ts` — custom hooks the compound exposes (e.g. `useCarousel`, `useSteps`). Always `'use client'` (they are hooks).

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
- **`'use client'` only when needed** — see section 2.11 for the exact rule. Pure presentational leaves don't get the directive; files with hooks, `createContext`, or client primitives do.

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

Sub-components that share React context factor it into a sibling `*Context.ts` file. The context file is TypeScript-only (`.ts`, not `.tsx`) and carries no JSX, but it **needs `'use client'`** because calling `createContext` at module scope forces the module to be a client module under Next.js's rules.

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

One line per sub-component. The _only_ place short-name renames happen. **Server-safe — no `'use client'` directive.** This file must be a pure re-export layer so the Next.js RSC compiler can statically follow the chain to each leaf.

```ts
// parts.ts
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
export * as Fieldset from './parts'
```

This is the public face of the compound's subpath. It ships a single `Fieldset` namespace export backed by the `parts.ts` re-export aggregator. **Server-safe — no `'use client'` directive.** Together with `parts.ts`, this file forms the server-safe re-export layer that Next.js's RSC compiler follows at build time.

Variant maps and shared literal-union types (if the compound has any) ship as flat re-exports alongside the namespace:

```tsx
// Combobox/index.tsx
export * as Combobox from './parts'
export {
  comboboxInputGroupVariants,
  type ComboboxInputGroupVariants
} from './variants'
```

Co-locating the variant map with its compound means consumers extending CVA get the map from the same subpath (`@oztix/roadie-components/combobox`) as the component.

### 2.8 Subpath registration

`packages/components/package.json` ships one `exports` entry per compound (kebab-case key → `dist/components/<Compound>/index.js`). The entry map is **generated** — do not hand-edit it. Run:

```bash
pnpm --filter @oztix/roadie-components generate:exports
```

or let `pnpm --filter @oztix/roadie-components build` do it automatically. The generator script (`packages/components/scripts/generate-package-exports.mjs`) reads the components folder and emits the `exports` block. Adding a new compound is a matter of creating the folder and rerunning the generator.

### Build: tsdown unbundle mode

Roadie's bundler is **`tsdown`**, configured with **`unbundle: true`** and an entry glob (`src/**/*.{ts,tsx}`, excluding tests). Unbundle mode compiles every source file individually and preserves the source directory structure 1:1 in the output. This is load-bearing for RSC safety — see section 2.1 — and it means adding a new component is "drop a folder in `src/components/<Name>/` and the build picks it up." No tsdown config changes required.

Rolldown (tsdown's backend) preserves `'use client'` on per-file outputs natively, so leaves that carry the directive still emit with `"use client";` at the top of their dist file. Verify after build with:

```bash
head -c 13 packages/components/dist/components/Fieldset/FieldsetRoot.js   # → "use client";
head -c 13 packages/components/dist/components/Fieldset/FieldsetLegend.js # → "import{cn a"  (no directive — server-safe)
```

### 2.9 Consumer surface

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

Base UI's exact import form. Bare `import { Fieldset }`, dot access via `<Fieldset.Root>`, works in server components, works in client components, works from the barrel (`@oztix/roadie-components`), works from the subpath (`@oztix/roadie-components/fieldset`). RSC-safe end to end. No client wrapper, no barrel walking, no `optimizePackageImports` configuration in consumer apps.

**Subpath form is preferred** because it bypasses the barrel walk entirely and keeps the Next.js compiler's work scoped to one compound. But both forms are valid — the RSC canary at `/debug/rsc-smoke` verifies both on every docs build.

### 2.10 Type access from consumer code

Types are reachable through the same namespace identifier:

```tsx
import { Fieldset } from '@oztix/roadie-components/fieldset'

type RootProps = Fieldset.RootProps
type LegendProps = Fieldset.LegendProps
```

`parts.ts` re-exports types alongside values, and `export * as Fieldset` surfaces both in the namespace. For edge cases — e.g. anonymising a subcomponent inside a wrapper — fall back to `ComponentProps<typeof Fieldset.Root>`.

### 2.11 The `'use client'` rule

Mark files with `'use client'` **only where they actually need it**:

- **Always** — files that use React hooks (`useState`, `useEffect`, `useCallback`, `useMemo`, `useRef`, `useReducer`, `useContext`, `use`, etc.)
- **Always** — files that call `createContext` at module scope
- **Always** — files that wrap a Base UI client primitive
- **Never** — pure presentational leaves (function components that just render HTML)
- **Never** — `index.tsx` and `parts.ts` aggregators (pure re-export layer — must be server-safe for the RSC chain to work)
- **Never** — variant maps, type-only files, non-React utilities

This is the essential discipline that makes the pattern work. `FieldsetLegend.tsx` is a pure presentational leaf — no hooks, no context — and ships as a server-safe component. `FieldsetRoot.tsx` provides context and carries the directive. `parts.ts` and `index.tsx` are re-export layers and stay server-safe.

If you catch yourself adding `'use client'` to a presentational leaf "just to be safe," stop and ask whether the leaf actually uses a client API. If it doesn't, leave the directive off. The RSC canary at `/debug/rsc-smoke` catches regressions.

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
2. [ ] For each sub-component, create a file `<Compound><Sub>.tsx`:
   - Add `'use client'` **only if** the leaf uses hooks, `createContext`, or wraps a Base UI client primitive. Pure presentational leaves ship server-safe — no directive.
   - Compound-prefixed function or const (`FieldsetRoot`, not `Root`)
   - Exported `<Compound><Sub>Props` type alias (prefer `type =` over `interface extends`)
   - Dot-notation `displayName` (`'<Compound>.<Sub>'`)
3. [ ] For pure passthroughs of a Base UI / Ark UI primitive, create a one-line file: `'use client'` + `export const <Compound><Sub> = <Primitive>.<Sub>` + a `type` re-export.
4. [ ] If multiple leaves share React context, factor it into `<Compound>Context.ts` with `'use client'` at the top (`createContext` at module scope forces a client module).
5. [ ] If the compound has CVA variant maps, create `variants.ts` and export the maps + any literal-union type aliases. No `'use client'` unless it imports a client API.
6. [ ] Create `parts.ts` as a **server-safe** short-name re-export aggregator. **No `'use client'` directive.** One export pair per leaf (value + type).
7. [ ] Create `index.tsx` as a **server-safe** namespace re-export. **No `'use client'` directive.**
   - `export * as <Compound> from './parts'`
   - Any flat variant / type re-exports (from `./variants`)
8. [ ] Write `<Compound>.test.tsx` at the namespace level. Use `import { <Compound> } from '.'` and `<Compound>.Root` JSX form.
9. [ ] Add `export { <Compound> } from './components/<Compound>'` to the root package barrel `packages/components/src/index.tsx`. Bare re-export — no namespace synthesis needed.
10. [ ] Run `pnpm --filter @oztix/roadie-components generate:exports` to register the subpath in `package.json`.
11. [ ] Add a `<section>` to `docs/src/app/debug/rsc-smoke/page.tsx` rendering `<Compound>.Root` and at least one sub-component via `import { <Compound> } from '@oztix/roadie-components/<kebab-compound>'`. This is the CI canary — it fails the docs build if the compound regresses from RSC-safe.
12. [ ] Write the docs page `docs/src/app/components/<kebab-compound>/page.mdx`. Point `<PropsDefinitions componentPath='packages/components/src/components/<Compound>' />` at the **folder path**, not a single file. The parser enumerates every non-test `.tsx` file in the folder.
13. [ ] Run `pnpm build && pnpm test && pnpm typecheck && pnpm lint` and verify the docs site builds with the RSC canary page rendering.

### Don'ts

- **Don't hand-edit `packages/components/package.json`'s `exports` block** — it's generated. Run the generator.
- **Don't re-export context from `parts.ts`** — it's an implementation detail of the compound, not a public surface.
- **Don't add `'use client'` to `parts.ts` or `index.tsx`.** Those files must stay server-safe so the Next.js RSC compiler can follow the static re-export chain. Marking them as client modules collapses the re-export layer into the leaves and breaks RSC safety.
- **Don't add `'use client'` to pure presentational leaves.** If a leaf has no hooks, no context, and no client primitive, it ships as a server-safe component. The RSC canary verifies this works.
- **Don't disable `unbundle: true` in `tsdown.config.ts`.** The per-file build output is load-bearing for RSC safety — see section 2.1. Bundling the compound folder would collapse the re-export layer into the client leaves.
- **Don't use property assignment (`Compound.Sub = SubFn`) or `Object.assign + cast`.** Both are broken across the RSC boundary. Any new or migrated compound that uses either form will fail review and fail the RSC canary build.

### Subpath naming

| Compound     | Folder        | Subpath                                | Dist entry                             |
| ------------ | ------------- | -------------------------------------- | -------------------------------------- |
| `Fieldset`   | `Fieldset/`   | `@oztix/roadie-components/fieldset`    | `dist/components/Fieldset/index.js`    |
| `Combobox`   | `Combobox/`   | `@oztix/roadie-components/combobox`    | `dist/components/Combobox/index.js`    |
| `RadioGroup` | `RadioGroup/` | `@oztix/roadie-components/radio-group` | `dist/components/RadioGroup/index.js`  |
| `LinkButton` | `LinkButton/` | `@oztix/roadie-components/link-button` | `dist/components/LinkButton/index.js`  |

Folder names stay PascalCase (matching the React component name). Subpath keys are kebab-case (matching Base UI's consumer surface). Under tsdown unbundle mode, each compound gets its own `dist/components/<Compound>/` directory with one file per source file plus a server-safe `index.js` re-export that the subpath key points at.

---

## 4. Historical note

Before April 2026, Roadie compounds used runtime property assignment (`Compound.Sub = SubFn`). That pattern broke across the Next.js server-component / client-component proxy boundary, and PR #38 shipped a client-component wrapper (`docs/src/components/PropsAccordion.tsx`) specifically to dot into `<Accordion.Item>` from the server-rendered `<PropsDefinitions>`.

Phase 3 of the April 2026 components cleanup plan replaced that pattern with **per-file leaves + server-safe namespace re-export + tsdown `unbundle: true`**, which gives us Base UI's exact import form (`import { Fieldset }` + `<Fieldset.Root>`) with full RSC safety. The full migration rationale and evidence trail live in [`docs/solutions/rsc-patterns/compound-export-namespace.md`](../solutions/rsc-patterns/compound-export-namespace.md) and the plan document [`docs/plans/2026-04-15-refactor-components-consistency-cleanup-plan.md`](../plans/2026-04-15-refactor-components-consistency-cleanup-plan.md).

The pilot went through three failed shapes before landing the final one:

1. **`export * as Namespace` with bundled output** — matches Base UI's published shape, but since tsdown was bundling each compound folder into a single file, the namespace collapsed into a single client-reference proxy and `<Fieldset.Root>` failed in server components with "Element type is invalid."
2. **Flat library exports + consumer-side `import * as`** — worked, but required a non-standard consumer import form that diverged from Base UI and every other React library.
3. **Per-file leaves + `export * as Namespace` + tsdown `unbundle: true`** — the final pattern. Unbundle mode emits each source file as its own dist file, giving us the same on-disk shape Base UI ships, which lets Next.js follow the static re-export chain from the server-safe namespace layer down to each client-marked leaf at build time. Bare `import { Fieldset }` works in both server and client components from both the subpath and the barrel.

If you encounter an older compound in a fork or a cherry-pick that still uses `Object.assign` or property assignment, migrate it to the current pattern in a single commit — purely structural, no public API change beyond the `<Compound>` → `<Compound.Root>` root-tag rename.
