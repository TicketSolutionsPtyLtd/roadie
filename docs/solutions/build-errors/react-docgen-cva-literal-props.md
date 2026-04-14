---
title: react-docgen-typescript misses CVA literal unions and mis-names interface-extends Props types in the PropsDefinitions table
date: 2026-04-14
category: build-errors
problem_type: docs_tooling_extraction
components:
  - docs/src/components/PropsDefinitions.tsx
  - packages/components/src/components/Carousel
keywords:
  - react-docgen-typescript
  - cva
  - class-variance-authority
  - VariantProps
  - literal union
  - PropsDefinitions
  - interface extends
  - type alias
  - props table
severity: low
related_files:
  - docs/src/components/PropsDefinitions.tsx
  - packages/components/src/components/Carousel/index.tsx
---

# CVA literal unions don't extract + interface-extends mis-names in the PropsDefinitions table

## Update — 2026-04-14

Part 2 of this issue (the `CarouselContentProps` / `Carousel.ContentProps` heading inconsistency for `interface extends` subcomponent types) was **resolved at the renderer level** as part of the Pattern A migration. `<PropsDefinitions>` now always derives section headings from the component's `displayName`, so `interface extends` and `type` alias subcomponents render identical dot-notation headings. The "Convert the `interface extends` declaration to a type alias" fix below is no longer required for heading correctness — it stands only as a style preference matching the Carousel reference implementation.

Part 1 (the CVA `VariantProps<typeof v>['key']` extraction failure) **still applies unchanged**. Inline literal unions plus `@default` JSDoc tags remain the required pattern — `react-docgen-typescript` still can't drill into CVA's conditional types, and the prop still vanishes from the docs table when typed via `VariantProps`.

The original analysis below is preserved as history.

## Symptom

A compound component exposes a new prop typed from its CVA variant definition:

```ts
export const carouselContentVariants = cva(
  'relative focus-visible:outline-none',
  {
    variants: {
      overflow: {
        hidden: 'overflow-clip',
        visible: 'overflow-visible',
        subtle: 'overflow-clip'
      }
    },
    defaultVariants: { overflow: 'subtle' }
  }
)

export type CarouselContentOverflow = NonNullable<
  VariantProps<typeof carouselContentVariants>['overflow']
>

export interface CarouselContentProps extends ComponentProps<'div'> {
  overflow?: CarouselContentOverflow
}
```

Two separate problems appear on the docs site's `<PropsDefinitions>` table:

1. **The `overflow` prop is missing entirely from the `Carousel.ContentProps` section.** Other props on the same interface (`containerProps`, etc.) show up fine, but `overflow` is absent. A consumer reading the docs has no idea the prop exists.
2. **The section heading shows `CarouselContentProps` (no dot) while the sibling headings are `Carousel.HeaderProps`, `Carousel.ControlsProps`, etc. (with dots).** Visually inconsistent — one section jumps out as being named differently from all the others.

Both surface at the same time when adding a new prop to a compound component, so they're easy to diagnose together.

## Root cause

### Why `overflow` is missing

`react-docgen-typescript` is configured with `shouldExtractLiteralValuesFromEnum: true`, which extracts the literal values behind a prop so the docs table can display them as `"hidden" | "visible" | "subtle"`. That extractor only resolves literal unions declared **directly** on the prop shape. It can't drill into:

- CVA's `VariantProps<typeof variants>` conditional type chain
- A `NonNullable<...>` wrapper on top of it
- An intermediate exported type alias (`CarouselContentOverflow`) pointing at either of the above

When the parser can't extract literal values, it reports the prop as having type `any` — and `any` combined with one of the parser's filters (`skipPropsWithName`, `propFilter` returning false on any opaque type) drops the prop from the output entirely. The result is a silently missing row.

### Why the heading is `CarouselContentProps` instead of `Carousel.ContentProps`

The Roadie `PropsDefinitions` component builds the section heading like this:

```ts
// docs/src/components/PropsDefinitions.tsx ≈ line 235
const interfaceName =
  Object.values(componentInfo.props)[0]?.parent?.name ||
  `${componentInfo.displayName}Props`
```

It picks the first prop's `parent.name` (the interface or type alias that declares it) and falls back to `${displayName}Props` if no parent is available. For type aliases over `ComponentProps<'div'>`, the first own prop's parent resolves to an inherited HTML interface rather than the component-specific type, so the fallback kicks in and the heading becomes `Carousel.ContentProps` (with the dot, from the explicit `displayName = 'Carousel.Content'`).

When the file uses `interface CarouselContentProps extends ComponentProps<'div'>` instead, the first own prop's parent **is** `CarouselContentProps` — the parser surfaces that name directly and the fallback never runs. The dot disappears because the interface name has no dot in it.

