# Compound Patterns

Roadie compounds ship as a **function root with sub-components attached as static properties**. Each leaf is its own on-disk module (tsdown `unbundle: true`), and a server-safe `index.tsx` imports the leaves and attaches them to the root function via property assignment. Consumers write:

```tsx
import { Fieldset } from '@oztix/roadie-components/fieldset'

;<Fieldset>
  <Fieldset.Legend>Contact information</Fieldset.Legend>
  <Fieldset.HelperText>We'll get back to you.</Fieldset.HelperText>
</Fieldset>
```

in both server and client components. **Bare `<Fieldset>` is the canonical root form** — no `.Root` required. For consumers migrating from Base UI or who prefer the explicit dot-notation root, `<Fieldset.Root>` is a supported alias that references the same component.

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

## 2. Compound assembly: per-file leaves + server-safe property assignment + tsdown unbundle mode

The runtime wiring from section 1 decides how your compound **works**. This section decides how it **ships**.

### 2.1 Why this shape

Three things are load-bearing:

1. **Per-file sub-components on disk.** Every leaf (`FieldsetRoot`, `FieldsetLegend`, `FieldsetHelperText`, `FieldsetErrorText`, `FieldsetContext`, etc.) is its own source file in the compound folder. **Tsdown builds with `unbundle: true`**, which emits each source file as its own dist file — `dist/components/Fieldset/FieldsetRoot.js`, `dist/components/Fieldset/FieldsetLegend.js`, etc. Rolldown preserves `'use client'` on per-file outputs natively, so the directive stays exactly where it's marked in source.
2. **Server-safe root + property assignment.** `index.tsx` has **no `'use client'` directive**. It imports each leaf by name and attaches them to the root function as static properties (`Fieldset.Legend = FieldsetLegend`, etc.), then exports the augmented root. Because `index.tsx` is a server-safe module, the property assignments execute in ordinary server-side JavaScript — Next never wraps this module in a client-reference proxy, so the attached properties are reachable from a server component that does `<Fieldset.Legend>`. This was the classically broken pattern pre-Phase-3, but only because `index.tsx` _used_ to carry `'use client'`. Under unbundle mode it doesn't, and the pattern works.
3. **Subpath package exports.** Each compound ships from its own subpath entry (`@oztix/roadie-components/fieldset`). Subpath imports scope the Next.js compiler walk to one compound. Both the subpath form and the root barrel (`@oztix/roadie-components`) work in server components now, because the barrel just re-exports the same server-safe `Fieldset` root that the subpath exposes.

The upshot for consumers: **`<Fieldset>` and `<Fieldset.Root>` are the same function reference** (literally `Fieldset === Fieldset.Root`). Both render identically. Bare `<Fieldset>` is the canonical form; the `.Root` alias exists for Base UI parity and explicit dot-notation preference.

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
  index.tsx                 # server-safe — attaches leaves to root function
  Fieldset.test.tsx         # integration tests (bare + .Root forms)
```

`'use client'` goes **only** on files that actually need it — hooks, `createContext`, or wrapping a Base UI client primitive. Pure presentational leaves (`FieldsetLegend`, `FieldsetHelperText`) and the server-safe `index.tsx` layer stay without the directive. See section 2.11 for the full rule.

Additional files when the compound needs them:

- `variants.ts` — CVA variant maps and any shared literal-union types (e.g. `CarouselContentOverflow`). Server-safe unless it imports a client-only API.
- `useX.ts` — custom hooks the compound exposes (e.g. `useCarousel`, `useSteps`). Always `'use client'` (they are hooks).

### 2.3 Leaf file shape

A `FieldsetRoot.tsx` leaf looks like this:

```tsx
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
        data-slot='fieldset'
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
- **`displayName` is dot-notation** (`'Fieldset.Root'`). The docs site and React DevTools use it.
- **Types live beside their function** — export the `*Props` type from the same file.
- **Every rendered DOM element carries `data-slot`** — see section 2.4 for the full rule.
- **`'use client'` only when needed** — see section 2.11 for the exact rule. Pure presentational leaves don't get the directive; files with hooks, `createContext`, or client primitives do.

