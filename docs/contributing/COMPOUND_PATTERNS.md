# Compound Patterns

Roadie has two distinct compound-component idioms in use. They wire context differently — pick one consciously when creating a new compound. There is also a separate question of how to _assemble_ the compound at the bottom of the file, covered at the end.

## Context wiring

## 1. Context-only compounds

**Examples:** `Card`, `Accordion`, `Field`, `Steps`.

The root owns state and creates a context provider. Each subcomponent reads from the context via `use(Context)`. Children are rendered as-is (no walking, no cloning) and can be wrapped in fragments, conditionals, or arbitrary other elements — the cascade does the work.

```tsx
const FooContext = createContext<FooState | null>(null)

function FooRoot({ children }: { children: ReactNode }) {
  const [state, setState] = useState(initialState)
  const value = useMemo(() => ({ state, setState }), [state])
  return (
    <FooContext.Provider value={value}>
      <div>{children}</div>
    </FooContext.Provider>
  )
}

function FooItem() {
  const ctx = use(FooContext)
  // ...
}
```

**When to use:** the subcomponent's behaviour depends only on shared root state (theme, intent, accordion `name`). Items don't need to know their own position.

**Trade-off:** items can't easily know "I'm the third child" without lifting that information up some other way (refs, IDs).

## 2. Index-injection compounds

**Example:** `Carousel`.

The root owns global state via context, but a _container_ subcomponent (like `Carousel.Content`) walks its direct children with `Children.map` and wraps each one in a per-item context provider that carries position metadata (`{ index, total, isActive }`). Items read both contexts.

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
      <FooItemContext.Provider value={{ index, total }}>
        {cloneElement(child)}
      </FooItemContext.Provider>
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

**Always key the wrapping provider by `child.key ?? index`, not just `index`.** A provider element created inside `Children.map` still needs a React key, and using the iteration index alone defeats React's reconciler when consumers reorder / insert / delete items — any stateful content inside a slide (forms, uncontrolled inputs, video players mid-playback) remounts on every parent update even though the consumer passed stable keys on the items themselves. Preferring `child.key` when it exists and falling back to `index` only when the consumer didn't supply one preserves identity through list mutations:

```tsx
return (
  <FooItemContext.Provider
    key={child.key ?? index}
    value={{ index, total }}
  >
    {child}
  </FooItemContext.Provider>
)
```

This matters in practice for Carousel consumers that pass `key={event.id}` on each `<Carousel.Item>` — reorder the event list and the item providers shuffle, not remount.

**Trade-off — the direct-children constraint:** `Children.map` walks only **direct** children. Fragments, mapped arrays where each element renders multiple `Item`s, and conditionally rendered children that wrap an `Item` inside another component will _not_ be unwrapped. The contributing rule:

> Inside `Carousel.Content` (or any index-injection container), only render direct `<Carousel.Item>` children.

Roadie ships a dev-only warning when a non-Item element is found at a direct-child position so authors find this fast.

**Alternative considered (and rejected for v1):** shadcn's carousel uses `api.slideNodes()` and walks the DOM imperatively to set `data-active`/`inert`/`aria-label` after each render. That works with fragments and conditional children, but it (a) leaks DOM mutation outside React's model, (b) makes per-item state hard to test, and (c) doesn't compose with React's hydration model. Index injection trades flexibility for a cleaner React story.

## Decision matrix

| Need                                              | Pattern         |
| ------------------------------------------------- | --------------- |
| Children share theme / intent / config            | Context-only    |
| Items need to know their own position             | Index injection |
| Children may include fragments or conditionals    | Context-only    |
| Per-item ARIA labels (e.g. `aria-label="3 of 5"`) | Index injection |
| Direct children API is acceptable                 | Either          |

If you find yourself wanting both — items need both global state AND positional metadata — use index injection at the container level and a separate root context for the global state. That's exactly what `Carousel` does (`CarouselStateContext` + `CarouselItemContext`).

## Compound assembly: named exports + property assignment

There are two ways to attach subcomponents to the root once you have them. **All Roadie compounds use Pattern A.** Pattern B is documented here only so you can recognise it in old PRs or in other codebases — it is no longer present in this repo.

