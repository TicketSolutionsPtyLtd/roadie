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

## Compound assembly: prefer named exports + property assignment

There are two ways to attach subcomponents to the root once you have them. **New compounds should use Pattern A.** Pattern B is what older Roadie components (Card, Accordion, Field, etc.) use, and is left in place for backwards compatibility.

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

Used by Card, Accordion, Field, and others. Works at runtime, but the cast erases the original component's props from the parser's view, which is why those docs pages currently show only the CVA variant props (`intent`, `emphasis`).

**Migration:** any compound can be converted from Pattern B to Pattern A in one PR — rename the root function, add `export` to each part, replace the Object.assign + cast with property assignments. The change is purely structural; no behaviour or public-API change. The docs page will start showing the full props on the next build.
