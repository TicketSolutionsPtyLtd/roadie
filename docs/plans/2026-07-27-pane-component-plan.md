# Pane Component & Pane Stack — Implementation Plan (Phase 1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `Pane` a standalone Roadie component with `Navigator.Content` as the sole master–detail orchestrator, replacing `Navigator.Secondary presentation='pane'` and proving it by migrating the docs Components browser.

**Architecture:** `Pane` owns surface, scroll, chrome and sizing, and works with no `Navigator` present. `Navigator.Content` arranges panes with flex and resolves `presentation='column'` down to `stack` where space runs out. The pane stack becomes explicit state — a depth pointer derived from each pane's `current` prop — replacing the `isTopPane` + `:has()` participation derivation. **JS owns depth; CSS owns whether depth matters.** There are no `matchMedia` calls: depth is band-independent, and stack styling applies only below `lg`, so the two never need keeping in sync.

**Tech Stack:** React 19, TypeScript strict, Tailwind v4, Base UI `ScrollArea`, CVA, `motion/mini`, Vitest + React Testing Library.

**Design spec:** [`docs/brainstorms/2026-07-27-pane-component-design.md`](../brainstorms/2026-07-27-pane-component-design.md)

## Scope: this is Phase 1 of two

The spec carries seven new capabilities. This plan covers the core thesis —
`Pane`, the stack, responsive orchestration, the yielded-inspector affordance,
`primaryNav`, and the docs migration that proves it. **Phase 2** (a separate
plan, same branch, same PR) covers the nav surface: `Navigator.Group` rework,
`Navigator.GroupTitle`, `Navigator.Primary`'s `tabs`, `Navigator.Overflow` /
`OverflowItems`, `Navigator.Panel`, and per-section stack memory. Phase 2
depends on Phase 1's stack state and `Pane`, so the order is forced. Splitting
the plans (not the PR) keeps each reviewable; the agreed single PR is
unaffected.

**Per-section stack memory is deliberately in Phase 2**, not here. It is
link-retargeting — storing the last value per section so a rail item points at
where you left off — which touches `Navigator.Primary`'s item rendering rather
than the pane stack. Grouping it with the nav-surface work keeps Phase 1 to one
subsystem.

## Global Constraints

- **React 19 stable.** `animateView` / React `ViewTransition` require `react@canary` — not available. Do not reach for them.
- **Motion: `motion/mini` only.** Import `animate` from `motion/mini` and `spring` from `motion`. The hybrid build's independent transforms (`x`, `scale`) are implemented via CSS variables and are **not** compositor-accelerated.
- **Animate full `transform` strings**, never individual transform values, or acceleration is lost.
- **Within a band, animate; across a band, do not.** A resize crossing `md` or `lg` changes arrangement instantly.
- **`will-change: transform` sparingly** — each layer costs GPU memory. Only on a pane that is currently animating.
- **Author `Pane` / `List.Group` trees in client components.** Flight replaces every element type with a `React.lazy` wrapper, so identity walks fail silently. Canary: `docs/src/app/debug/rsc-smoke/`. See `COMPOUND_PATTERNS.md` §1.2.
- **`List`'s styling is a selector contract**: `li > [data-slot=list-item] > [data-slot=list-item-content]` by child combinator. Emit those slots in that shape or get nothing — and it fails past typecheck *and* tests.
- **Base UI `ScrollArea` sets `position: relative` inline.** A class cannot beat it; the stacked pane needs `absolute!`.
- **`react-docgen-typescript` cannot drill into CVA conditional types.** Inline literal unions on public props and export sibling type aliases (`PaneRole`, `PanePresentation`, `PanePrimaryNav`, `PaneEmphasis`).
- **`noUncheckedIndexedAccess` is on** — indexed reads widen to `T | undefined`.
- **`Navigator.test.tsx` uses `flushViewportMeasurement()`** ~105 times. Any test rendering a Navigator must be `async` and await it. The suite's React `act()` warning count is **17** and must not grow.
- **Dev warnings use `isDev()`** from `packages/components/src/utils/isDev.ts`. Never `import.meta.env.DEV`.
- **Breakpoints:** `md` (768) flips nav form; `lg` (1024) flips pane arrangement. Never conflate them.
- **Prettier:** single quotes, no semicolons, 2 spaces, 80 columns, Tailwind class sorting.
- **Never run `prettier --write` on `.mdx`** — it empties the file.
- **Never run `pnpm --filter docs build` while the docs dev server is running** — `next build` corrupts the running `.next`.
- **Rebuild components before docs pick up changes:** `pnpm --filter @oztix/roadie-components build`.
- **Gate:** `pnpm test`, `pnpm typecheck`, `pnpm lint`.

## Mobile performance requirements

A phone runs the stacked bands, so this is where the design is most exposed.
These are requirements, not suggestions — each has a specific task.

1. **Never animate a layout-triggering property.** `height`, `width`,
   `padding`, `top`/`left`, `border-width`. Only `transform` and `opacity`.
   A pane that needs to change size changes it instantly and animates a
   transform instead.
2. **Composed transform strings only.** `transform: 'translateX(-22%)'`, never
   `{ x: '-22%' }` — including in React `motion` components. Hardware
   acceleration is only offered for the composed form.
3. **The scroll handler must not render on every frame.** `primaryNav='auto'`
   reads `scrollTop` and may call `setState` on each scroll event. Coalesce
   with `requestAnimationFrame` and bail before `setState` when the value has
   not changed — an uncoalesced handler turns a scroll into a React render per
   frame, which is exactly the jank a phone shows first. (Task 9.)
4. **Skip rendering work for covered panes.** A stacked pane underneath is not
   visible, so `content-visibility: auto` lets the browser skip its layout and
   paint entirely. This pairs exactly with `data-top="false"`, costs one
   declaration, and is the single largest mobile win available here. (Task 8.)
5. **Keep the promoted-layer count down.** Each composited layer costs GPU
   memory, and a phone has little. `will-change` is set only for an
   animation's duration and cleared after (Task 3). Shadows belong only on a
   pane that is actually overlaying — a `column` pane carrying `shadow-xl`
   pays for a blur it doesn't need.
6. **`overscroll-contain` on every pane viewport**, so a pane's scroll never
   chains into the document on iOS. Already in `paneViewportVariants`.

**Known limit, to be documented rather than solved:** `List` does not
virtualise, and panes scroll natively. The docs Components pane renders ~50
rows and is fine. A consumer list in the thousands would need virtualisation,
which `Pane` neither provides nor prevents. Say so on the Pane docs page
(Task 14) instead of letting someone discover it.

## File Structure

**Created**

| File | Responsibility |
| --- | --- |
| `packages/components/src/components/Pane/PaneRoot.tsx` | The pane: surface, scroll, sizing, data attributes |
| `packages/components/src/components/Pane/PaneContext.ts` | Publishes the pane's element ref and role to its chrome |
| `packages/components/src/components/Pane/PaneHeader.tsx` | Sticky top chrome; publishes measured height |
| `packages/components/src/components/Pane/PaneTitle.tsx` | `<h2>` heading inside the header |
| `packages/components/src/components/Pane/PaneActions.tsx` | Trailing slot in the header top row |
| `packages/components/src/components/Pane/PaneSearch.tsx` | Styled search input for pane headers. No filter machinery |
| `packages/components/src/components/Pane/PaneFooter.tsx` | Sticky bottom chrome |
| `packages/components/src/components/Pane/variants.ts` | All Pane CVA definitions |
| `packages/components/src/components/Pane/index.tsx` | Property-assignment export layer (server-safe, no `'use client'`) |
| `packages/components/src/components/Pane/Pane.test.tsx` | Pane unit tests |
| `packages/components/src/utils/paneMotion.ts` | `motion/mini` spring helper; reduced-motion decision |
| `packages/components/src/utils/paneMotion.test.ts` | Motion helper tests |
| `packages/components/src/components/Navigator/paneStack.ts` | Pure depth derivation from `current` flags |
| `packages/components/src/components/Navigator/paneStack.test.ts` | Depth derivation tests |
| `docs/src/app/components/pane/page.mdx` | Pane documentation page |

**Modified**

| File | Change |
| --- | --- |
| `packages/components/src/components/List/ListItem.tsx` | `selected` → `current` |
| `packages/components/src/components/List/ListGroup.tsx` | `aria-labelledby` association |
| `packages/components/src/components/List/ListGroupTitle.tsx` | `<p>` → `<h2>` + `render` |
| `packages/components/src/components/List/index.tsx` | Export updated types |
| `packages/components/src/components/Navigator/NavigatorContent.tsx` | Becomes the orchestrator |
| `packages/components/src/components/Navigator/NavigatorContext.ts` | Section memory; drop pane-secondary state |
| `packages/components/src/components/Navigator/NavigatorPrimary.tsx` | Drop pane derivations; use `List.Item current` |
| `packages/components/src/components/Navigator/variants.ts` | Content arrangement rules; remove pane variants |
| `packages/components/src/components/Navigator/index.tsx` | Remove deleted exports |
| `packages/components/src/index.tsx` | Export `Pane` |
| `packages/components/package.json` | Add `motion` |
| `docs/src/components/Navigation.tsx` | Migrate to `Pane` + real `List` |

**Deleted**

`NavigatorPane.tsx`, `NavigatorPaneHeader.tsx`, `NavigatorSecondaryPane.tsx`, `NavigatorSecondaryPaneSearch.tsx`, `NavigatorFilterContext.ts`, `NavigatorPaneContext.ts`, `collectItemMetas.ts`, `isTopPane.ts`.

---

### Task 1: Rename `List.Item`'s `selected` to `current`

`List.Item` currently emits `aria-current="true"` from a boolean `selected`. Nav rows need `aria-current="page"`. One prop, one attribute.