### Pattern A — named exports + property assignment (preferred)

```tsx
export function Carousel(props: CarouselProps) {
  /* … */
}
Carousel.displayName = 'Carousel'

export function CarouselHeader(props: ComponentProps<'div'>) {
  /* … */
}
CarouselHeader.displayName = 'Carousel.Header'

export function CarouselContent(props: CarouselContentProps) {
  /* … */
}
CarouselContent.displayName = 'Carousel.Content'

// Direct property assignment. TypeScript widens `typeof Carousel` to
// include each attached part automatically — no cast needed.
Carousel.Header = CarouselHeader
Carousel.Content = CarouselContent
```

Consumers still write `<Carousel.Header>` and `<Carousel.Content>` — the public API is identical to Pattern B.

**Why this is preferred:**

- **`react-docgen-typescript` can extract the full props.** The docs site's `<PropsDefinitions>` walks the file with `react-docgen-typescript`. Object.assign + cast (Pattern B) hides the original interface from the parser, so the generated props table only catches a subset (often just the CVA variant props). Named exports give the parser a clean function declaration per subcomponent and the full interface comes through.
- **`displayName` is honoured.** The parser surfaces `Carousel.Header` (the explicit displayName) instead of `CarouselHeader` (the function name) in the docs.
- **No type cast.** TypeScript widens the function symbol when you assign properties to it, so the `as typeof Root & { Header: …; Content: …; }` cast in Pattern B becomes unnecessary.

**One thing to know:** the parser will detect each subcomponent twice — once via the named export and once via the `Carousel.X = …` assignment. `PropsDefinitions` deduplicates these by normalising the displayName (strip dots, lowercase) and preferring the dot-notation entry. You don't need to do anything; just be aware if you debug parser output.

### Pattern B — Object.assign + cast (legacy)

```tsx
function CardRoot(props: CardProps) {
  /* … */
}
CardRoot.displayName = 'Card'

function CardHeader(props: ComponentProps<'div'>) {
  /* … */
}

export const Card = Object.assign(CardRoot, {
  Header: CardHeader
  // …
}) as typeof CardRoot & {
  Header: typeof CardHeader
  // …
}
```

This was the original Roadie pattern and lived in Card, Accordion, Field, Fieldset, Steps, RadioGroup, Select, Combobox, Autocomplete, and Breadcrumb until the April 2026 migration. It works at runtime, but the cast erases the original component's props from `react-docgen-typescript`'s view, which is why the docs pages for those components used to show only CVA variant props (`intent`, `emphasis`) instead of the full interface.

**Converting Pattern B → Pattern A** — if you encounter it in a fork, cherry-pick, or code archaeology: rename the root function from `XRoot` to `X`, add `export` to every subcomponent function, replace the `Object.assign + cast` block with direct property assignments. Purely structural; no behaviour or public-API change. The docs page will start showing the full props on the next build.

## Checklist for new / migrated compounds

Use this as a final pre-merge check when creating a new compound component or touching an existing one:

- [ ] Root and every subcomponent use named `export function`
- [ ] Every subcomponent has an explicit dot-notation `displayName` (`Carousel.Header`, not `CarouselHeader`)
- [ ] Subcomponents are attached via direct property assignment (`Carousel.Header = CarouselHeader`) — no `Object.assign + cast`
- [ ] Every **subcomponent** prop type is declared as `type X = Base & { ... }`, not `interface X extends Base` (root prop types are exempt — see next section)
- [ ] No CVA variant prop typed via `VariantProps<typeof v>['key']` on the public prop shape — inline the literal union instead (see the CVA literal props solution doc)
- [ ] Dev-only warnings use `process.env.NODE_ENV` with the `typeof process !== 'undefined'` guard (never `import.meta.env.DEV`, which silently dies in Next.js / Webpack / Rollup consumers)
- [ ] Context-only vs index-injection decision made consciously (see the Decision matrix above)
- [ ] If index-injection: per-item providers keyed with `child.key ?? index`
- [ ] Docs page renders without `<PropsDefinitions>` dropping any subcomponents — open it locally, scroll the props section, confirm every subcomponent's full prop set is visible
- [ ] `grep -rn "Object.assign" packages/components/src/components` still returns zero results after your change