### 2.4 `data-slot` attribute

Every leaf renders a single top-level DOM element with a `data-slot` attribute. The value is the **kebab-case dot-path** of the sub-component relative to its compound:

| Sub-component                | `data-slot`            |
| ---------------------------- | ---------------------- |
| `Fieldset` / `Fieldset.Root` | `fieldset`             |
| `Fieldset.Legend`            | `fieldset-legend`      |
| `Fieldset.HelperText`        | `fieldset-helper-text` |
| `Fieldset.ErrorText`         | `fieldset-error-text`  |
| `Carousel.Content`           | `carousel-content`     |
| `Carousel.NavButton`         | `carousel-nav-button`  |

The attribute makes every rendered instance addressable from CSS, consumer Tailwind variants, visual regression tooling, and the docs site's outline. It's load-bearing for:

- **Consumer styling escape hatch.** A consumer can target `[data-slot="fieldset-legend"]` in their own CSS without relying on internal class names that may change across versions.
- **Theme / variant overrides at scale.** Roadie's intent and emphasis utilities set properties up the cascade; `data-slot` lets a consumer scope `[data-slot="fieldset"] [data-slot="fieldset-legend"] { … }` when a design calls for it.
- **DOM-level testing.** `container.querySelector('[data-slot="fieldset-legend"]')` is stable regardless of markup refactors.
- **Debugging and inspection.** The attribute surfaces on the element itself in DevTools, so you can see which Roadie leaf rendered a given node at a glance.

Rules:

1. **Every leaf carries one `data-slot`** — no exceptions. Even pure passthrough components that render a Base UI primitive set the attribute on the primitive's `className`-receiving element (usually via the `render` prop or a wrapper).
2. **The value is derived from the compound's dot-notation name.** Convert each segment to kebab-case and join with `-`. `Carousel.NavButton` → `carousel-nav-button`.
3. **The root slot is just the compound name.** `Fieldset.Root` → `data-slot='fieldset'`, not `'fieldset-root'`. The `.Root` is an implementation/alias concern — the DOM element is the compound itself.
4. **Attribute position in the JSX** — place `data-slot` immediately after the opening tag, before `className` and `...props`. This keeps the leaf's first-line signature consistent across the codebase.

### 2.5 Passthrough file shape

When a sub-component is a direct re-export of a Base UI (or Ark UI) primitive with no wrapper styling, it's a one-line passthrough file — no wrapper function, no extra typing. A `ComboboxPortal.tsx` passthrough looks like this:

```tsx
'use client'

import { Combobox as ComboboxPrimitive } from '@base-ui-components/react/combobox'

export const ComboboxPortal = ComboboxPrimitive.Portal
export type ComboboxPortalProps = ComboboxPrimitive.Portal.Props
```

Passthroughs still live in their own file so `parts.ts` can import them uniformly, and so HMR invalidation is isolated.

### 2.6 Shared context (`*Context.ts`)

Sub-components that share React context factor it into a sibling `*Context.ts` file. The context file is TypeScript-only (`.ts`, not `.tsx`) and carries no JSX, but it **needs `'use client'`** because calling `createContext` at module scope forces the module to be a client module under Next.js's rules. A `FieldsetContext.ts` module looks like this:

```ts
'use client'

import { createContext } from 'react'

export type FieldsetContextValue = {
  invalid?: boolean
}

export const FieldsetContext = createContext<FieldsetContextValue>({})
```

The context module is imported by each leaf that needs it, and by `index.tsx` if the root attaches context to the compound — but it should not be part of the compound's public surface.

### 2.7 Subpath entry (`index.tsx`)

`index.tsx` is the public face of the compound's subpath. It imports each leaf by name and attaches them as static properties on the root function, then exports the augmented root as the compound's name. **Server-safe — no `'use client'` directive.**

