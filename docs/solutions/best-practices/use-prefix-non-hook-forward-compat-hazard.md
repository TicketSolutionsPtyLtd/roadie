---
title: Avoid the `use` prefix on pure helpers — forward-compat hook-rule hazard
date: 2026-04-29
category: best-practices
module: components
problem_type: best_practice
component: tooling
severity: medium
applies_when:
  - Writing a pure / stateless helper in a React component package
  - The helper is called conditionally, in loops, or after early returns
  - The helper does not (and should not) call any React hook
  - The codebase uses eslint-plugin-react-hooks
symptoms:
  - eslint-plugin-react-hooks flags calls to the helper as "hooks called conditionally"
  - Multiple reviewers independently raise the same naming concern
  - A future contributor adds a hook call to the helper, silently violating Rules of Hooks at runtime
root_cause: wrong_api
resolution_type: code_fix
related_components:
  - Card
  - Breadcrumb
  - Carousel
tags:
  - react-hooks
  - naming-conventions
  - eslint
  - forward-compatibility
  - pure-helpers
  - use-prefix
  - hooks-rules
---

# Avoid the `use` prefix on pure helpers — forward-compat hook-rule hazard

## Context

Component libraries built on Base UI often need thin helper utilities
that follow the same render-prop contract as Base UI primitives —
accepting either a function `(props) => ReactElement` or a React element
to clone into. Writing this logic once and reusing it across components
(Card, Breadcrumb.Link, Carousel.TitleLink, etc.) is the right call.

The trap: the helper _looks_ hook-shaped. It takes props, it returns a
React element, and the implementer's first instinct is to name it
`useRender` — mirroring `useId`, `useMemo`, `useCallback`. Nothing
about it actually involves React's hook system: no `useState`, no
`useContext`, no `useEffect`. But the `use` prefix silently advertises
the opposite to every reader, every linter, and every future contributor.