**Files:**
- Modify: `packages/components/src/components/List/ListItem.tsx:43-46,100-101`
- Modify: `packages/components/src/components/List/index.tsx`
- Modify: `packages/components/src/components/Navigator/NavigatorPrimary.tsx` (overflow pane's `List.Item selected=` → `current=`)
- Test: `packages/components/src/components/List/List.test.tsx`

**Interfaces:**
- Produces: `export type ListItemCurrent = boolean | 'page' | 'step' | 'location'`; `ListItemProps.current?: ListItemCurrent`

- [ ] **Step 1: Write the failing tests**

Add to `List.test.tsx`:

```tsx
describe('current', () => {
  it('marks a boolean current item with aria-current="true"', () => {
    render(
      <List>
        <List.Item title='Channel 10' current />
      </List>
    )
    expect(item('Channel 10')).toHaveAttribute('aria-current', 'true')
  })

  it('passes a token through to aria-current', () => {
    render(
      <List>
        <List.Item title='Button' href='/components/button' current='page' />
      </List>
    )
    expect(item('Button')).toHaveAttribute('aria-current', 'page')
  })

  it('omits aria-current when not current', () => {
    render(
      <List>
        <List.Item title='Personal' />
      </List>
    )
    expect(item('Personal')).not.toHaveAttribute('aria-current')
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @oztix/roadie-components test -- List.test.tsx`
Expected: FAIL — `current` is not a known prop, `aria-current` absent.

- [ ] **Step 3: Implement**

In `ListItem.tsx`, replace the `selected` prop and its derivation:

```tsx
export type ListItemCurrent = boolean | 'page' | 'step' | 'location'
```

```tsx
  /**
   * Marks the item as current. `true` emits `aria-current="true"` — the right
   * choice for a selection such as an org picker. A token emits itself:
   * `current='page'` for a navigation row pointing at the current page.
   */
  current?: ListItemCurrent
```

Replace the destructure `selected = false` with `current = false`, and:

```tsx
  const finalClassName = cn(listItemVariants({ selected: current !== false }), className)
  const ariaCurrent = current === false ? undefined : current
```

`listItemVariants`' variant key stays `selected` — it is internal and the CSS
already keys off bare `[aria-current]`.

Update `index.tsx` to export `ListItemCurrent`.

- [ ] **Step 4: Update the one existing consumer**

In `NavigatorPrimary.tsx` the overflow pane renders `List.Item` with
`selected={isBranchActive(...)}`. Change to `current={isBranchActive(...)}`.

- [ ] **Step 5: Run the full suite**

Run: `pnpm --filter @oztix/roadie-components test && pnpm typecheck`
Expected: PASS. Typecheck catches any other `selected=` call site.

- [ ] **Step 6: Commit**

```bash
git add packages/components/src/components/List packages/components/src/components/Navigator/NavigatorPrimary.tsx
git commit -m "refactor(list): rename Item's selected to current with an aria-current token"
```

---

### Task 2: Associate `List.Group`'s title with its list, and make it an `<h2>`

`List.GroupTitle` is a bare `<p>` that `List.Group` never associates with its nested `<ul>`, so assistive tech announces loose text followed by an anonymous list.

**Files:**
- Modify: `packages/components/src/components/List/ListGroupTitle.tsx`
- Modify: `packages/components/src/components/List/ListGroup.tsx`
- Test: `packages/components/src/components/List/List.test.tsx`

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces: `ListGroupTitleProps = ComponentProps<'h2'> & { render?: (props: ComponentProps<'h2'>) => ReactElement }`

- [ ] **Step 1: Write the failing tests**

```tsx
describe('group association', () => {
  it('labels the group list with its title', () => {
    render(
      <List>
        <List.Group>
          <List.GroupTitle>Inputs</List.GroupTitle>
          <List.Item title='Button' />
        </List.Group>
      </List>
    )
    const title = screen.getByText('Inputs')
    const section = screen
      .getByRole('list', { name: 'Inputs' })
    expect(section).toHaveAttribute('aria-labelledby', title.id)
    expect(title.id).not.toBe('')
  })

  it('renders the title as a heading by default', () => {
    render(
      <List>
        <List.Group>
          <List.GroupTitle>Inputs</List.GroupTitle>
        </List.Group>
      </List>
    )
    expect(
      screen.getByRole('heading', { level: 2, name: 'Inputs' })
    ).toBeInTheDocument()
  })

  it('honours a render override', () => {
    render(
      <List>
        <List.Group>
          <List.GroupTitle render={(p) => <h3 {...p} />}>Inputs</List.GroupTitle>
        </List.Group>
      </List>
    )
    expect(
      screen.getByRole('heading', { level: 3, name: 'Inputs' })
    ).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @oztix/roadie-components test -- List.test.tsx`
Expected: FAIL — no heading role, no `aria-labelledby`.

- [ ] **Step 3: Implement `ListGroupTitle`**

```tsx
import type { ComponentProps, ReactElement } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { listGroupTitleVariants } from './variants'

export type ListGroupTitleProps = ComponentProps<'h2'> & {
  /**
   * Replace the rendered element. The default `<h2>` matches `Pane.Header`,
   * so it never collides with the page's `<h1>` — pass `render` when the
   * page's outline needs a different level.
   */
  render?: (props: ComponentProps<'h2'>) => ReactElement
}

/** Label for a `List.Group`. Declare it as the group's first child. */
export function ListGroupTitle({
  className,
  render,
  ...props
}: ListGroupTitleProps) {
  const resolved = {
    'data-slot': 'list-group-title',
    className: cn(listGroupTitleVariants(), className),
    ...props
  }
  return render ? render(resolved) : <h2 {...resolved} />
}

ListGroupTitle.displayName = 'List.GroupTitle'
```

- [ ] **Step 4: Implement the association in `ListGroup`**

`ListGroup` already separates the title from the rows by element identity.
Generate an id and clone the title with it, then point the `<ul>` at it:

```tsx
import { Children, type ReactNode, cloneElement, isValidElement, useId } from 'react'
```

```tsx
export function ListGroup({ children, className }: ListGroupProps) {
  const titleId = useId()
  const title: ReactNode[] = []
  const rows: ReactNode[] = []

  Children.forEach(children, (child) => {
    if (isValidElement(child) && child.type === ListGroupTitle) {
      // The id is injected rather than required from the consumer: the
      // association is what makes the section announce as a named list, and
      // it should not be something a call site can forget.
      title.push(cloneElement(child, { id: titleId }))
      return
    }
    rows.push(child)
  })

  return (
    <li data-slot='list-group' className={cn(listGroupVariants(), className)}>
      {title}
      <ul
        data-slot='list-section'
        aria-labelledby={title.length > 0 ? titleId : undefined}
        className={cn(listSectionClass, listGroupSectionClass)}
      >
        {rows}
      </ul>
    </li>
  )
}
```

`cloneElement` needs the element typed — annotate the walk as
`isValidElement<ListGroupTitleProps>(child)` so `id` typechecks under strict
mode.

- [ ] **Step 5: Run tests**

Run: `pnpm --filter @oztix/roadie-components test -- List.test.tsx && pnpm typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/components/src/components/List
git commit -m "fix(list): announce a group as a named list and title it with a heading"
```

---

### Task 3: Add `motion` and the pane motion helper

One helper owns every pane animation, so the acceleration rules live in one place instead of being re-derived per call site.

**Files:**
- Modify: `packages/components/package.json`
- Create: `packages/components/src/utils/paneMotion.ts`
- Test: `packages/components/src/utils/paneMotion.test.ts`

**Interfaces:**
- Produces:
  - `export function animatePaneTransform(el: HTMLElement, to: string, opts?: { opacity?: number }): void`
  - `export function prefersReducedMotion(): boolean`

- [ ] **Step 1: Add the dependency**

```bash
pnpm --filter @oztix/roadie-components add motion
```

Verify it lands in `dependencies` (not `devDependencies`) in
`packages/components/package.json`.

- [ ] **Step 2: Write the failing tests**

```ts
import { afterEach, describe, expect, it, vi } from 'vitest'

const animate = vi.fn()
vi.mock('motion/mini', () => ({ animate: (...args: unknown[]) => animate(...args) }))
vi.mock('motion', () => ({ spring: 'spring-fn' }))

const { animatePaneTransform } = await import('./paneMotion')

function stubReducedMotion(reduced: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: reduced && query.includes('reduce'),
    media: query
  }))
}

afterEach(() => {
  animate.mockReset()
  vi.unstubAllGlobals()
})

describe('animatePaneTransform', () => {
  it('animates the full transform string, not individual transforms', () => {
    stubReducedMotion(false)
    const el = document.createElement('div')
    animatePaneTransform(el, 'translateX(-22%)', { opacity: 0.6 })

    expect(animate).toHaveBeenCalledTimes(1)
    const [target, keyframes] = animate.mock.calls[0] as [
      HTMLElement,
      Record<string, unknown>
    ]
    expect(target).toBe(el)
    expect(keyframes).toEqual({ transform: 'translateX(-22%)', opacity: 0.6 })
    // Individual transforms go through CSS variables and lose acceleration.
    expect(keyframes).not.toHaveProperty('x')
  })

  it('applies the final state directly when reduced motion is requested', () => {
    stubReducedMotion(true)
    const el = document.createElement('div')
    animatePaneTransform(el, 'translateX(-22%)', { opacity: 0.6 })

    expect(animate).not.toHaveBeenCalled()
    expect(el.style.transform).toBe('translateX(-22%)')
    expect(el.style.opacity).toBe('0.6')
  })

  it('clears will-change once the animation settles', async () => {
    stubReducedMotion(false)
    animate.mockReturnValue({ finished: Promise.resolve() })
    const el = document.createElement('div')
    animatePaneTransform(el, 'translateX(0)')

    expect(el.style.willChange).toBe('transform')
    await Promise.resolve()
    await Promise.resolve()
    expect(el.style.willChange).toBe('')
  })
})
```

- [ ] **Step 3: Run to verify it fails**

Run: `pnpm --filter @oztix/roadie-components test -- paneMotion`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement**

```ts
import { spring } from 'motion'
import { animate } from 'motion/mini'

// `motion/mini` (2.3kb) rather than the hybrid build (18kb). This is not only
// a size choice: hybrid exists largely to add independent transforms (`x`,
// `scale`), which Motion implements via CSS variables and which are therefore
// NOT compositor-accelerated. Animating the full `transform` string through
// mini is both smaller and the only guaranteed-accelerated path.
// https://motion.dev/docs/performance
const PANE_SPRING = { type: spring, stiffness: 320, damping: 34, mass: 1 }

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

/**
 * Animate a pane to a transform state with an accelerated spring.
 *
 * Only `transform` and `opacity` are ever animated — the two properties
 * reliably handled on the compositor across browsers. `will-change` is set for
 * the duration and cleared afterwards, because each promoted layer costs GPU
 * memory and a pane stack would otherwise hold several permanently.
 */
export function animatePaneTransform(
  el: HTMLElement,
  to: string,
  opts: { opacity?: number } = {}
): void {
  const keyframes: Record<string, string | number> = { transform: to }
  if (opts.opacity !== undefined) keyframes.opacity = opts.opacity

  if (prefersReducedMotion()) {
    el.style.transform = to
    if (opts.opacity !== undefined) el.style.opacity = String(opts.opacity)
    return
  }

  el.style.willChange = 'transform'
  const controls = animate(el, keyframes, PANE_SPRING)
  void Promise.resolve(controls?.finished).finally(() => {
    el.style.willChange = ''
  })
}
```

- [ ] **Step 5: Run tests**

Run: `pnpm --filter @oztix/roadie-components test -- paneMotion`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/components/package.json packages/components/src/utils/paneMotion.ts packages/components/src/utils/paneMotion.test.ts pnpm-lock.yaml
git commit -m "feat(components): add an accelerated pane motion helper on motion/mini"
```

---

### Task 4: `Pane` root — surface, scroll, sizing

Lifts `NavigatorPane`'s proven ScrollArea structure into a standalone component, adds the `inspector` role and the `presentation` axis, and drops `hideOnMobile`.

**Files:**
- Create: `packages/components/src/components/Pane/variants.ts`
- Create: `packages/components/src/components/Pane/PaneContext.ts`
- Create: `packages/components/src/components/Pane/PaneRoot.tsx`
- Test: `packages/components/src/components/Pane/Pane.test.tsx`

**Interfaces:**
- Consumes: `animatePaneTransform` (Task 3) — not yet used here; wired in Task 8.
- Produces:
  - `export type PaneRole = 'list' | 'detail' | 'inspector'`
  - `export type PanePresentation = 'column' | 'stack' | 'sheet' | 'drawer'`
  - `export type PaneEmphasis = 'raised' | 'normal' | 'subtle' | 'subtler'`
  - `export type PanePrimaryNav = 'visible' | 'auto' | 'hidden'`
  - `PaneRootProps`, and `PaneContext` carrying `{ role: PaneRole, paneRef: RefObject<HTMLElement | null> }`

- [ ] **Step 1: Write the failing tests**

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Pane } from '.'

const pane = () => document.querySelector('[data-slot="pane"]')

describe('Pane', () => {
  it('renders a section with its role and presentation', () => {
    render(<Pane role='detail'>Body</Pane>)
    expect(pane()?.tagName).toBe('SECTION')
    expect(pane()).toHaveAttribute('data-role', 'detail')
    expect(pane()).toHaveAttribute('data-presentation', 'column')
  })

  it('defaults to a list pane in a column', () => {
    render(<Pane>Body</Pane>)
    expect(pane()).toHaveAttribute('data-role', 'list')
  })

  it('marks the inspector role so it yields first', () => {
    render(<Pane role='inspector'>Contents</Pane>)
    expect(pane()).toHaveAttribute('data-role', 'inspector')
  })

  it('carries an absolute presentation through untouched', () => {
    render(<Pane role='detail' presentation='stack'>Body</Pane>)
    expect(pane()).toHaveAttribute('data-presentation', 'stack')
  })

  it('scrolls in a nested viewport, not the section itself', () => {
    render(<Pane>Body</Pane>)
    expect(
      pane()?.querySelector('[data-slot="pane-viewport"]')
    ).toBeInTheDocument()
  })

  it('does not leak ScrollArea\'s presentation role onto the landmark', () => {
    render(<Pane aria-label='Components'>Body</Pane>)
    expect(pane()).not.toHaveAttribute('role')
    expect(screen.getByLabelText('Components')).toBe(pane())
  })

  it('renders standalone with no Navigator present', () => {
    render(<Pane role='detail'>Standalone</Pane>)
    expect(screen.getByText('Standalone')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @oztix/roadie-components test -- Pane.test.tsx`
Expected: FAIL — cannot resolve `.`.

- [ ] **Step 3: Write `variants.ts`**

```ts
import { cva } from 'class-variance-authority'

export type PaneRole = 'list' | 'detail' | 'inspector'
export type PanePresentation = 'column' | 'stack' | 'sheet' | 'drawer'
export type PaneEmphasis = 'raised' | 'normal' | 'subtle' | 'subtler'
export type PanePrimaryNav = 'visible' | 'auto' | 'hidden'

// The pane is a ScrollArea root: it owns the surface, the shape and the
// sizing; its viewport owns the scroll. The page itself never scrolls.
//
// Role is three sizing defaults plus a yield order, not a taxonomy:
//   list      capped track
//   detail    takes the remaining space
//   inspector fixed track, and the first to yield when space runs short
//
// Sizing applies from `lg`, the arrangement breakpoint — NOT `md`, which is
// the nav-form breakpoint. Between them the panes are still stacked.
export const paneVariants = cva(
  [
    'relative min-h-0 min-w-0',
    'overflow-hidden rounded-2xl max-lg:rounded-none'
  ],
  {
    variants: {
      role: {
        list: 'lg:w-96 lg:shrink-0',
        detail: 'lg:min-w-0 lg:flex-1',
        inspector: 'lg:w-56 lg:shrink-0 max-2xl:hidden'
      },
      emphasis: {
        raised: 'emphasis-raised',
        normal: 'emphasis-normal',
        subtle: 'emphasis-subtle',
        // A pane's `subtler` is no surface at all — not Card's faint tint plus
        // hairline. The recessive pane sits directly on the sunken frame the
        // way the rail does.
        subtler: ''
      }
    },
    defaultVariants: { role: 'list', emphasis: 'raised' }
  }
)

export const paneViewportVariants = cva(['size-full overscroll-contain'])
```

- [ ] **Step 4: Write `PaneContext.ts`**

```ts
'use client'

import { type RefObject, createContext } from 'react'

import type { PaneRole } from './variants'

// Published so a pane's own chrome can measure against it — `Pane.Header`
// writes `--pane-header-height` onto the pane element so sticky content
// further down can offset against it.
export type PaneContextValue = {
  role: PaneRole
  paneRef: RefObject<HTMLElement | null>
}

export const PaneContext = createContext<PaneContextValue | null>(null)
```

- [ ] **Step 5: Write `PaneRoot.tsx`**

```tsx
'use client'

import { type ComponentProps, useCallback, useMemo, useRef } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { ScrollArea } from '../ScrollArea'
import { PaneContext } from './PaneContext'
import {
  type PaneEmphasis,
  type PanePresentation,
  type PaneRole,
  paneVariants,
  paneViewportVariants
} from './variants'

// Base UI writes `overflow: scroll` inline on the viewport, so an
// `overflow-x-*` class loses. Without this a child a hair too wide drags the
// whole pane sideways. Wide children own their own horizontal scroll.
const CLIP_HORIZONTAL = { overflowX: 'clip' } as const

export type PaneRootProps = ComponentProps<'section'> & {
  /**
   * What this pane is. Drives sizing defaults and yield order — an
   * `inspector` yields first when space runs short, `detail` last.
   *
   * @default 'list'
   */
  role?: PaneRole
  /**
   * How the pane materialises. `column` is the only value the orchestrator
   * resolves: it means "beside my siblings where there is room, over them
   * where there isn't". Every other value is absolute — a `stack` pane
   * covers its siblings at every size.
   *
   * @default 'column'
   */
  presentation?: PanePresentation
  /**
   * This pane holds what the user is currently looking at. The deepest
   * `current` pane is the top of the stack. Affects only the stacked bands —
   * from `lg` up every pane is a column regardless.
   *
   * @default false
   */
  current?: boolean
  /**
   * Surface treatment. Mirrors `Card`'s names, except that a pane's `subtler`
   * is **no surface at all**, so it sits directly on the sunken frame.
   *
   * @default 'raised'
   */
  emphasis?: PaneEmphasis
}

export function PaneRoot({
  className,
  role = 'list',
  presentation = 'column',
  current = false,
  emphasis = 'raised',
  ref: forwardedRef,
  children,
  ...props
}: PaneRootProps) {
  const paneRef = useRef<HTMLElement | null>(null)

  // Composes with a consumer ref rather than overwriting it. Base UI's ref
  // type assumes the default `<div>`; the render prop actually renders a
  // `<section>`, which is what both refs hold.
  const setPaneRef = useCallback(
    (node: HTMLDivElement | null) => {
      paneRef.current = node
      if (typeof forwardedRef === 'function') forwardedRef(node)
      else if (forwardedRef) forwardedRef.current = node
    },
    [forwardedRef]
  )

  const context = useMemo(() => ({ role, paneRef }), [role])

  return (
    <ScrollArea
      // A function render, not `<section />`: `ScrollAreaRoot` hard-codes
      // `role: 'presentation'` on its own props (unrelated to the pane's
      // `role` prop, which never reaches the DOM). Overriding with
      // `undefined` removes the attribute rather than changing what landmark
      // a future `aria-label`'d pane exposes.
      render={(renderProps) => <section {...renderProps} role={undefined} />}
      data-slot='pane'
      data-role={role}
      data-presentation={presentation}
      data-current={current || undefined}
      className={cn(paneVariants({ role, emphasis }), className)}
      {...props}
      ref={setPaneRef}
    >
      <ScrollArea.Viewport
        data-slot='pane-viewport'
        className={paneViewportVariants()}
        style={CLIP_HORIZONTAL}
      >
        {/* Wrapped so the scrollbar re-measures as content swaps — the
            viewport's own box never changes. `fitWidth={false}` keeps the
            wrapper at the viewport's width so wide children stay clipped
            rather than stretching it. */}
        <ScrollArea.Content fitWidth={false}>
          <PaneContext value={context}>{children}</PaneContext>
        </ScrollArea.Content>
      </ScrollArea.Viewport>
      <ScrollArea.Scrollbar>
        <ScrollArea.Thumb />
      </ScrollArea.Scrollbar>
    </ScrollArea>
  )
}

PaneRoot.displayName = 'Pane.Root'
```

- [ ] **Step 6: Write a provisional `index.tsx`** so the test can import

```tsx
// Subpath entry for `@oztix/roadie-components/pane`.
// NO `'use client'` — server-safe property-assignment layer.
import { PaneRoot } from './PaneRoot'

const Pane = PaneRoot as typeof PaneRoot

export { Pane }
export type {
  PaneRole,
  PanePresentation,
  PaneEmphasis,
  PanePrimaryNav
} from './variants'
export type { PaneRootProps as PaneProps } from './PaneRoot'
```

- [ ] **Step 7: Run tests**

Run: `pnpm --filter @oztix/roadie-components test -- Pane.test.tsx`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add packages/components/src/components/Pane
git commit -m "feat(pane): add a standalone Pane with role, presentation and surface"
```

---

### Task 5: `Pane.Header`, `Pane.Title`, `Pane.Actions`

Header renders **in place** and publishes its measured height. Nothing teleports.

**Files:**
- Create: `packages/components/src/components/Pane/PaneHeader.tsx`
- Create: `packages/components/src/components/Pane/PaneTitle.tsx`
- Create: `packages/components/src/components/Pane/PaneActions.tsx`
- Modify: `packages/components/src/components/Pane/variants.ts`
- Modify: `packages/components/src/components/Pane/index.tsx`
- Test: `packages/components/src/components/Pane/Pane.test.tsx`

**Interfaces:**
- Consumes: `PaneContext` (Task 4).
- Produces: `PaneHeaderProps` with `backHref?: string`, `onBack?: () => void`; `PaneTitleProps = ComponentProps<'h2'>`; `PaneActionsProps = ComponentProps<'div'>`. Publishes CSS custom property `--pane-header-height` on the pane element.

- [ ] **Step 1: Write the failing tests**

```tsx
describe('Pane.Header', () => {
  it('renders the title as an h2 so it never collides with the page h1', () => {
    render(
      <Pane>
        <Pane.Header>
          <Pane.Title>Components</Pane.Title>
        </Pane.Header>
      </Pane>
    )
    expect(
      screen.getByRole('heading', { level: 2, name: 'Components' })
    ).toBeInTheDocument()
  })

  it('renders actions in the header', () => {
    render(
      <Pane>
        <Pane.Header>
          <Pane.Title>Components</Pane.Title>
          <Pane.Actions>
            <button type='button'>Add</button>
          </Pane.Actions>
        </Pane.Header>
      </Pane>
    )
    const header = document.querySelector('[data-slot="pane-header"]')
    expect(header?.querySelector('[data-slot="pane-actions"]')).toBeTruthy()
  })

  it('publishes its measured height on the pane', () => {
    render(
      <Pane>
        <Pane.Header>
          <Pane.Title>Components</Pane.Title>
        </Pane.Header>
      </Pane>
    )
    const paneEl = document.querySelector<HTMLElement>('[data-slot="pane"]')
    // jsdom reports offsetHeight 0, but the property must still be written —
    // its presence is what sticky content offsets against.
    expect(paneEl?.style.getPropertyValue('--pane-header-height')).toBe('0px')
  })

  it('renders a back affordance only when given a target', () => {
    const { rerender } = render(
      <Pane role='detail'>
        <Pane.Header>
          <Pane.Title>Button</Pane.Title>
        </Pane.Header>
      </Pane>
    )
    expect(screen.queryByRole('link', { name: 'Back' })).toBeNull()

    rerender(
      <Pane role='detail'>
        <Pane.Header backHref='/components'>
          <Pane.Title>Button</Pane.Title>
        </Pane.Header>
      </Pane>
    )
    expect(screen.getByRole('link', { name: 'Back' })).toBeInTheDocument()
  })

  it('never offers a back affordance on a list pane', () => {
    render(
      <Pane role='list'>
        <Pane.Header backHref='/'>
          <Pane.Title>Components</Pane.Title>
        </Pane.Header>
      </Pane>
    )
    expect(screen.queryByRole('link', { name: 'Back' })).toBeNull()
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @oztix/roadie-components test -- Pane.test.tsx`
Expected: FAIL — `Pane.Header` is not a function.

- [ ] **Step 3: Add variants**

Append to `packages/components/src/components/Pane/variants.ts`:

```ts
export const paneHeaderVariants = cva([
  'sticky top-0 z-sticky grid gap-2',
  'bg-inherit px-4 pt-4 pb-2'
])

export const paneHeaderTopRowVariants = cva([
  'flex items-center justify-between gap-2'
])

export const paneTitleVariants = cva(['text-display-ui-4 text-strong'])

export const paneActionsVariants = cva(['flex items-center gap-1'])
```

`z-sticky` (20) sits above the scrollbar's `z-docked` (10) so an opaque header
stops the track — both boundaries were established on the current branch.

- [ ] **Step 4: Write `PaneTitle.tsx` and `PaneActions.tsx`**

```tsx
import type { ComponentProps } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { paneTitleVariants } from './variants'

export type PaneTitleProps = ComponentProps<'h2'>

/** Rendered as an `<h2>` so it never collides with the page's own `<h1>`. */
export function PaneTitle({ className, ...props }: PaneTitleProps) {
  return (
    <h2
      data-slot='pane-title'
      className={cn(paneTitleVariants(), className)}
      {...props}
    />
  )
}

PaneTitle.displayName = 'Pane.Title'
```

```tsx
import type { ComponentProps } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { paneActionsVariants } from './variants'

export type PaneActionsProps = ComponentProps<'div'>

/** Trailing slot in the header's top row. */
export function PaneActions({ className, ...props }: PaneActionsProps) {
  return (
    <div
      data-slot='pane-actions'
      className={cn(paneActionsVariants(), className)}
      {...props}
    />
  )
}

PaneActions.displayName = 'Pane.Actions'
```

- [ ] **Step 5: Write `PaneHeader.tsx`**

```tsx
'use client'

import { type ReactNode, use, useLayoutEffect, useRef } from 'react'

import { CaretLeftIcon } from '@phosphor-icons/react'

import { cn } from '@oztix/roadie-core/utils'

import { IconButton } from '../Button/IconButton'
import { PaneContext } from './PaneContext'
import { paneHeaderTopRowVariants, paneHeaderVariants } from './variants'

export type PaneHeaderProps = {
  /** Back target, as a routed link. Wins over `onBack`. */
  backHref?: string
  /** Back target, as a `<button>`. */
  onBack?: () => void
  children?: ReactNode
  className?: string
}

const backIcon = <CaretLeftIcon weight='bold' className='size-5' />

/**
 * Sticky chrome at the top of a pane. Renders in place — the orchestrator
 * repositions it as a unit with CSS rather than relocating its contents, so
 * there is never any ambiguity about which pane a slot belongs to.
 */
export function PaneHeader({
  backHref,
  onBack,
  children,
  className
}: PaneHeaderProps) {
  const pane = use(PaneContext)
  const headerRef = useRef<HTMLElement>(null)

  // Published on the pane rather than the header so sticky content anywhere
  // inside the pane can offset against it. Measured, not constant: the header
  // grows and shrinks with its title, actions and filter rows independently.
  useLayoutEffect(() => {
    const header = headerRef.current
    const paneEl = pane?.paneRef.current
    if (!header || !paneEl) return

    const publish = () =>
      paneEl.style.setProperty(
        '--pane-header-height',
        `${header.offsetHeight}px`
      )

    publish()

    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(publish)
    observer.observe(header)
    return () => {
      observer.disconnect()
      paneEl.style.removeProperty('--pane-header-height')
    }
  }, [pane])

  // A `list` pane is the root of the stack — there is nothing to go back to.
  const hasTarget = backHref !== undefined || onBack !== undefined
  const showBack = hasTarget && pane?.role !== 'list'

  return (
    <header
      ref={headerRef}
      data-slot='pane-header'
      className={cn(paneHeaderVariants(), className)}
    >
      {showBack ? (
        <div className={paneHeaderTopRowVariants()}>
          {backHref !== undefined ? (
            <IconButton href={backHref} aria-label='Back' emphasis='normal'>
              {backIcon}
            </IconButton>
          ) : (
            <IconButton onClick={onBack} aria-label='Back' emphasis='normal'>
              {backIcon}
            </IconButton>
          )}
        </div>
      ) : null}
      {children}
    </header>
  )
}

PaneHeader.displayName = 'Pane.Header'
```

- [ ] **Step 6: Wire the property assignment in `index.tsx`**

```tsx
import { PaneActions } from './PaneActions'
import { PaneHeader } from './PaneHeader'
import { PaneRoot } from './PaneRoot'
import { PaneTitle } from './PaneTitle'

const Pane = PaneRoot as typeof PaneRoot & {
  Root: typeof PaneRoot
  Header: typeof PaneHeader
  Title: typeof PaneTitle
  Actions: typeof PaneActions
}

Pane.Root = PaneRoot
Pane.Header = PaneHeader
Pane.Title = PaneTitle
Pane.Actions = PaneActions
```

- [ ] **Step 7: Run tests**

Run: `pnpm --filter @oztix/roadie-components test -- Pane.test.tsx && pnpm typecheck`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add packages/components/src/components/Pane
git commit -m "feat(pane): add in-place header chrome that publishes its height"
```

---

### Task 6: `Pane.Search` and `Pane.Footer`

`Pane.Search` is a styled input with **no filter machinery** — the consumer owns filtering.

**Files:**
- Create: `packages/components/src/components/Pane/PaneSearch.tsx`
- Create: `packages/components/src/components/Pane/PaneFooter.tsx`
- Modify: `packages/components/src/components/Pane/variants.ts`
- Modify: `packages/components/src/components/Pane/index.tsx`
- Test: `packages/components/src/components/Pane/Pane.test.tsx`

**Interfaces:**
- Produces: `PaneSearchProps = Omit<ComponentProps<'input'>, 'onChange' | 'value'> & { value: string; onValueChange: (next: string) => void }`; `PaneFooterProps = ComponentProps<'div'>`.

- [ ] **Step 1: Write the failing tests**

```tsx
describe('Pane.Search', () => {
  it('is a controlled searchbox reporting its value', async () => {
    const onValueChange = vi.fn()
    render(
      <Pane>
        <Pane.Header>
          <Pane.Search
            value=''
            onValueChange={onValueChange}
            placeholder='Filter components'
          />
        </Pane.Header>
      </Pane>
    )
    const input = screen.getByRole('searchbox', { name: 'Filter components' })
    await userEvent.type(input, 'b')
    expect(onValueChange).toHaveBeenCalledWith('b')
  })
})

describe('Pane.Footer', () => {
  it('renders sticky bottom chrome', () => {
    render(
      <Pane>
        <Pane.Footer>
          <button type='button'>Save</button>
        </Pane.Footer>
      </Pane>
    )
    expect(document.querySelector('[data-slot="pane-footer"]')).toBeTruthy()
  })
})
```

Add `import userEvent from '@testing-library/user-event'` and `vi` to the
test file's imports.

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @oztix/roadie-components test -- Pane.test.tsx`
Expected: FAIL — `Pane.Search` is not a function.

- [ ] **Step 3: Add variants**

```ts
export const paneSearchVariants = cva([
  'is-interactive-field h-9 w-full rounded-lg px-3',
  'text-sm placeholder:text-subtler'
])

export const paneFooterVariants = cva([
  'sticky bottom-0 z-sticky bg-inherit px-4 pt-2 pb-4'
])
```

- [ ] **Step 4: Implement both**

```tsx
import type { ComponentProps } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { paneSearchVariants } from './variants'

export type PaneSearchProps = Omit<
  ComponentProps<'input'>,
  'onChange' | 'value' | 'type'
> & {
  value: string
  onValueChange: (next: string) => void
}

/**
 * Search field styled for a pane header.
 *
 * Deliberately carries no filtering behaviour: filtering a pane's list is a
 * plain `.filter()` on the consumer's own data. The predicate registry this
 * replaces existed only because filtered-out rows had to stay declared to keep
 * navigation state alive — a constraint that no longer exists.
 */
export function PaneSearch({
  className,
  value,
  onValueChange,
  placeholder,
  ...props
}: PaneSearchProps) {
  return (
    <input
      type='search'
      data-slot='pane-search'
      aria-label={placeholder}
      placeholder={placeholder}
      value={value}
      onChange={(event) => onValueChange(event.target.value)}
      className={cn(paneSearchVariants(), className)}
      {...props}
    />
  )
}

PaneSearch.displayName = 'Pane.Search'
```

```tsx
import type { ComponentProps } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { paneFooterVariants } from './variants'

export type PaneFooterProps = ComponentProps<'div'>

/** Sticky chrome at the foot of a pane. */
export function PaneFooter({ className, ...props }: PaneFooterProps) {
  return (
    <div
      data-slot='pane-footer'
      className={cn(paneFooterVariants(), className)}
      {...props}
    />
  )
}

PaneFooter.displayName = 'Pane.Footer'
```

- [ ] **Step 5: Extend `index.tsx`** with `Search` and `Footer` property assignments and type re-exports, following the pattern already established in Task 5.

- [ ] **Step 6: Run tests**

Run: `pnpm --filter @oztix/roadie-components test -- Pane.test.tsx && pnpm typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/components/src/components/Pane
git commit -m "feat(pane): add a search field and footer, with filtering left to consumers"
```

---

### Task 7: Pure depth derivation

The stack pointer is a pure function of the declared panes, so it is testable with no DOM at all.

**Files:**
- Create: `packages/components/src/components/Navigator/paneStack.ts`
- Test: `packages/components/src/components/Navigator/paneStack.test.ts`

**Interfaces:**
- Produces:
  - `export type PaneEntry = { role: PaneRole; current: boolean; presentation: PanePresentation }`
  - `export function deriveTopIndex(entries: readonly PaneEntry[]): number`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from 'vitest'

import { type PaneEntry, deriveTopIndex } from './paneStack'

const entry = (over: Partial<PaneEntry> = {}): PaneEntry => ({
  role: 'detail',
  current: false,
  presentation: 'column',
  ...over
})

describe('deriveTopIndex', () => {
  it('puts the list on top when nothing deeper is current', () => {
    expect(
      deriveTopIndex([
        entry({ role: 'list' }),
        entry({ role: 'detail' })
      ])
    ).toBe(0)
  })

  it('puts the deepest current pane on top', () => {
    expect(
      deriveTopIndex([
        entry({ role: 'list' }),
        entry({ role: 'detail', current: true })
      ])
    ).toBe(1)
  })

  it('ignores an inspector — it overlays rather than joining the stack', () => {
    expect(
      deriveTopIndex([
        entry({ role: 'list' }),
        entry({ role: 'detail', current: true }),
        entry({ role: 'inspector', current: true })
      ])
    ).toBe(1)
  })

  it('takes the deepest of several current panes', () => {
    expect(
      deriveTopIndex([
        entry({ role: 'list', current: true }),
        entry({ role: 'detail', current: true })
      ])
    ).toBe(1)
  })

  it('returns 0 for an empty stack rather than -1', () => {
    expect(deriveTopIndex([])).toBe(0)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @oztix/roadie-components test -- paneStack`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
import type { PanePresentation, PaneRole } from '../Pane/variants'

export type PaneEntry = {
  role: PaneRole
  current: boolean
  presentation: PanePresentation
}

/**
 * Which declared pane is the top of the stack.
 *
 * The declared pane order **is** the stack; what varies is how deep you are in
 * it. The deepest `current` pane wins, and an `inspector` never participates —
 * it yields out of the flow to an overlay rather than into the stack.
 *
 * Deliberately band-independent. Whether depth matters at all is a CSS
 * question (stack styling applies only below `lg`), which is what keeps this
 * from becoming a rule expressed in two languages that must be kept in sync —
 * the failure mode of the `isTopPane` + `:has()` pair this replaces.
 */
export function deriveTopIndex(entries: readonly PaneEntry[]): number {
  let top = 0
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index]
    if (!entry || entry.role === 'inspector') continue
    if (entry.current) top = index
  }
  return top
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @oztix/roadie-components test -- paneStack`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/components/src/components/Navigator/paneStack.ts packages/components/src/components/Navigator/paneStack.test.ts
git commit -m "feat(navigator): derive the pane stack's top from declared current flags"
```

---

### Task 8: `Navigator.Content` orchestrates the arrangement

Content stops being a passive wrapper and becomes the orchestrator: it marks the top pane so CSS can stack the rest, and animates within a band.

**Files:**
- Modify: `packages/components/src/components/Navigator/NavigatorContent.tsx`
- Modify: `packages/components/src/components/Navigator/variants.ts`
- Test: `packages/components/src/components/Navigator/Navigator.test.tsx`

**Interfaces:**
- Consumes: `deriveTopIndex` (Task 7), `animatePaneTransform` (Task 3), `Pane` (Tasks 4–6).
- Produces: `data-top="true|false"` on each pane child; `data-slot="navigator-content"` gains no new props.

- [ ] **Step 1: Write the failing tests**

Add to `Navigator.test.tsx` — remember `async` + `flushViewportMeasurement()`:

```tsx
describe('pane stack', () => {
  const panes = () =>
    Array.from(document.querySelectorAll('[data-slot="pane"]'))

  it('marks the list as top when no deeper pane is current', async () => {
    render(
      <Navigator value='/components'>
        <Navigator.Content>
          <Pane role='list'>List</Pane>
          <Pane role='detail'>Detail</Pane>
        </Navigator.Content>
      </Navigator>
    )
    await flushViewportMeasurement()
    expect(panes()[0]).toHaveAttribute('data-top', 'true')
    expect(panes()[1]).toHaveAttribute('data-top', 'false')
  })

  it('moves the top to the detail pane when it becomes current', async () => {
    render(
      <Navigator value='/components/button'>
        <Navigator.Content>
          <Pane role='list'>List</Pane>
          <Pane role='detail' current>
            Detail
          </Pane>
        </Navigator.Content>
      </Navigator>
    )
    await flushViewportMeasurement()
    expect(panes()[0]).toHaveAttribute('data-top', 'false')
    expect(panes()[1]).toHaveAttribute('data-top', 'true')
  })

  it('leaves an inspector out of the stack entirely', async () => {
    render(
      <Navigator value='/components/button'>
        <Navigator.Content>
          <Pane role='list'>List</Pane>
          <Pane role='detail' current>
            Detail
          </Pane>
          <Pane role='inspector'>On this page</Pane>
        </Navigator.Content>
      </Navigator>
    )
    await flushViewportMeasurement()
    expect(panes()[1]).toHaveAttribute('data-top', 'true')
    expect(panes()[2]).not.toHaveAttribute('data-top')
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @oztix/roadie-components test -- Navigator.test.tsx -t "pane stack"`
Expected: FAIL — no `data-top` attribute.

- [ ] **Step 3: Rewrite the content arrangement variants**

Replace `navigatorContentVariants` in `Navigator/variants.ts`:

```ts
// Below `lg` the panes stack: each fills Content and only the top one is
// visible. `relative` makes Content the positioning context so panes resolve
// against it, not the viewport. From `lg` they lay out side by side and every
// stacking rule is inert.
//
// Flex, not an equal-fr grid: a capped `list` pane takes only its own width
// and `detail` fills the remainder. An fr grid would split the row evenly and
// strand the list's spare column while half-starving detail.
export const navigatorContentVariants = cva([
  'row-start-1 md:col-start-2',
  // Padding is desktop-only: stacked panes are `absolute inset-0`, which
  // resolves against Content's padding box, so padding here would leave a
  // sunken gap around an otherwise full-bleed pane.
  'grid min-h-0 min-w-0 gap-3 lg:p-3',
  'md:group-has-[[data-slot=navigator-rail]]/navigator:pl-0',
  'grid-cols-1 lg:flex lg:flex-row',
  'max-lg:relative',
  // `!` forces `position: absolute` past the inline `position: relative` Base
  // UI's ScrollArea Root sets on every pane — a class alone loses to an inline
  // style regardless of source order.
  'max-lg:[&>[data-slot=pane]]:absolute! max-lg:[&>[data-slot=pane]]:inset-0',
  // An inspector never joins the stack; it overlays on demand instead.
  'max-lg:[&>[data-role=inspector]]:hidden',
  // Stacked underneath = not the top pane. One attribute, written from one
  // place — replacing the `:has(~*)` participation selector and its `isTopPane`
  // JS twin, which had to be kept in sync by hand.
  'max-lg:[&>[data-top=false]]:-translate-x-[22%]',
  'max-lg:[&>[data-top=false]]:opacity-60',
  // Stops taps reaching the covered pane. Reduces but does not close the
  // AT-reachability gap — full `inert` is deferred.
  'max-lg:[&>[data-top=false]]:pointer-events-none',
  // A covered pane is not visible, so let the browser skip its layout and
  // paint entirely. Free here because `data-top` already exists, and the
  // largest single mobile win in the arrangement — a phone otherwise lays out
  // and paints a full second pane it cannot show.
  'max-lg:[&>[data-top=false]]:[content-visibility:auto]',
  'motion-reduce:[&>[data-slot=pane]]:transition-none'
])
```

- [ ] **Step 4: Implement the orchestrator**

```tsx
'use client'

import {
  Children,
  type ComponentProps,
  type ReactElement,
  cloneElement,
  isValidElement,
  useMemo
} from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { PaneRoot } from '../Pane/PaneRoot'
import type { PaneRootProps } from '../Pane/PaneRoot'
import { type PaneEntry, deriveTopIndex } from './paneStack'
import { navigatorContentVariants } from './variants'

export type NavigatorContentProps = ComponentProps<'div'>

/**
 * Arranges panes — Roadie's master–detail orchestrator.
 *
 * Owns exactly one derived value: which pane is the top of the stack. Whether
 * that matters is a CSS question, so there is no `matchMedia` here and no
 * breakpoint logic duplicated between JS and stylesheet.
 *
 * Author panes in a client component: the walk below matches `Pane` by element
 * identity, and Flight replaces every server-authored element's type with a
 * `React.lazy` wrapper. See COMPOUND_PATTERNS.md §1.2.
 */
export function NavigatorContent({
  className,
  children,
  ...props
}: NavigatorContentProps) {
  const entries = useMemo(() => {
    const found: PaneEntry[] = []
    Children.forEach(children, (child) => {
      if (!isValidElement<PaneRootProps>(child) || child.type !== PaneRoot) {
        return
      }
      found.push({
        role: child.props.role ?? 'list',
        current: child.props.current ?? false,
        presentation: child.props.presentation ?? 'column'
      })
    })
    return found
  }, [children])

  const topIndex = deriveTopIndex(entries)

  let paneIndex = -1
  const arranged = Children.map(children, (child) => {
    if (!isValidElement<PaneRootProps>(child) || child.type !== PaneRoot) {
      return child
    }
    paneIndex += 1
    const entry = entries[paneIndex]
    // An inspector overlays rather than stacking, so it carries no stack
    // position at all — absence is meaningful here, not a missing value.
    if (entry?.role === 'inspector') return child
    return cloneElement(child as ReactElement<Record<string, unknown>>, {
      'data-top': String(paneIndex === topIndex)
    })
  })

  return (
    <div
      data-slot='navigator-content'
      className={cn(navigatorContentVariants(), className)}
      {...props}
    >
      {arranged}
    </div>
  )
}

NavigatorContent.displayName = 'Navigator.Content'
```

- [ ] **Step 5: Run tests**

Run: `pnpm --filter @oztix/roadie-components test -- Navigator.test.tsx -t "pane stack" && pnpm typecheck`
Expected: PASS.

- [ ] **Step 6: Confirm the act-warning budget has not grown**

Run: `pnpm --filter @oztix/roadie-components test -- Navigator.test.tsx 2>&1 | grep -c "not wrapped in act"`
Expected: `17` or fewer. If higher, the new tests are missing
`await flushViewportMeasurement()`.

- [ ] **Step 7: Commit**

```bash
git add packages/components/src/components/Navigator
git commit -m "feat(navigator): orchestrate the pane stack from an explicit top marker"
```

---

### Task 9: `primaryNav` replaces `collapseNav`

One prop, three mutually exclusive states. A hidden bar has nothing to collapse, so two booleans would permit a contradiction with no meaning.

**Files:**
- Modify: `packages/components/src/components/Pane/PaneRoot.tsx`
- Modify: `packages/components/src/components/Pane/variants.ts`
- Modify: `packages/components/src/components/Navigator/NavigatorContext.ts`
- Test: `packages/components/src/components/Navigator/Navigator.test.tsx`

**Interfaces:**
- Consumes: `PanePrimaryNav` (Task 4).
- Produces: `PaneRootProps.primaryNav?: PanePrimaryNav`; pane emits `data-primary-nav`.

- [ ] **Step 1: Write the failing tests**

```tsx
describe('primaryNav', () => {
  it('defaults to auto', async () => {
    render(
      <Navigator value='/'>
        <Navigator.Content>
          <Pane role='detail' current>
            Detail
          </Pane>
        </Navigator.Content>
      </Navigator>
    )
    await flushViewportMeasurement()
    expect(document.querySelector('[data-slot="pane"]')).toHaveAttribute(
      'data-primary-nav',
      'auto'
    )
  })

  it('hides the tab bar while a hidden pane is on top', async () => {
    render(
      <Navigator value='/'>
        <Navigator.Primary aria-label='Main'>
          <Navigator.Item value='/' icon={<FakeIcon />}>
            Home
          </Navigator.Item>
        </Navigator.Primary>
        <Navigator.Content>
          <Pane role='list'>List</Pane>
          <Pane role='detail' current primaryNav='hidden'>
            Detail
          </Pane>
        </Navigator.Content>
      </Navigator>
    )
    await flushViewportMeasurement()
    expect(
      document.querySelector('[data-slot="navigator-tab-bar"]')
    ).toHaveAttribute('data-hidden', 'true')
  })

  it('leaves the bar alone when the hidden pane is not on top', async () => {
    render(
      <Navigator value='/'>
        <Navigator.Primary aria-label='Main'>
          <Navigator.Item value='/' icon={<FakeIcon />}>
            Home
          </Navigator.Item>
        </Navigator.Primary>
        <Navigator.Content>
          <Pane role='list'>List</Pane>
          <Pane role='detail' primaryNav='hidden'>
            Detail
          </Pane>
        </Navigator.Content>
      </Navigator>
    )
    await flushViewportMeasurement()
    expect(
      document.querySelector('[data-slot="navigator-tab-bar"]')
    ).toHaveAttribute('data-hidden', 'false')
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @oztix/roadie-components test -- Navigator.test.tsx -t primaryNav`
Expected: FAIL — no `data-primary-nav`, no `data-hidden`.

- [ ] **Step 3: Add the prop to `PaneRoot`**

```tsx
  /**
   * What the mobile primary nav does while this pane is the **top of the
   * stack** below `md`. A declaration on a pane sitting underneath does
   * nothing.
   *
   * - `auto` — collapses to the active tab as the pane scrolls, and returns
   *   at the top. A pane whose content does not overflow never scrolls, so
   *   nothing collapses.
   * - `visible` — the bar stays full at every scroll position.
   * - `hidden` — no bar at all; it returns when the stack pops back. This is
   *   iOS's `hidesBottomBarWhenPushed`, declared by the pushed screen.
   *
   * @default 'auto'
   */
  primaryNav?: PanePrimaryNav
```

Destructure `primaryNav = 'auto'` and emit `data-primary-nav={primaryNav}` on
the ScrollArea root beside `data-role`.

- [ ] **Step 4: Make the viewport padding conditional**

In `Pane/variants.ts`, `paneViewportVariants` gains a variant. Panes run full
height under the floating bar, so the last rows need padding to clear it — but
with the bar hidden that padding is dead space at the foot of the pane:

```ts
export const paneViewportVariants = cva(['size-full overscroll-contain'], {
  variants: {
    // Clears the floating tab bar. Dropped when this pane hides the bar,
    // otherwise it leaves an empty strip at the foot of the pane.
    clearsPrimaryNav: { true: 'max-md:pb-24', false: '' }
  },
  defaultVariants: { clearsPrimaryNav: true }
})
```

Pass `clearsPrimaryNav: primaryNav !== 'hidden'` from `PaneRoot`.

- [ ] **Step 5: Resolve it in `Navigator.Content` and publish it**

Extend `PaneEntry` with `primaryNav: PanePrimaryNav`, read it in the walk, and
compute the top pane's value:

```ts
const topPrimaryNav = entries[topIndex]?.primaryNav ?? 'auto'
```

Add `primaryNav` + `setPrimaryNav` to `NavigatorContext`, set it from Content in
an effect, and have `NavigatorPrimary` render the tab bar with
`data-hidden={String(primaryNav === 'hidden')}` plus a `hidden` class variant on
`navigatorTabBarVariants`.

- [ ] **Step 5a: Coalesce the scroll handler with `requestAnimationFrame`**

`'auto'` reads `scrollTop` on every scroll event and may `setState`. Left
uncoalesced that is a React render per scroll frame — the first thing a phone
shows as jank. One rAF in flight at a time, and bail before `setState` when
the value has not changed:

```tsx
const frame = useRef<number | null>(null)

const handleScroll = () => {
  if (frame.current !== null) return
  frame.current = requestAnimationFrame(() => {
    frame.current = null
    const viewport = viewportRef.current
    if (!viewport) return
    const next = primaryNav === 'auto' && viewport.scrollTop > NAV_COLLAPSE_THRESHOLD
    // Compared against live context state, not a private ref, so the sync
    // stays correct across sibling panes while still skipping redundant
    // renders.
    if (next !== navCollapsed) setNavCollapsed(next)
  })
}

useEffect(
  () => () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current)
  },
  []
)
```

Add a test asserting a burst of scroll events produces at most one state
change per frame:

```tsx
it('coalesces a burst of scroll events into one update', async () => {
  const raf = vi.spyOn(window, 'requestAnimationFrame')
  // …render a Pane with primaryNav='auto', then:
  const viewport = document.querySelector('[data-slot="pane-viewport"]')!
  fireEvent.scroll(viewport)
  fireEvent.scroll(viewport)
  fireEvent.scroll(viewport)
  expect(raf).toHaveBeenCalledTimes(1)
})
```

- [ ] **Step 6: Remove `collapseNav`**

Delete the prop, its docblock and its `NAV_COLLAPSE_THRESHOLD` gating from the
old pane implementation. `'auto'` is now the default behaviour and needs no
opt-in — which retires the old instruction *"Leave off for short panes"*, since
a non-overflowing pane never scrolls and so never collapses.

- [ ] **Step 7: Run tests**

Run: `pnpm --filter @oztix/roadie-components test && pnpm typecheck`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add packages/components/src
git commit -m "feat(pane): let the app decide mobile nav visibility with primaryNav"
```

---

### Task 10: Section nav tabs in the top pane's header

**Without this, deleting `NavigatorPaneHeader` in Task 12 removes the docs
site's mobile section nav.** `Navigator.Primary` lifts the active section's
`Navigator.Secondary` into context and the pane header renders it below `md`.
That must survive — and it gets better: with explicit depth, the orchestrator
targets the *current* pane's header rather than whichever header happens to be
mounted, so the duplicate-landmark hazard disappears instead of being warned
about.

**Files:**
- Create: `packages/components/src/components/Pane/PaneChromeContext.ts`
- Modify: `packages/components/src/components/Pane/PaneHeader.tsx`
- Create: `packages/components/src/components/Navigator/NavigatorPaneChrome.tsx`
- Modify: `packages/components/src/components/Navigator/NavigatorContent.tsx`
- Test: `packages/components/src/components/Navigator/Navigator.test.tsx`

**Interfaces:**
- Consumes: `PaneContext` (Task 4), `NavigatorContext.secondaryNav`, `deriveTopIndex` (Task 7).
- Produces: `PaneChromeContext` carrying `{ headerExtras: ReactNode }`, defaulting to `null`.

**Dependency direction:** `Navigator` imports from `Pane`, never the reverse.
`Pane` owns an empty chrome context; `Navigator` fills it. That is what keeps
`Pane` standalone and avoids a module cycle.

- [ ] **Step 1: Write the failing tests**

```tsx
describe('section nav in the pane header', () => {
  it('renders the active section nav in the top pane header', async () => {
    render(
      <Navigator value='/foundations/colors'>
        <Navigator.Primary aria-label='Docs'>
          <Navigator.Item value='/foundations' icon={<FakeIcon />}>
            Foundations
            <Navigator.Secondary aria-label='Foundations pages'>
              <Navigator.Item value='/foundations/colors'>Colors</Navigator.Item>
            </Navigator.Secondary>
          </Navigator.Item>
        </Navigator.Primary>
        <Navigator.Content>
          <Pane role='list'>List</Pane>
          <Pane role='detail' current>
            <Pane.Header />
            Detail
          </Pane>
        </Navigator.Content>
      </Navigator>
    )
    await flushViewportMeasurement()
    const top = document.querySelectorAll('[data-slot="pane"]')[1]
    expect(
      top?.querySelector('[data-slot="navigator-secondary-strip"]')
    ).toBeTruthy()
  })

  it('does not duplicate the strip into a non-top pane header', async () => {
    render(
      <Navigator value='/foundations/colors'>
        <Navigator.Primary aria-label='Docs'>
          <Navigator.Item value='/foundations' icon={<FakeIcon />}>
            Foundations
            <Navigator.Secondary aria-label='Foundations pages'>
              <Navigator.Item value='/foundations/colors'>Colors</Navigator.Item>
            </Navigator.Secondary>
          </Navigator.Item>
        </Navigator.Primary>
        <Navigator.Content>
          <Pane role='list'>
            <Pane.Header />
            List
          </Pane>
          <Pane role='detail' current>
            <Pane.Header />
            Detail
          </Pane>
        </Navigator.Content>
      </Navigator>
    )
    await flushViewportMeasurement()
    expect(
      document.querySelectorAll('[data-slot="navigator-secondary-strip"]')
    ).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @oztix/roadie-components test -- Navigator.test.tsx -t "section nav"`
Expected: FAIL — no strip rendered.

- [ ] **Step 3: Write `PaneChromeContext.ts`**

```ts
'use client'

import { type ReactNode, createContext } from 'react'

// Chrome an orchestrator contributes to a pane's header — the active section's
// nav strip, a toggle for a sibling pane that yielded.
//
// `Pane` defines it and renders whatever it holds; it never fills it. That
// one-way dependency is what lets `Pane` work with no `Navigator` present, and
// it keeps `Navigator -> Pane` a single direction with no module cycle.
export type PaneChromeContextValue = { headerExtras: ReactNode }

export const PaneChromeContext = createContext<PaneChromeContextValue>({
  headerExtras: null
})
```

- [ ] **Step 4: Render the extras in `PaneHeader`**

Add `const { headerExtras } = use(PaneChromeContext)` and render it after
`{children}`. Then relax the early return: the header must still draw when it
has no children of its own but does have extras.

```tsx
  const hasOwnChrome = showBack || children != null
  if (!hasOwnChrome && headerExtras === null) return null
```

```tsx
      {children}
      {headerExtras}
```

- [ ] **Step 5: Write `NavigatorPaneChrome.tsx`**

Move the strip markup verbatim out of the old `NavigatorPaneHeader` — the
`ScrollArea` with the function `render` prop, `NavigatorIndicator`,
`NavigatorPresentationContext value='strip'`, and the horizontal flush
scrollbar. It keeps `flex md:hidden`, so the rail owns the nav from `md` up and
this is the below-`md` rendering only.

```tsx
'use client'

import { use, useRef } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { ScrollArea } from '../ScrollArea'
import { NavigatorContext } from './NavigatorContext'
import { NavigatorIndicator } from './NavigatorIndicator'
import { NavigatorPresentationContext } from './NavigatorPresentationContext'
import {
  navigatorSecondaryStripVariants,
  navigatorSecondaryStripViewportVariants
} from './variants'

/** The active section's nav, rendered inside the top pane's header below `md`. */
export function NavigatorPaneChrome() {
  const { secondaryNav } = use(NavigatorContext)
  // Points at the strip's Viewport, not its `<nav>` root — the indicator
  // measures against the scrolling box.
  const stripRef = useRef<HTMLDivElement>(null)

  if (secondaryNav === null) return null

  return (
    <ScrollArea
      render={(renderProps) => <nav {...renderProps} role={undefined} />}
      data-slot='navigator-secondary-strip'
      aria-label={`${secondaryNav['aria-label']} tabs`}
      className={cn(secondaryNav.className, navigatorSecondaryStripVariants())}
    >
      <ScrollArea.Viewport
        ref={stripRef}
        data-slot='navigator-secondary-strip-viewport'
        className={navigatorSecondaryStripViewportVariants()}
      >
        <NavigatorIndicator trackRef={stripRef} surface='strip' />
        <ScrollArea.Content>
          <NavigatorPresentationContext value='strip'>
            {secondaryNav.children}
          </NavigatorPresentationContext>
        </ScrollArea.Content>
      </ScrollArea.Viewport>
      <ScrollArea.Scrollbar orientation='horizontal' flush>
        <ScrollArea.Thumb />
      </ScrollArea.Scrollbar>
    </ScrollArea>
  )
}
```

- [ ] **Step 6: Provide it around the top pane only, in `NavigatorContent`**

```tsx
const chrome = useMemo(
  () => ({ headerExtras: <NavigatorPaneChrome /> }),
  []
)
```

In the `Children.map`, wrap only the top pane:

```tsx
    const positioned = cloneElement(
      child as ReactElement<Record<string, unknown>>,
      { 'data-top': String(paneIndex === topIndex) }
    )
    // Only the top pane receives orchestrator chrome. Two mounted headers can
    // no longer render duplicate section-nav landmarks, so the docblock
    // warning this replaces is not merely restated — it stops being possible.
    return paneIndex === topIndex ? (
      <PaneChromeContext key={child.key} value={chrome}>
        {positioned}
      </PaneChromeContext>
    ) : (
      positioned
    )
```

- [ ] **Step 7: Run tests**

Run: `pnpm --filter @oztix/roadie-components test -- Navigator.test.tsx && pnpm typecheck`
Expected: PASS, act warnings still ≤ 17.

- [ ] **Step 8: Commit**

```bash
git add packages/components/src
git commit -m "feat(pane): render the active section nav in the top pane's header"
```

---

### Task 11: A yielded inspector re-presents on demand

Yielding is not disappearing. Below `2xl` the inspector leaves the column flow and becomes reachable from a header toggle — a `drawer` from `md` up, a `sheet` below.

**Files:**
- Modify: `packages/components/src/components/Pane/variants.ts`
- Modify: `packages/components/src/components/Navigator/NavigatorContent.tsx`
- Modify: `packages/components/src/components/Navigator/NavigatorPaneChrome.tsx`
- Test: `packages/components/src/components/Navigator/Navigator.test.tsx`

**Interfaces:**
- Consumes: `PaneChromeContext` (Task 10), `PaneEntry` (Task 7).
- Produces: inspector panes emit `data-open`; the toggle is `[data-slot="pane-inspector-toggle"]`.

- [ ] **Step 1: Write the failing tests**

```tsx
describe('yielded inspector', () => {
  const renderWithInspector = () =>
    render(
      <Navigator value='/components/button'>
        <Navigator.Content>
          <Pane role='list'>List</Pane>
          <Pane role='detail' current>
            <Pane.Header />
            Detail
          </Pane>
          <Pane role='inspector' aria-label='On this page'>
            Contents
          </Pane>
        </Navigator.Content>
      </Navigator>
    )

  it('offers a toggle in the top pane header when an inspector is declared', async () => {
    renderWithInspector()
    await flushViewportMeasurement()
    expect(
      screen.getByRole('button', { name: 'On this page' })
    ).toBeInTheDocument()
  })

  it('starts closed and opens on activation', async () => {
    renderWithInspector()
    await flushViewportMeasurement()
    const inspector = document.querySelector('[data-role="inspector"]')
    expect(inspector).toHaveAttribute('data-open', 'false')

    await userEvent.click(screen.getByRole('button', { name: 'On this page' }))
    await flushViewportMeasurement()
    expect(inspector).toHaveAttribute('data-open', 'true')
  })

  it('offers no toggle when no inspector is declared', async () => {
    render(
      <Navigator value='/components/button'>
        <Navigator.Content>
          <Pane role='detail' current>
            <Pane.Header />
            Detail
          </Pane>
        </Navigator.Content>
      </Navigator>
    )
    await flushViewportMeasurement()
    expect(screen.queryByRole('button', { name: 'On this page' })).toBeNull()
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @oztix/roadie-components test -- Navigator.test.tsx -t "yielded inspector"`
Expected: FAIL — no toggle.

- [ ] **Step 3: Add the overlay presentation to the inspector**

Replace the blunt `max-2xl:hidden` on the `inspector` role in
`Pane/variants.ts` — hiding was never the intent:

```ts
        // Below 2xl the inspector leaves the column flow and becomes an
        // on-demand overlay: a drawer from `md`, a sheet below it. It is never
        // simply removed — a yielded pane stays reachable.
        inspector: [
          '2xl:w-56 2xl:shrink-0 2xl:static 2xl:translate-none',
          'max-2xl:absolute! max-2xl:z-sticky max-2xl:shadow-xl',
          'max-2xl:inset-y-0 max-2xl:right-0 max-2xl:w-80',
          'max-md:inset-x-0 max-md:top-auto max-md:bottom-0 max-md:h-[70dvh] max-md:w-auto',
          'max-2xl:data-[open=false]:pointer-events-none',
          'max-2xl:data-[open=false]:invisible',
          'max-2xl:data-[open=false]:translate-x-full',
          'max-md:data-[open=false]:translate-x-0 max-md:data-[open=false]:translate-y-full',
          'motion-safe:max-2xl:transition-[transform,visibility]'
        ].join(' ')
```

Remove `max-lg:[&>[data-role=inspector]]:hidden` from
`navigatorContentVariants` — Task 8 added it as a placeholder and it now
contradicts this.

- [ ] **Step 4: Own the open state in `NavigatorContent`**

```tsx
const [inspectorOpen, setInspectorOpen] = useState(false)
const hasInspector = entries.some((entry) => entry.role === 'inspector')

// Closes when the route changes: an inspector describes the detail it sits
// beside, so it should not survive into a different one.
useEffect(() => setInspectorOpen(false), [value])
```

Read `value` from `NavigatorContext`. Clone inspector panes with
`'data-open': String(inspectorOpen)` instead of `data-top`, and extend the
chrome memo:

```tsx
const chrome = useMemo(
  () => ({
    headerExtras: (
      <>
        <NavigatorPaneChrome />
        {hasInspector ? (
          <InspectorToggle
            open={inspectorOpen}
            onToggle={() => setInspectorOpen((open) => !open)}
          />
        ) : null}
      </>
    )
  }),
  [hasInspector, inspectorOpen]
)
```

- [ ] **Step 5: Add the toggle to `NavigatorPaneChrome.tsx`**

The label comes from the inspector pane's own `aria-label` so the control names
what it opens, rather than Roadie inventing copy:

```tsx
export function InspectorToggle({
  open,
  onToggle,
  label
}: {
  open: boolean
  onToggle: () => void
  label: string
}) {
  return (
    <Button
      type='button'
      data-slot='pane-inspector-toggle'
      emphasis='subtle'
      size='sm'
      aria-expanded={open}
      onClick={onToggle}
      // From 2xl the inspector is a column of its own — nothing to reveal.
      className='2xl:hidden'
    >
      <ListIcon weight='bold' className='size-4' />
      <span>{label}</span>
    </Button>
  )
}
```

Read the label in `NavigatorContent` from the inspector entry — extend
`PaneEntry` with `label: string | undefined` populated from the child's
`'aria-label'` prop, and fall back to `'Contents'` when absent.

- [ ] **Step 6: Run tests**

Run: `pnpm --filter @oztix/roadie-components test && pnpm typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/components/src
git commit -m "feat(pane): re-present a yielded inspector as a drawer or sheet"
```

---

### Task 12: Delete the superseded Navigator surface

Nothing new is built here — this is the cleanup that makes the PR honest, and it must typecheck clean.

**Files:**
- Delete: `NavigatorPane.tsx`, `NavigatorPaneHeader.tsx`, `NavigatorPaneContext.ts`, `NavigatorSecondaryPane.tsx`, `NavigatorSecondaryPaneSearch.tsx`, `NavigatorFilterContext.ts`, `collectItemMetas.ts`, `isTopPane.ts`
- Modify: `NavigatorContext.ts`, `NavigatorPrimary.tsx`, `NavigatorSecondary.tsx`, `NavigatorItem.tsx`, `Navigator/index.tsx`, `Navigator/variants.ts`, `packages/components/src/index.tsx`
- Test: `packages/components/src/components/Navigator/Navigator.test.tsx`

**Interfaces:**
- Consumes: everything from Tasks 4–9.
- Produces: `Navigator` no longer exports `Pane`, `SecondaryPane` or `Group`; `Navigator.Secondary` loses `presentation`.

- [ ] **Step 1: Delete the files**

```bash
cd packages/components/src/components/Navigator
git rm NavigatorPane.tsx NavigatorPaneHeader.tsx NavigatorPaneContext.ts \
       NavigatorSecondaryPane.tsx NavigatorSecondaryPaneSearch.tsx \
       NavigatorFilterContext.ts collectItemMetas.ts isTopPane.ts
```

`NavigatorGroup.tsx` is **kept** — it is reworked in Phase 2, not deleted.

- [ ] **Step 2: Strip the pane state from `NavigatorContext.ts`**

Remove `paneSecondary`, `setPaneSecondary`, `secondaryPaneCount`,
`registerSecondaryPane`, and the `isPaneSectionActive` helper. Keep `value`,
`setValue`, `hasNesting`, `navCollapsed`, `pinExpanded`,
`scrollActivePaneToTop`, `setActivePaneScroller`, `secondaryNav`,
`setSecondaryNav`, `headerCount`, `registerHeader`, and add `primaryNav` /
`setPrimaryNav` from Task 9.

- [ ] **Step 3: Strip the pane derivations from `NavigatorPrimary.tsx`**

Remove the `activePaneSecondary` memo, the `secondaryPaneCount` dev warning
effect, every `presentation === 'pane'` branch, and the `isPaneSectionActive`
import. Section matching returns to `isBranchActive` everywhere — the
prefix-matching special case existed only to stop a pane unmounting.

- [ ] **Step 4: Drop `presentation` from `NavigatorSecondary.tsx`**

With one rail rendering from `md` up and one header rendering below, both
derived from viewport, there is nothing left for the prop to select. Delete the
prop and its type. `NavigatorPresentationContext` keeps `'rail'` and `'strip'`
and loses `'pane'`.

- [ ] **Step 5: Update the barrels**

Remove `Pane`, `SecondaryPane` and their types from `Navigator/index.tsx`;
export `Pane` from `packages/components/src/index.tsx`; move the pane variants
out of `Navigator/variants.ts`.

- [ ] **Step 6: Delete the orphaned tests**

Remove every `Navigator.test.tsx` block covering `presentation='pane'`,
`SecondaryPane`, `SecondaryPane.Search`, the filter registry and
`isPaneSectionActive`. Their behaviour is now covered by `Pane.test.tsx` and
the pane-stack tests, or is intentionally gone.

- [ ] **Step 7: Run the full gate**

```bash
find . -name "*.tsbuildinfo" -not -path "*/node_modules/*" -delete
pnpm test && pnpm typecheck && pnpm lint
```

Expected: PASS. Deleting the `tsbuildinfo` files first gives CI's view —
TypeScript's incremental cache can otherwise hide errors in files this task
did not touch.

- [ ] **Step 8: Commit**

```bash
git add -A packages/components/src
git commit -m "refactor(navigator): drop the secondary-pane surface now Pane owns it"
```

---

### Task 13: Migrate the docs Components browser

The proof. `Pane` is not done until the reference consumer works, and this is what dissolves the stray-hairline defect rather than patching it.

**Files:**
- Modify: `docs/src/components/Navigation.tsx`
- Modify: `docs/src/components/OnThisPage.tsx` (only if it reads pane context)

**Interfaces:**
- Consumes: `Pane`, `List`, `Navigator.Content` from all prior tasks.

- [ ] **Step 1: Add local filter state**

`DocsNavigator` is already `'use client'`, which the identity walks require.
Filtering is now a plain array operation — no registry, no predicates, no
view-only `null` rendering:

```tsx
const [query, setQuery] = useState('')

const shownCategories = useMemo(() => {
  const needle = query.trim().toLowerCase()
  if (needle === '') return componentCategories
  return componentCategories
    .map((category) => ({
      ...category,
      components: category.components.filter(
        (component) =>
          component.title.toLowerCase().includes(needle) ||
          component.name.toLowerCase().includes(needle)
      )
    }))
    .filter((category) => category.components.length > 0)
}, [componentCategories, query])
```

- [ ] **Step 2: Replace the pane-presentation Secondary with a plain rail Secondary**

In the `/components` branch, drop `presentation='pane'` and the
`Navigator.Group` / thumbnail children. The section keeps a normal
`Navigator.Secondary` only if it wants sub-page nav in the rail; for the docs
site the browser lives in the pane, so remove the Secondary from that section
entirely.

- [ ] **Step 3: Replace `Navigator.SecondaryPane` with a real `Pane` + `List`**

```tsx
<Navigator.Content>
  <Pane role='list' className='lg:w-72'>
    <Pane.Header>
      <Pane.Title>Components</Pane.Title>
      <Pane.Search
        value={query}
        onValueChange={setQuery}
        placeholder='Filter components'
      />
    </Pane.Header>
    <List>
      {shownCategories.map((category) => (
        <List.Group key={category.name}>
          <List.GroupTitle>{category.name}</List.GroupTitle>
          {category.components.map((component) => {
            const href = `/components/${component.name}`
            return (
              <List.Item
                key={component.name}
                title={component.title}
                href={href}
                current={pathname === href && 'page'}
                trailing={<ComponentThumbnail name={component.name} />}
              />
            )
          })}
        </List.Group>
      ))}
    </List>
  </Pane>

  <Pane
    role='detail'
    current={pathname.startsWith('/components/')}
    className='scroll-pt-6'
  >
    <Pane.Header
      backHref={pathname.startsWith('/components/') ? '/components' : undefined}
    />
    <div
      id='docs-content'
      className='mx-auto grid w-full max-w-[56rem] gap-0 px-6 py-6 md:px-10 md:py-12 lg:px-12 [&_:is(h1,h2,h3,h4)]:scroll-mt-6'
    >
      {children}
      <FooterNav items={items} />
    </div>
  </Pane>

  {pathname !== '/' ? (
    <Pane role='inspector' emphasis='subtler'>
      <div className='px-4 py-6'>
        <OnThisPage />
      </div>
    </Pane>
  ) : null}
</Navigator.Content>
```

Note what disappeared: `hideOnMobile` twice, `max-2xl:hidden`,
`collapseNav`, and the `hideOnMobile={pathname === '/components'}` conditional.
`current` replaces all four.

- [ ] **Step 4: Rebuild components and check the docs**

```bash
pnpm --filter @oztix/roadie-components build
pnpm --filter docs dev
```

Do **not** run `pnpm --filter docs build` while the dev server is running.

- [ ] **Step 5: Verify in a real browser**

At `http://localhost:9614/components`:

1. **The stray hairline above each group heading is gone** — the defect that
   motivated the redesign. It dissolves because rows are real `List.Item`s
   emitting `list-item` / `list-item-content`, so `List`'s divider rules match.
2. Type in the filter — rows and empty categories disappear; the field keeps
   focus (the old unmount hazard is structurally impossible now).
3. At ≥1536px all three panes are columns.
4. At ~1200px the inspector is gone, list and detail are columns.
5. At ~900px the rail shows and the detail pane is full width beside it, with
   the list stacked behind — the band that did not exist before.
6. At ~390px the tab bar shows and panes push/pop. The browser tool floors at
   500px, so constrain the viewport or read computed widths.
7. Navigate to a component page, then back — no flicker, no unmount.

- [ ] **Step 6: Commit**

```bash
git add docs/src
git commit -m "refactor(docs): browse components from a real Pane and List"
```

---

### Task 14: Document `Pane`

**Files:**
- Create: `docs/src/app/components/pane/page.mdx`
- Modify: `docs/src/lib/component-manifest.ts`

- [ ] **Step 1: Add `pane` to the manifest** in the layout category, with a title of `Pane`.

- [ ] **Step 2: Write the page** following
`docs/contributing/COMPONENT_DOC_TEMPLATE.md`: one-line description (say what
it *is*), then Import → Default → Roles → Emphasis → Presentation → Composition
→ Guidelines → Accessibility → `<PropsDefinitions>`.

Cover in Guidelines:
- `role` is sizing plus yield order, not a taxonomy
- `column` is the only presentation the orchestrator resolves
- `current` matters only in the stacked bands
- filtering is the consumer's `.filter()`, and why
- author pane trees in a client component
- **`List` does not virtualise and panes scroll natively.** Fine into the
  hundreds of rows; a list in the thousands needs virtualisation, which `Pane`
  neither provides nor prevents. Documented rather than discovered.

- [ ] **Step 3: Verify the props table renders**

Load `/components/pane` and confirm `role`, `presentation`, `current`,
`emphasis` and `primaryNav` all appear with their literal unions. If any is
missing, its type is being read through a CVA conditional — inline the union on
the prop and export a sibling alias.

- [ ] **Step 4: Do not run Prettier on the MDX.** It empties the file.

- [ ] **Step 5: Commit**

```bash
git add docs/src
git commit -m "docs(pane): document the Pane component"
```

---

## Phase 1 exit criteria

- [ ] `pnpm test`, `pnpm typecheck`, `pnpm lint` all pass from a clean `tsbuildinfo` state
- [ ] `Navigator.test.tsx` React `act()` warnings ≤ 17
- [ ] Docs Components browser verified at 390 / 900 / 1200 / 1600px
- [ ] The stray hairline above group headings is gone
- [ ] `grep -r "hideOnMobile\|collapseNav\|SecondaryPane\|isTopPane\|collectItemMetas"` over `packages/` and `docs/src/` returns nothing
- [ ] Mobile section nav still works — `/foundations` at 390px shows the section strip in the top pane's header, and exactly one strip exists in the DOM
- [ ] The inspector toggle opens "On this page" as a sheet at 390px and a drawer at 1200px, and is absent at 1600px

## Phase 2 preview

A separate plan on the same branch, in this order:

1. `Navigator.Group` rework + `Navigator.GroupTitle` (sibling markup, `<h2>` + `render`, `aria-labelledby`)
2. Rail list semantics — `<nav>` gains `<ul>` / `<li>`, secondary nests inside its primary's `<li>`
3. `Navigator.Primary`'s optional `tabs` tuple
4. `Navigator.Overflow` + `Navigator.OverflowItems` as a full-screen `Pane`
5. `Navigator.Panel` — popover from `md`, `Pane` below
6. Per-section stack memory — last value per section retargets its rail item; the URL stays the only source of truth for the current section, so the Map affects link targets and never rendered arrangement
7. Migrate `~/Code/prototype`'s `PersonaSwitcher` as the panel proof

## Deferred by evidence, not omission

- **Cross-band motion.** A resize crossing `md` or `lg` changes arrangement instantly. Motion blocks layout animations during horizontal window resizing, and it is the transition SwiftUI is most criticised for precisely because it is not solvable well.
- **`animateView` / React `ViewTransition`.** Needs `react@canary`.
- **`inert` on covered panes.** `pointer-events-none` closes the pointer gap but not AT reachability. Explicit stack state makes real `inert` tractable — worth doing once the stack is proven.
- **Desktop expand / collapse / minimise.** The resolution model plus the yielded-pane affordance already deliver the behaviour that has a consumer. A user-driven pin that overrides the resolved arrangement is the natural next increment.

## Out of scope, but found while planning — `CartDrawer`

Not part of this PR. Recorded so it isn't rediscovered.

- **`CartDrawer` animates `height` in pixels through a JS spring** —
  `packages/widgets/src/cart-drawer/vue/useCartDrawerDrag.ts:90` and its React
  twin — applied as `style={{ height }}`. A layout-triggering property driven
  from the main thread every frame, on a bottom-sheet drag release. This is the
  highest-value performance item in the existing codebase and the most
  touch-sensitive interaction in the product. **Not measured, and not known to
  be a problem in practice** — but the technique is the one Motion's guide
  names first among things to avoid. The fix (translate a full-height sheet and
  clip it) has a real constraint: the drawer publishes `--cart-drawer-height`
  to the document for page content to offset against, so that value must still
  be derived. Deserves its own investigation.
- **`CartDrawer.tsx:325-327` animates `scale` and `y` individually**, which
  Motion does not hardware-accelerate — acceleration is offered only for a
  composed `transform` string, in React components as much as in the standalone
  `animate()`. Much smaller than the above: it is an enter/exit animation, not
  a per-frame drag. Fold the change in next time that file is touched rather
  than making a standalone commit.