Every other Roadie subcomponent declares its Props via `type` alias + intersection (`type X = ComponentProps<'div'> & { ... }`), so they all surface through the fallback path and all get dot-notation headings. `CarouselContentProps` was the only file using `interface extends`, which is why it was the only odd heading.

## Fix

### 1. Inline the literal union on the prop itself

Stop routing through `VariantProps` on the prop type. The extractor only needs to see a literal union in the final prop position:

```ts
// packages/components/src/components/Carousel/index.tsx

// Literal union (rather than `VariantProps<typeof carouselContentVariants>`)
// so that `react-docgen-typescript` — which can't drill into CVA's
// conditional types — can extract the three values and surface them in
// the docs site's <PropsDefinitions> table.
export type CarouselContentOverflow = 'hidden' | 'visible' | 'subtle'

export type CarouselContentProps = ComponentProps<'div'> & {
  containerProps?: ComponentProps<'div'>
  /**
   * How slides escape the viewport box.
   *
   * - `subtle` (default): slides bleed past the edges…
   * - `hidden`: slides are hard-clipped at the viewport edge.
   * - `visible`: slides can extend indefinitely…
   *
   * @default 'subtle'
   */
  overflow?: 'hidden' | 'visible' | 'subtle'
}

export function CarouselContent({
  overflow = 'subtle',
  ...
}: CarouselContentProps) { ... }
```

Three things changed:

- `overflow?:` now uses the literal union directly, not `CarouselContentOverflow`. The exported alias is preserved so consumers can still annotate their own wrappers — it just no longer sits on the prop shape in a way that defeats the parser.
- An explicit `@default 'subtle'` JSDoc tag makes the default value appear in the table too, without relying on CVA's `defaultVariants` (which docgen can't see either).
- The destructure default (`overflow = 'subtle'`) matches the JSDoc tag so the actual behaviour matches what the table advertises.

### 2. Convert the `interface extends` declaration to a type alias

Switch `interface Foo extends Bar { ... }` to `type Foo = Bar & { ... }`:

```ts
export type CarouselContentProps = ComponentProps<'div'> & {
  containerProps?: ComponentProps<'div'>
  overflow?: 'hidden' | 'visible' | 'subtle'
}
```

Now the first own prop's parent resolves to the inherited HTML interface (same as the sibling type-alias files), PropsDefinitions falls through to the `${displayName}Props` fallback, and the heading displays as `Carousel.ContentProps` — consistent with `Carousel.HeaderProps` / `Carousel.ControlsProps` / etc.

This is a purely structural change. The public type surface is identical; TypeScript treats `type X = A & B` and `interface X extends A, B` as interchangeable for consumer use (minor quirks around declaration merging, which Roadie doesn't rely on).

## Prevention

- **For compound component Props types, use `type X = Base & { ... }`, not `interface X extends Base`.** Roadie's PropsDefinitions heading logic depends on the first-own-prop parent resolving to the inherited interface, not the local one. The type-alias form ensures that. `COMPOUND_PATTERNS.md` now documents this as a convention.
- **When adding a CVA-variant prop to a component, never type it as `VariantProps<typeof variants>['key']` on the public prop shape.** The parser can't extract the literal values through CVA's conditional types. Inline the literal union directly and export a sibling alias (`export type XOverflow = 'a' | 'b' | 'c'`) for consumers who want to annotate their own wrappers.
- **Add a `@default` JSDoc tag for any prop whose default value is set at a layer the parser can't see** (CVA's `defaultVariants`, useMemo initial values, React's `useState` initialisers, etc.). Pair it with a destructure default so the two stay in sync.
- **After adding or modifying a component prop, load the docs page locally and walk the PropsDefinitions table for that component.** Check that (a) the new prop appears, (b) its type column shows the literal values if applicable, and (c) the section heading is consistent with the sibling sections. Takes 30 seconds and catches exactly this class of silent extractor regression.

## Related files

- `docs/src/components/PropsDefinitions.tsx` — the `parseComponentProps` / `groupPropsBySource` / `formatTypeValues` pipeline and the `interfaceName` fallback logic on line ~235.
- `packages/components/src/components/Carousel/index.tsx` — `CarouselContentOverflow` alias, `CarouselContentProps` type alias, and the inline literal union on the `overflow` prop.
- `docs/contributing/COMPOUND_PATTERNS.md` — Roadie's compound component conventions (now including the type-alias-for-Props rule).

## References

- `react-docgen-typescript` options used: `shouldExtractLiteralValuesFromEnum: true`, `shouldRemoveUndefinedFromOptional: true`, `savePropValueAsString: true`. See https://github.com/styleguidist/react-docgen-typescript for the parser's own docs.
- CVA: https://cva.style — the `VariantProps<typeof variants>` helper is useful for internal component code but not for public prop shapes that need extractor support.