This learning was surfaced by **four independent code-review subagents**
(maintainability, kieran-typescript, project-standards, api-contract) all
flagging the same `useRender` helper in commit
[`67212c6`](https://github.com/TicketSolutionsPtyLtd/roadie/commit/67212c6)
within minutes of dispatch. When four reviewers with different lenses
converge on a naming choice, the convention is genuinely confusing to
humans and tooling alike — treat that as the signal it is.

## Guidance

**Reserve the `use*` prefix exclusively for true React hooks.** Pure
helpers — functions that take inputs and return outputs without calling
any hook — must use verb prefixes: `resolveX`, `applyX`, `makeX`,
`buildX`, `computeX`, `getX`, `formatX`.

Add an explicit JSDoc disclaimer to any utility that could be mistaken
for a hook (anything that accepts or returns React elements):

```ts
/**
 * Resolves a RoadieRenderProp to a concrete ReactElement.
 *
 * **This is not a React hook** — it never calls hooks internally and is
 * safe to call inside conditional branches, loops, or early returns.
 * Named without the `use` prefix on purpose, so
 * `eslint-plugin-react-hooks` and the Rules of Hooks do not apply to
 * call sites.
 */
export function resolveRender<P extends AnyProps>(
  defaultElement: ElementType,
  defaultProps: P,
  render: RoadieRenderProp<P> | undefined
): ReactElement {
  if (render === undefined) {
    return createElement(defaultElement, defaultProps)
  }
  if (typeof render === 'function') return render(defaultProps)
  if (isValidElement(render)) {
    const merged = mergeProps(defaultProps, render.props)
    return cloneElement(render, merged)
  }
  return createElement(defaultElement, defaultProps)
}
```

## Why This Matters

**1. Rules-of-Hooks lint fires on every conditional call site.**

`eslint-plugin-react-hooks` enforces the `use*` naming convention as a
syntactic rule — it cannot inspect function bodies. It assumes any
`use`-prefixed function is a hook and flags every call that isn't at the
top level of a component or another hook. A helper named `useRender`
called inside an `if (render !== undefined) { … }` block generates a
lint error even though the code is perfectly safe at runtime. Fixing
the lint with `// eslint-disable-next-line` would suppress a real rule
that should keep firing for actual hooks — bad trade.

**2. The future-hazard scenario is the more serious risk.**

Suppose a contributor later needs the helper to read a theming context —
a natural evolution for a render-prop resolver in a design system. They
reach for `useContext` inside `useRender`:

```ts
// Looks reasonable — it's already called useRender after all
export function useRender<P>(el, props, render) {
  const theme = useContext(ThemeContext) // ← now it IS a hook
  // ...
}
```

This change is syntactically valid, tests may still pass, and the diff
looks small. But every existing conditional call site —
`if (render !== undefined) { return useRender(…) }` in three
components — silently becomes a **runtime Rules-of-Hooks violation**.
React's hook index gets misaligned the moment `render` flips between
undefined and defined across renders. The bug only surfaces in
production, intermittently, with cryptic "rendered fewer hooks than
expected" errors.

If the helper had been named `resolveRender`, the same contributor
would recognise they now need to rename it (to `useResolveRender` or
similar) **and** audit every call site for conditional usage — a
visible, deliberate refactor rather than a silent footgun.

**3. Independent reviewer convergence is high signal.**

In the original PR (`feat/roadie-link-provider`), four separate code-
reviewer subagents flagged the naming hazard with confidence between
0.65 and 0.90. They had different review lenses (maintainability,
TypeScript strictness, project standards, API contract) but reached
the same conclusion. When multiple reviewers independently surface a
naming concern, rename immediately — it's an architectural smell, not
a style nit.

## When to Apply

Apply this rule to **every helper, utility, and wrapper function** in
the components package before you write its first test:

- If the function never calls any hook → name it with a verb prefix
  (`resolveX`, `applyX`, `makeX`, `buildX`, `computeX`, `getX`,
  `formatX`). Never `useX`.
- If the function calls at least one hook (`useState`, `useEffect`,
  `useContext`, `useRef`, `useMemo`, `useCallback`, any custom hook,
  directly or transitively) → name it `useX` and treat it as a hook.
  Only call it at the top level of a component or another hook.

**Quick test before naming:**

> "Does this function call any hook, directly or transitively?"
>
> - No → verb prefix, never `use`.
> - Yes → `use` prefix, Rules of Hooks apply everywhere it's called.

**The inverse — when a pure helper grows into a hook:**

If `resolveRender` (or any other verb-prefix utility) later needs to
call `useContext`, `useRef`, or any other hook, that is a **rename
event**:

1. Rename `resolveRender` → `useResolveRender` (or a cleaner name).
2. Audit every call site for conditional usage, loops, and early
   returns.
3. Refactor call sites as needed before merging.

Do not add a hook call to a non-hook-named function and move on. The
rename is the contract update — it's the signal to every future reader
that the rules changed.

## Examples

### Example 1 — The original rename

|                           | Before                                              | After                                                       |
| ------------------------- | --------------------------------------------------- | ----------------------------------------------------------- |
| **File**                  | `packages/components/src/utils/useRender.tsx`       | `packages/components/src/utils/resolveRender.tsx`           |
| **Export**                | `export function useRender(...)`                    | `export function resolveRender(...)`                        |
| **Import in CardRoot**    | `import { useRender } from '../../utils/useRender'` | `import { resolveRender } from '../../utils/resolveRender'` |
| **Call site in CardRoot** | `return useRender(el, props, render)`               | `return resolveRender(el, props, render)`                   |

The call-site shape is identical — only the function name changed. No
logic changed; the lint hazard disappears and the intent is now
unambiguous. All 476 tests passed unchanged after the rename.

### Example 2 — Call-site change is zero (the lint was name-driven, not logic-driven)

```tsx
// Before — eslint-plugin-react-hooks would flag this when enabled
function CardRoot({ render, ...props }: CardRootProps) {
  if (render !== undefined) {
    return useRender(CardElement, props, render)  // ❌ react-hooks/rules-of-hooks
  }
  return <CardElement {...props} />
}

// After — identical logic, no lint exposure, no future hazard
function CardRoot({ render, ...props }: CardRootProps) {
  if (render !== undefined) {
    return resolveRender(CardElement, props, render)  // ✅
  }
  return <CardElement {...props} />
}
```

No restructuring of component code was required. The rename was the
entire fix.

### Example 3 — How a future `useContext` addition silently breaks things if the name stays `useX`

```tsx
// Hypothetical future state — helper still named useRender, now calls a hook
export function useRender<P>(el, props, render) {
  const theme = useContext(ThemeContext) // ← added by a well-meaning contributor
  // ...
}

// CardRoot — call site never changed, still conditional
function CardRoot({ render, ...props }: CardRootProps) {
  if (render !== undefined) {
    // 💥 runtime violation: hooks must be called in the same order every
    // render. When `render` is undefined, this hook is skipped. Next render
    // where it isn't undefined, React's hook index is misaligned and
    // produces "Rendered fewer hooks than expected" errors.
    return useRender(CardElement, props, render)
  }
  return <CardElement {...props} />
}
```

If the function had been named `resolveRender`, the contributor adding
`useContext` would have been forced to rename it — making the call-site
audit a natural, visible step rather than an invisible hazard.

## Related Solutions

- [Cross-bundler dev-env check](../build-errors/cross-bundler-dev-env-check.md) —
  a related "tooling-triggered by identifier form" pattern in the same
  components package: `import.meta.env.DEV` silently never fires under
  Next.js/Webpack consumers. Both problems are about authoring choices in
  a cross-consumer library package whose tooling enforcement varies by
  identifier shape.

## Prevention

- **Naming review during code review.** When a helper accepts or returns
  React elements, scrutinise its prefix before merging. The PR template
  for component changes should include a "Helpers named with verbs, not
  `use*` unless they call hooks" checkbox.
- **Add `eslint-plugin-react-hooks` to the components package.** It
  catches conditional calls to `use*`-named functions automatically. The
  lint failure becomes the early signal that either (a) the function is
  misnamed or (b) the call site needs to move to top level.
- **JSDoc disclaimer on look-alike utilities.** Any helper that takes
  props or returns elements should explicitly state it is not a hook,
  pre-empting the next contributor's "should I call `useContext` here?"
  question.
- **Treat 2+-reviewer naming concerns as architectural, not stylistic.**
  Multiple independent reviewers converging on a name is high signal.
  Rename at the source rather than disabling the lint.