## Subcomponent prop types: `type` alias, not `interface extends`

Declare subcomponent Props types as `type X = Base & { ... }`, not `interface X extends Base`. The docs site's `<PropsDefinitions>` table reads the first own prop's `parent.name` and falls back to `${displayName}Props` when the parent resolves to an inherited HTML interface. The type-alias form hits the fallback path and surfaces the heading as `Carousel.ContentProps` (with the dot), consistent with every other subcomponent. The `interface extends` form surfaces the first-prop parent directly, which is the raw interface name `CarouselContentProps` (no dot) — visually out of line with the sibling sections.

```tsx
// ✅ Preferred — headings render as `Carousel.ContentProps`
export type CarouselContentProps = ComponentProps<'div'> & {
  containerProps?: ComponentProps<'div'>
  overflow?: 'hidden' | 'visible' | 'subtle'
}

// ❌ Legacy — headings render as `CarouselContentProps` (no dot)
export interface CarouselContentProps extends ComponentProps<'div'> {
  containerProps?: ComponentProps<'div'>
  overflow?: 'hidden' | 'visible' | 'subtle'
}
```

A related rule from the same debug cycle: **don't type CVA variant props as `VariantProps<typeof variants>['key']` on the public prop shape**. `react-docgen-typescript` can't drill into CVA's conditional types, so the literal values never reach the table and the prop silently vanishes from the docs. Inline the literal union on the prop itself and export a sibling type alias (`export type XOverflow = 'a' | 'b' | 'c'`) for consumers who want to annotate their own wrappers. See [`docs/solutions/build-errors/react-docgen-cva-literal-props.md`](../solutions/build-errors/react-docgen-cva-literal-props.md) for the full story.

## Three-slot Header layout (responsive)

Compounds that ship a header with a title on the left, a content-driven middle slot (dots, search, status indicator), and a right-pinned trailing slot (controls, overflow menu) should use a single layout shell with position-based child selectors rather than an inner grid of hand-placed divs. The pattern lets consumers drop 1, 2, or 3 children in any order and the layout adapts automatically.

```tsx
export type FooHeaderProps = ComponentProps<'div'>

export function FooHeader({ className, ...props }: FooHeaderProps) {
  return (
    <div
      className={cn(
        // Mobile: flex justify-between so a 2-child (title + controls,
        // with the middle slot hidden) arrangement stays legible.
        'mb-2 flex items-center justify-between gap-4',
        // Desktop (md+): 3-column grid, middle column sized to content.
        'md:grid md:grid-cols-[1fr_auto_1fr]',
        // Child placement by source order — not component type — so a
        // consumer who drops in a custom <Search /> middle slot still
        // gets the right layout.
        'md:[&>*:first-child]:justify-self-start',
        'md:[&>*:last-child:not(:first-child)]:col-start-3',
        'md:[&>*:last-child:not(:first-child)]:justify-self-end',
        'md:[&>*:nth-child(2):not(:last-child)]:col-start-2',
        'md:[&>*:nth-child(2):not(:last-child)]:justify-self-center',
        className
      )}
      {...props}
    />
  )
}
```

Behaviour:

- **1 child** → left-pinned only (e.g. just a Title)
- **2 children** → first left, second right-pinned via `col-start-3 justify-self-end`
- **3 children** → first left, middle in col 2 centered, third right-pinned

The selectors are factored to avoid the single-child case picking up the right-pinned styling that the 2- and 3-child cases need — `:last-child:not(:first-child)` excludes the one-child scenario from the right-pinned rules.

**Mobile collapse**: the outer `flex items-center justify-between` is active below `md`, and any slot that should only appear on desktop (typically the controls slot) uses its own `hidden md:flex` to vanish on narrow viewports. With the controls removed, the remaining title + middle slot (e.g. dots) sit at opposite ends of the flex row via `justify-between`, so the header stays visually balanced without any breakpoint-specific consumer code.

Carousel.Header is the first concrete consumer of this pattern; other compound headers (Steps, future Drawer, future Modal) should reuse the same selector idiom rather than re-deriving it.