```tsx
// Fieldset/index.tsx
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

- **`Fieldset` is the root function** — same reference as `FieldsetRoot`. That's why `<Fieldset>` works bare.
- **`Fieldset.Root = FieldsetRoot`** is the explicit alias for Base UI parity. Self-reference, no extra cost.
- **Type cast via `as`** widens the root function's type to include the attached properties. No `Object.assign` return-type gymnastics — the explicit cast is cleaner and `react-docgen-typescript` handles it fine.
- **Type re-export at the bottom** exposes `FieldsetProps` (aliased from `FieldsetRootProps`) as the primary prop type for the root. Sub-component prop types still live in their per-file leaves and are reachable via the namespace type (see 2.10).

Variant maps and shared literal-union types (if the compound has any) ship as flat re-exports alongside the root:

```tsx
// Combobox/index.tsx
import { ComboboxInput } from './ComboboxInput'
import { ComboboxRoot } from './ComboboxRoot'

// ... other leaves

const Combobox = ComboboxRoot as typeof ComboboxRoot & {
  Root: typeof ComboboxRoot
  Input: typeof ComboboxInput
  // ... other attachments
}

Combobox.Root = ComboboxRoot
Combobox.Input = ComboboxInput
// ...

export { Combobox }
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
    <Fieldset>
      <Fieldset.Legend>Contact information</Fieldset.Legend>
      <Fieldset.HelperText>We'll get back to you.</Fieldset.HelperText>
    </Fieldset>
  )
}
```

**Bare `<Fieldset>` is the canonical root form.** It works in server components, client components, subpath imports, and barrel imports. RSC-safe end to end.

For consumers migrating from Base UI or who prefer explicit dot-notation roots, `<Fieldset.Root>` is a supported alias:

```tsx
<Fieldset.Root>
  <Fieldset.Legend>Contact information</Fieldset.Legend>
</Fieldset.Root>
```

`Fieldset === Fieldset.Root` — they are the same function reference. React DevTools shows both as `Fieldset.Root` (from the `displayName`).

**Subpath form (`@oztix/roadie-components/fieldset`) is preferred over the barrel** because it scopes the Next.js compiler walk to one compound and avoids pulling unrelated compounds through the barrel's transitive import graph. Both forms are valid; the RSC canary at `/debug/rsc-smoke` verifies both on every docs build.

### 2.10 Type access from consumer code

The primary root prop type is re-exported from `index.tsx` as `FieldsetProps` (aliased from `FieldsetRootProps`), so the common case is a bare named import:

```tsx
import { Fieldset, type FieldsetProps } from '@oztix/roadie-components/fieldset'

function MyWrapper(props: FieldsetProps) {
  return <Fieldset {...props} />
}
```

For sub-component prop types, use `ComponentProps<typeof Fieldset.Legend>`:

```tsx
import type { ComponentProps } from 'react'

import { Fieldset } from '@oztix/roadie-components/fieldset'

