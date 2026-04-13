# Compound Patterns

Roadie has two distinct compound-component idioms in use. Both expose a `Root + Object.assign(parts)` API, but they wire context differently. New compound components should pick one consciously — they're not interchangeable.

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

The root owns global state via context, but a *container* subcomponent (like `Carousel.Content`) walks its direct children with `Children.map` and wraps each one in a per-item context provider that carries position metadata (`{ index, total, isActive }`). Items read both contexts.

```tsx
const FooContext = createContext<FooState | null>(null)
const FooItemContext = createContext<{ index: number; total: number } | null>(null)

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

**Trade-off — the direct-children constraint:** `Children.map` walks only **direct** children. Fragments, mapped arrays where each element renders multiple `Item`s, and conditionally rendered children that wrap an `Item` inside another component will *not* be unwrapped. The contributing rule:

> Inside `Carousel.Content` (or any index-injection container), only render direct `<Carousel.Item>` children.

Roadie ships a dev-only warning when a non-Item element is found at a direct-child position so authors find this fast.

**Alternative considered (and rejected for v1):** shadcn's carousel uses `api.slideNodes()` and walks the DOM imperatively to set `data-active`/`inert`/`aria-label` after each render. That works with fragments and conditional children, but it (a) leaks DOM mutation outside React's model, (b) makes per-item state hard to test, and (c) doesn't compose with React's hydration model. Index injection trades flexibility for a cleaner React story.

## Decision matrix

| Need | Pattern |
| --- | --- |
| Children share theme / intent / config | Context-only |
| Items need to know their own position | Index injection |
| Children may include fragments or conditionals | Context-only |
| Per-item ARIA labels (e.g. `aria-label="3 of 5"`) | Index injection |
| Direct children API is acceptable | Either |

If you find yourself wanting both — items need both global state AND positional metadata — use index injection at the container level and a separate root context for the global state. That's exactly what `Carousel` does (`CarouselStateContext` + `CarouselItemContext`).