type LegendProps = ComponentProps<typeof Fieldset.Legend>
```

The explicit `FieldsetLegendProps` type is also reachable via a deep import (`@oztix/roadie-components/fieldset/FieldsetLegend`) under unbundle mode, but `ComponentProps<typeof …>` is cleaner and doesn't lock consumers into the internal file layout.

### 2.11 The `'use client'` rule

Mark files with `'use client'` **only where they actually need it**:

- **Always** — files that use React hooks (`useState`, `useEffect`, `useCallback`, `useMemo`, `useRef`, `useReducer`, `useContext`, `use`, etc.)
- **Always** — files that call `createContext` at module scope
- **Always** — files that wrap a Base UI client primitive
- **Never** — pure presentational leaves (function components that just render HTML)
- **Never** — `index.tsx` (it's a server-safe property-assignment layer — this is what makes the whole pattern work)
- **Never** — variant maps, type-only files, non-React utilities

This is the essential discipline that makes the pattern work. `FieldsetLegend.tsx` is a pure presentational leaf — no hooks, no context — and ships as a server-safe component. `FieldsetRoot.tsx` provides context and carries the directive. `index.tsx` is the server-safe re-export + property-assignment layer.

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
   - **`data-slot` attribute on the rendered DOM element.** Kebab-case dot-path (`fieldset-legend`, `carousel-nav-button`). The root slot is just the compound name (`fieldset`, not `fieldset-root`). See 2.4.
3. [ ] For pure passthroughs of a Base UI / Ark UI primitive, create a one-line file: `'use client'` + `export const <Compound><Sub> = <Primitive>.<Sub>` + a `type` re-export. Passthroughs that render a primitive still need `data-slot` — wire it through via the primitive's `render` prop or a thin wrapper.
4. [ ] If multiple leaves share React context, factor it into `<Compound>Context.ts` with `'use client'` at the top (`createContext` at module scope forces a client module).
5. [ ] If the compound has CVA variant maps, create `variants.ts` and export the maps + any literal-union type aliases. No `'use client'` unless it imports a client API.
6. [ ] Create `index.tsx` as the **server-safe** subpath entry. **No `'use client'` directive.** It imports each leaf by name, attaches them as static properties on the root function via a type-cast alias + assignment, and exports the augmented root plus `FieldsetProps` (aliased from `FieldsetRootProps`). Also re-exports any flat variant / type re-exports (from `./variants`). See the example at 2.6.
7. [ ] Write `<Compound>.test.tsx` exercising both `<Compound>` (bare root, canonical) and `<Compound.Root>` (explicit alias) forms. Assert `Compound === Compound.Root` — they must be the same reference.
8. [ ] Add `export { <Compound> } from './components/<Compound>'` to the root package barrel `packages/components/src/index.tsx`. Bare re-export — the root's attached properties carry through.
9. [ ] Run `pnpm --filter @oztix/roadie-components generate:exports` to register the subpath in `package.json`.
10. [ ] Add a `<section>` to `docs/src/app/debug/rsc-smoke/page.tsx` rendering `<Compound>` (bare root) and at least one sub-component via `import { <Compound> } from '@oztix/roadie-components/<kebab-compound>'`. Optionally add a second section verifying the `<Compound.Root>` alias. This is the CI canary — it fails the docs build if the compound regresses from RSC-safe.
11. [ ] Write the docs page `docs/src/app/components/<kebab-compound>/page.mdx`. Use `<Compound>` (bare root) in the code examples — it's the canonical consumer form. Point `<PropsDefinitions componentPath='packages/components/src/components/<Compound>' />` at the **folder path**, not a single file. The parser enumerates every non-test `.tsx` file in the folder.
12. [ ] Run `pnpm build && pnpm test && pnpm typecheck && pnpm lint` and verify the docs site builds with the RSC canary page rendering.

### Don'ts

- **Don't hand-edit `packages/components/package.json`'s `exports` block** — it's generated. Run the generator.
- **Don't skip the `data-slot` attribute on a new leaf.** Every leaf needs one, including passthroughs. Consumers rely on it as the stable DOM-level selector for styling, testing, and debugging. See 2.4.
- **Don't export the shared context from `index.tsx`** — it's an implementation detail, not a public surface.
- **Don't add `'use client'` to `index.tsx`.** It must stay a server-safe module so Next.js follows the re-export + property-assignment layer at build time. Marking it as a client module reinstates the pre-Phase-3 client-reference-proxy wall and breaks dot access in server components.
- **Don't add `'use client'` to pure presentational leaves.** If a leaf has no hooks, no context, and no client primitive, it ships as a server-safe component. The RSC canary verifies this works.
- **Don't disable `unbundle: true` in `tsdown.config.ts`.** The per-file build output is load-bearing for RSC safety — see section 2.1. Bundling the compound folder collapses the server-safe root module into the client leaves and forces the whole thing behind a client-reference proxy.
- **Don't recommend `<Compound.Root>` in new docs code.** Use bare `<Compound>` as the canonical form — the `.Root` alias exists for consumers migrating from Base UI, not as the preferred syntax.

### Subpath naming

| Compound     | Folder        | Subpath                                | Dist entry                            |
| ------------ | ------------- | -------------------------------------- | ------------------------------------- |
| `Fieldset`   | `Fieldset/`   | `@oztix/roadie-components/fieldset`    | `dist/components/Fieldset/index.js`   |
| `Combobox`   | `Combobox/`   | `@oztix/roadie-components/combobox`    | `dist/components/Combobox/index.js`   |
| `RadioGroup` | `RadioGroup/` | `@oztix/roadie-components/radio-group` | `dist/components/RadioGroup/index.js` |
| `LinkButton` | `LinkButton/` | `@oztix/roadie-components/link-button` | `dist/components/LinkButton/index.js` |

Folder names stay PascalCase (matching the React component name). Subpath keys are kebab-case (matching Base UI's consumer surface). Under tsdown unbundle mode, each compound gets its own `dist/components/<Compound>/` directory with one file per source file plus a server-safe `index.js` re-export that the subpath key points at.

---

## 4. Historical note

Before April 2026, Roadie compounds used runtime property assignment (`Compound.Sub = SubFn`). That pattern broke across the Next.js server-component / client-component proxy boundary, and PR #38 shipped a client-component wrapper (`docs/src/components/PropsAccordion.tsx`) specifically to dot into `<Accordion.Item>` from the server-rendered `<PropsDefinitions>`.

Phase 3 of the April 2026 components cleanup plan replaced the old pattern with **per-file leaves + server-safe property assignment + tsdown `unbundle: true`**. The shape is identical to the pre-Phase-3 property-assignment pattern — `Compound.Sub = SubFn` at module scope — but it works now because the compound's `index.tsx` is a **server-safe module** (no `'use client'`). The property assignments happen in ordinary server-side JavaScript, not inside a client-reference proxy, so Next.js can follow them at build time.

The full migration rationale and evidence trail live in [`docs/solutions/rsc-patterns/compound-export-namespace.md`](../solutions/rsc-patterns/compound-export-namespace.md) and the plan document [`docs/plans/2026-04-15-refactor-components-consistency-cleanup-plan.md`](../plans/2026-04-15-refactor-components-consistency-cleanup-plan.md).

The pilot went through four shapes before landing the final one:

1. **Pre-Phase-3: property assignment with `'use client'` on `index.tsx`** — broken. The `'use client'` directive wrapped the whole module in a client-reference proxy and the runtime property assignments were invisible on the server side.
2. **Phase 3 attempt 1: `export * as Namespace` with bundled tsdown output** — matches Base UI's published shape, but tsdown was bundling each compound folder into a single file. The namespace collapsed into a single client-reference proxy and `<Fieldset.Root>` failed in server components with "Element type is invalid."
3. **Phase 3 attempt 2: flat library exports + consumer-side `import * as`** — worked, but required a non-standard consumer import form that diverged from Base UI and every other React library. Also forced `<Fieldset>` → `<Fieldset.Root>` as a breaking change.
4. **Phase 3 final: per-file leaves + property assignment on a server-safe `index.tsx` + tsdown `unbundle: true`** — the landing pattern. Unbundle mode emits each source file as its own dist file, `index.tsx` stays server-safe (no `'use client'`), and attaches sub-components as static properties on the root function. Both `<Fieldset>` (canonical, bare) and `<Fieldset.Root>` (alias for Base UI parity) work. Zero breaking change for consumers that used bare `<Fieldset>` before.

If you encounter an older compound in a fork or a cherry-pick that still uses property assignment with `'use client'` on `index.tsx`, migrate it to the current pattern by removing the directive from the index file (and adding it to the leaf files that actually need it) and flipping tsdown to unbundle mode. Purely structural; no public API change.
