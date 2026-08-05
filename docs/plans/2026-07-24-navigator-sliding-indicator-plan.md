# Navigator sliding indicator — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give Navigator a single sliding active-destination indicator, shared by the mobile tab bar, the mobile secondary strip, and the desktop rail — with a mobile pill that can be **wider than its tab** so labels never feel cramped.

**Architecture:** One role-neutral hook, `useSlidingIndicator`, measures the active `[aria-current]` descendant against its track element and publishes `--active-tab-left/top/width/height` as CSS custom properties (deliberately the same var names Base UI's `Tabs.Indicator` uses, so the CSS idiom stays familiar). A `NavigatorIndicator` component consumes those vars and renders an absolutely-positioned pill that CSS can inflate beyond the measured box. Navigator keeps `<nav>` landmarks, real `<a href>`, and `aria-current` throughout — no `role=tab`, no `aria-selected`, no Base UI Tabs coupling. The mobile secondary strip additionally borrows Roadie `Tabs`' CVA class strings so it reads as a Tabs `subtle` pill row: the skin is shared, the semantics are not.

**Tech Stack:** React 19, TypeScript strict, Tailwind CSS v4 + CVA, Vitest + React Testing Library (jsdom).

## Decisions already made (do not relitigate)

These were settled during planning. Each has a recorded reason.

1. **Do not touch the Roadie `Tabs` component.** Its 40+ role-based tests and Base UI `Tabs.Indicator` stay exactly as they are. This plan adds nothing to `packages/components/src/components/Tabs/`.
2. **Do not render Base UI `Tabs` inside Navigator.** Verified against `@base-ui/react@1.3.0` source: `Tabs.Indicator` measures only tabs registered in the root's `tabMap`, and only direct `Tabs.Tab` children register. On the desktop rail the active element is frequently a **nested `Navigator.Secondary` item**, so the indicator would have nothing to measure. The rail also holds `Brand`, `End`, chevrons and sub-navs, none of which can be tabs. Since the rail must animate too, Base UI could serve at most one of three surfaces — two mechanisms for one feature.
3. **Base UI's roving-focus engine is not reachable anyway.** `composite/` exists on disk but is absent from the package's `exports` map (only `merge-props`, `use-render`, `unstable-use-media-query` are public). There is no role-neutral Composite import.
4. **Normal tab order is correct here.** The WAI-ARIA APG prescribes a list of links in normal tab order for site navigation, not roving tabindex. Declining Base UI's Composite is following the spec, not compromising on it.
5. **Mobile indicator overhangs its tab** by `0.5rem` each side (`calc(var(--active-tab-width) + 1rem)`). The bar's existing `px-2` padding is exactly `0.5rem`, so an edge tab's pill lands flush with the bar's inner edge rather than bleeding past the rounded corner.
6. **The desktop rail pill tracks the exact `[aria-current=page]` element, including nested sub-pages.** When a section expands and the current page is one of its children, the pill slides down into the nested group.
7. **The mobile secondary strip adopts Tabs' _skin_, not Tabs.** It imports `tabsTabVariants` / `tabsListVariants` so it reads as a Tabs `subtle` pill row, while keeping `<nav>` + `<a aria-current='page'>`. Rendering `Tabs` there was considered and rejected: it would put `role=tab`/`aria-selected` on route links, drop `aria-current`, and force `NavigatorPrimary` to lift secondary item _data_ instead of elements — forking the "one element, two presentations" contract. The visual was the goal, and the visual is separable.
8. **`Navigator.Pane` / Base UI `ScrollArea` is out of scope.** Separate concern, separate plan.

## Global Constraints

- **Never emit `role=tab`, `role=tablist`, or `aria-selected` from Navigator.** Navigation currency is `aria-current='page'` (or `'true'` on the More disclosure). The existing tests at `Navigator.test.tsx:283`, `:808`, `:1154`, `:1384` guard this — they must pass unchanged.
- **No existing _semantic_ assertion may be edited.** Anything asserting `aria-current`, `data-slot`, roles, landmark names or keyboard behaviour must pass untouched. If one of those goes red, the approach was wrong — stop and re-plan rather than editing the test.
- **Exactly six existing _presentational_ assertions must change**, because the active surface deliberately moves from the destination element onto the indicator. They are enumerated line-by-line in Tasks 4 and 5 (one and five respectively). Changing any assertion **not** on those lists is out of bounds. Note that the _negative_ assertions (`not.toHaveClass('emphasis-raised')` on non-current items) all stay true and must not be touched.
- **jsdom returns all-zero rects.** `getBoundingClientRect()` and `offsetWidth` are `0` in this test environment. Every geometry test must stub rects explicitly (helper provided in Task 2). Untested geometry code is the main risk in this plan.
- **Comment style:** minimal. Comment only what the code cannot say — a quirk, an edge case, a _why_. Never restate the code. Match the surrounding files, which are terse.
- **Prettier:** single quotes, no semicolons, 2 spaces, 80 cols, Tailwind class sorting. Run `pnpm --filter @oztix/roadie-components format` if unsure; never run `prettier --write` on `.mdx`.
- **Motion:** follow Navigator's local convention — `motion-safe:transition-[…] motion-reduce:transition-none` — not Tabs' bare `transition-all`.
- **CVA prop types:** never type a public prop as `VariantProps<typeof v>['key']`. Inline the literal union. See `docs/solutions/build-errors/react-docgen-cva-literal-props.md`.

**Verification commands** (run from `packages/components/`):

```bash
pnpm test                 # vitest run
pnpm typecheck            # tsc --noEmit
pnpm lint
```

If `pnpm typecheck` passes locally but CI disagrees:
`find . -name "*.tsbuildinfo" -not -path "*/node_modules/*" -delete && pnpm typecheck`.

---

## File Structure

**Created:**

| Path                                                                           | Responsibility                                                                                                                     |
| ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| `packages/components/src/components/Navigator/NavigatorDestination.tsx`        | The one place Navigator forks link-vs-button. Owns `data-slot='navigator-item'`, `aria-current`, `aria-expanded`, `aria-controls`. |
| `packages/components/src/components/Navigator/useSlidingIndicator.ts`          | Measures the active `[aria-current]` descendant against a track; returns CSS vars + readiness. No DOM opinions beyond that.        |
| `packages/components/src/components/Navigator/NavigatorIndicator.tsx`          | Renders the pill from those vars. `aria-hidden`.                                                                                   |
| `packages/components/src/components/Navigator/useSlidingIndicator.test.tsx`    | Unit tests for the hook, with rect stubbing.                                                                                       |
| `packages/components/src/components/Navigator/NavigatorPresentationContext.ts` | Tells a `Navigator.Item` whether it is rendering into the rail or the mobile strip.                                                |

**Modified:**

| Path                                                                   | Change                                                                                                                           |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `Navigator/NavigatorItem.tsx:120-142`                                  | Replace the inline link/button fork with `NavigatorDestination`; later, pick strip vs rail classes off the presentation context. |
| `Navigator/NavigatorTab.tsx:88-114`                                    | Same.                                                                                                                            |
| `Navigator/NavigatorPrimary.tsx:333-338`                               | Mount the indicator inside the tab bar `<nav>`.                                                                                  |
| `Navigator/NavigatorPaneHeader.tsx:96-107`                             | Mount the indicator inside the strip `<nav>`.                                                                                    |
| `Navigator/NavigatorPrimary.tsx:325-332`                               | Mount the indicator inside the rail `<nav>`.                                                                                     |
| `Navigator/variants.ts`                                                | Add indicator variants; make three tracks `relative`; move active surfaces off the items onto the indicator.                     |
| `Navigator/Navigator.test.tsx`                                         | Add indicator tests. Do not edit existing semantic assertions.                                                                   |
| `docs/brainstorms/2026-07-24-navigator-tabs-unification-brainstorm.md` | Record the resolution of open questions 2, 3, 4, 6.                                                                              |

---

### Task 1: Extract the shared link-vs-button destination

`NavigatorItem.tsx:120-142` and `NavigatorTab.tsx:88-114` contain the same fork: `href` present → `RoadieRoutedLink`, else `<button>`, both carrying `data-slot='navigator-item'` and `aria-current`. Every later task depends on that `data-slot` + `aria-current` pair being emitted identically, because the indicator finds the active element by querying exactly that. Unify it first so there is one place to be right.

Note: `Tabs.Tab`'s smart-href handling is a genuinely different contract (it synthesizes a Base UI `render` prop and flips `nativeButton`). It is **not** unified here — the brainstorm's suggestion that one helper covers both was wrong.

**Files:**

- Create: `packages/components/src/components/Navigator/NavigatorDestination.tsx`
- Modify: `packages/components/src/components/Navigator/NavigatorItem.tsx:120-142`
- Modify: `packages/components/src/components/Navigator/NavigatorTab.tsx:88-114`
- Test: `packages/components/src/components/Navigator/Navigator.test.tsx` (existing suite is the test)

**Interfaces:**

- Consumes: `RoadieRoutedLink` from `../Link/RoadieRoutedLink`.
- Produces: `NavigatorDestination`, `NavigatorDestinationProps` — relied on by Tasks 4, 5, 6 only insofar as the emitted DOM stays stable.

- [ ] **Step 1: Run the existing suite to capture the green baseline**

```bash
cd packages/components && pnpm test -- Navigator
```

Expected: all Navigator tests pass. Record the count — it must not drop.

- [ ] **Step 2: Create the shared destination**

Create `packages/components/src/components/Navigator/NavigatorDestination.tsx`:

```tsx
'use client'

import type { MouseEvent, ReactNode } from 'react'

import { RoadieRoutedLink } from '../Link/RoadieRoutedLink'

export type NavigatorDestinationProps = {
  /** Omit to render a `<button>`. */
  href?: string
  /** `'page'` for a real destination, `'true'` for the More disclosure. */
  ariaCurrent?: 'page' | 'true'
  /** Set only on the disclosure, which is never a link. */
  expanded?: boolean
  controls?: string
  className?: string
  children: ReactNode
  onClick?: (event: MouseEvent) => void
}

/**
 * The single link-vs-button fork for every Navigator destination. Owning
 * `data-slot` and `aria-current` in one place is what lets the sliding
 * indicator find the active element with one selector across all three
 * surfaces.
 */
export function NavigatorDestination({
  href,
  ariaCurrent,
  expanded,
  controls,
  className,
  children,
  onClick
}: NavigatorDestinationProps) {
  if (href !== undefined) {
    return (
      <RoadieRoutedLink
        data-slot='navigator-item'
        aria-current={ariaCurrent}
        className={className}
        href={href}
        onClick={onClick}
      >
        {children}
      </RoadieRoutedLink>
    )
  }

  return (
    <button
      type='button'
      data-slot='navigator-item'
      aria-current={ariaCurrent}
      aria-expanded={expanded}
      aria-controls={controls}
      className={className}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

NavigatorDestination.displayName = 'NavigatorDestination'
```

- [ ] **Step 3: Adopt it in `NavigatorTab.tsx`**

Replace the whole block from `if (href !== undefined) {` (line 88) to the closing `}` of the `return (<button …>)` (line 114) with:

```tsx
  return (
    <NavigatorDestination
      href={href}
      ariaCurrent={ariaCurrent}
      expanded={expanded}
      controls={controls}
      className={finalClassName}
      onClick={onSelect}
    >
      {content}
    </NavigatorDestination>
  )
```

Add the import alongside the existing ones and drop the now-unused `RoadieRoutedLink` import:

```tsx
import { NavigatorDestination } from './NavigatorDestination'
```

- [ ] **Step 4: Adopt it in `NavigatorItem.tsx`**

`NavigatorItem`'s `onClick` prop is `() => void` while `NavigatorDestination`'s is `(event: MouseEvent) => void`. `handleClick` takes no arguments, so it satisfies the wider signature without change — leave `NavigatorItemProps.onClick` as `() => void`, it is public API.

Replace lines 120-142 with:

```tsx
  return (
    <>
      <NavigatorDestination
        href={effectiveHref}
        ariaCurrent={ariaCurrent}
        className={finalClassName}
        onClick={handleClick}
      >
        {content}
      </NavigatorDestination>
      {/* Gated here rather than inside `Navigator.Secondary` so the same
          element can also be read by `Navigator.Primary` for the strip.
          Branch-active so a section reveals its children while one is current. */}
      {isBranch ? secondary : null}
    </>
  )
```

Add the `NavigatorDestination` import and drop the unused `RoadieRoutedLink` import.

- [ ] **Step 5: Verify nothing moved**

```bash
cd packages/components && pnpm test -- Navigator && pnpm typecheck && pnpm lint
```

Expected: same passing count as Step 1, zero type errors, zero lint errors. This is a pure refactor — a single behavioural change here is a bug.

- [ ] **Step 6: Commit**

```bash
git add packages/components/src/components/Navigator/NavigatorDestination.tsx \
        packages/components/src/components/Navigator/NavigatorItem.tsx \
        packages/components/src/components/Navigator/NavigatorTab.tsx
git commit -m "refactor(navigator): single link-vs-button destination"
```

---

### Task 2: The `useSlidingIndicator` hook

The measurement engine. Deliberately knows nothing about tabs, rails or strips — it takes a track element and an active key, and returns CSS vars.

Two subtleties that must be got right:

- **Scroll offset.** The rail and strip both scroll (`overflow-y-auto` / `overflow-x-auto`). An absolutely-positioned indicator inside a scroll container is positioned in _content_ space, but `getBoundingClientRect()` deltas are in _viewport_ space. Adding `scrollTop`/`scrollLeft` converts between them.
- **Measuring after layout, not after paint.** Use a layout effect so the pill never renders one frame behind. Guard it for SSR.

**Files:**

- Create: `packages/components/src/components/Navigator/useSlidingIndicator.ts`
- Test: `packages/components/src/components/Navigator/useSlidingIndicator.test.tsx`

**Interfaces:**

- Consumes: nothing from earlier tasks.
- Produces:
  - `useSlidingIndicator(trackRef: RefObject<HTMLElement | null>, activeKey: string | undefined): SlidingIndicatorState`
  - `type SlidingIndicatorState = { style: CSSProperties | undefined; ready: boolean }`
  - `const ACTIVE_DESTINATION_SELECTOR = '[data-slot="navigator-item"][aria-current]'`

  Tasks 3–6 rely on exactly these names.

- [ ] **Step 1: Write the failing tests**

Create `packages/components/src/components/Navigator/useSlidingIndicator.test.tsx`:

```tsx
import { type RefObject, createRef } from 'react'

import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { useSlidingIndicator } from './useSlidingIndicator'

/**
 * jsdom reports every rect as zero, so geometry has to be stubbed. Values are
 * viewport-space, matching what getBoundingClientRect would really return.
 */
const stubRect = (
  element: HTMLElement,
  rect: { left: number; top: number; width: number; height: number }
) => {
  element.getBoundingClientRect = () =>
    ({
      left: rect.left,
      top: rect.top,
      right: rect.left + rect.width,
      bottom: rect.top + rect.height,
      width: rect.width,
      height: rect.height,
      x: rect.left,
      y: rect.top,
      toJSON: () => ({})
    }) as DOMRect
}

type HarnessProps = {
  activeKey: string | undefined
  trackRef: RefObject<HTMLDivElement | null>
  onState?: (state: { style?: Record<string, string>; ready: boolean }) => void
}

function Harness({ activeKey, trackRef, onState }: HarnessProps) {
  const state = useSlidingIndicator(trackRef, activeKey)
  onState?.(state as never)
  return null
}

const setup = (activeKey: string | undefined) => {
  const trackRef = createRef<HTMLDivElement>()
  const track = document.createElement('div')
  const first = document.createElement('a')
  const second = document.createElement('a')

  for (const child of [first, second]) {
    child.setAttribute('data-slot', 'navigator-item')
    track.append(child)
  }
  document.body.append(track)
  ;(trackRef as { current: HTMLDivElement | null }).current =
    track as HTMLDivElement

  stubRect(track, { left: 100, top: 50, width: 300, height: 60 })
  stubRect(first, { left: 110, top: 55, width: 80, height: 50 })
  stubRect(second, { left: 200, top: 55, width: 80, height: 50 })

  return { trackRef, track, first, second }
}

describe('useSlidingIndicator', () => {
  it('publishes the active element geometry relative to the track', () => {
    const { trackRef, second } = setup('two')
    second.setAttribute('aria-current', 'page')

    let captured: { style?: Record<string, string>; ready: boolean } = {
      ready: false
    }
    render(
      <Harness
        activeKey='two'
        trackRef={trackRef}
        onState={(state) => {
          captured = state
        }}
      />
    )

    expect(captured.ready).toBe(true)
    expect(captured.style).toMatchObject({
      '--active-tab-left': '100px',
      '--active-tab-top': '5px',
      '--active-tab-width': '80px',
      '--active-tab-height': '50px'
    })
  })

  it('adds the track scroll offset so a scrolled track still lines up', () => {
    const { trackRef, track, second } = setup('two')
    second.setAttribute('aria-current', 'page')
    Object.defineProperty(track, 'scrollLeft', { value: 40, writable: true })
    Object.defineProperty(track, 'scrollTop', { value: 12, writable: true })

    let captured: { style?: Record<string, string>; ready: boolean } = {
      ready: false
    }
    render(
      <Harness
        activeKey='two'
        trackRef={trackRef}
        onState={(state) => {
          captured = state
        }}
      />
    )

    expect(captured.style).toMatchObject({
      '--active-tab-left': '140px',
      '--active-tab-top': '17px'
    })
  })

  it('is not ready when nothing is current', () => {
    const { trackRef } = setup(undefined)

    let captured: { style?: Record<string, string>; ready: boolean } = {
      ready: false
    }
    render(
      <Harness
        activeKey={undefined}
        trackRef={trackRef}
        onState={(state) => {
          captured = state
        }}
      />
    )

    expect(captured.ready).toBe(false)
    expect(captured.style).toBeUndefined()
  })

  it('is not ready when the active element has zero size', () => {
    const { trackRef, first } = setup('one')
    first.setAttribute('aria-current', 'page')
    stubRect(first, { left: 110, top: 55, width: 0, height: 0 })

    let captured: { style?: Record<string, string>; ready: boolean } = {
      ready: false
    }
    render(
      <Harness
        activeKey='one'
        trackRef={trackRef}
        onState={(state) => {
          captured = state
        }}
      />
    )

    expect(captured.ready).toBe(false)
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
cd packages/components && pnpm test -- useSlidingIndicator
```

Expected: FAIL — `Failed to resolve import "./useSlidingIndicator"`.

- [ ] **Step 3: Implement the hook**

Create `packages/components/src/components/Navigator/useSlidingIndicator.ts`:

```ts
'use client'

import {
  type CSSProperties,
  type RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useState
} from 'react'

/** Every Navigator destination carries this pair — see NavigatorDestination. */
export const ACTIVE_DESTINATION_SELECTOR =
  '[data-slot="navigator-item"][aria-current]'

export type SlidingIndicatorState = {
  style: CSSProperties | undefined
  ready: boolean
}

type Geometry = { left: number; top: number; width: number; height: number }

const sameGeometry = (a: Geometry | null, b: Geometry | null) =>
  a === b ||
  (a !== null &&
    b !== null &&
    a.left === b.left &&
    a.top === b.top &&
    a.width === b.width &&
    a.height === b.height)

// `useLayoutEffect` warns when React renders on the server; Navigator's tree is
// authored in client components but the barrel is imported from RSC files.
const useIsomorphicLayoutEffect =
  typeof window === 'undefined' ? useEffect : useLayoutEffect

/**
 * Measures the current `[aria-current]` destination inside `trackRef` and
 * publishes its box as `--active-tab-*` custom properties — the same var names
 * Base UI's Tabs indicator uses, so the consuming CSS reads the same either way.
 *
 * Role-neutral on purpose: it reads navigation currency, never `aria-selected`,
 * so the same hook drives the tab bar, the secondary strip and the rail.
 */
export function useSlidingIndicator(
  trackRef: RefObject<HTMLElement | null>,
  activeKey: string | undefined
): SlidingIndicatorState {
  const [geometry, setGeometry] = useState<Geometry | null>(null)

  const measure = useCallback(() => {
    const track = trackRef.current
    const active = track?.querySelector<HTMLElement>(
      ACTIVE_DESTINATION_SELECTOR
    )

    if (!track || !active) {
      setGeometry((previous) => (previous === null ? previous : null))
      return
    }

    const trackRect = track.getBoundingClientRect()
    const activeRect = active.getBoundingClientRect()
    // Rect deltas are viewport-space; the indicator is positioned in the
    // track's content space, so a scrolled track needs its offset added back.
    const next: Geometry = {
      left: activeRect.left - trackRect.left + track.scrollLeft,
      top: activeRect.top - trackRect.top + track.scrollTop,
      width: activeRect.width,
      height: activeRect.height
    }

    setGeometry((previous) => (sameGeometry(previous, next) ? previous : next))
  }, [trackRef])

  useIsomorphicLayoutEffect(measure, [measure, activeKey])

  useEffect(() => {
    const track = trackRef.current
    if (!track || typeof ResizeObserver === 'undefined') return

    const observer = new ResizeObserver(measure)
    observer.observe(track)
    for (const destination of track.querySelectorAll<HTMLElement>(
      '[data-slot="navigator-item"]'
    )) {
      observer.observe(destination)
    }
    return () => observer.disconnect()
  }, [trackRef, measure, activeKey])

  const ready = geometry !== null && geometry.width > 0 && geometry.height > 0

  return {
    ready,
    style: geometry
      ? ({
          '--active-tab-left': `${geometry.left}px`,
          '--active-tab-top': `${geometry.top}px`,
          '--active-tab-width': `${geometry.width}px`,
          '--active-tab-height': `${geometry.height}px`
        } as CSSProperties)
      : undefined
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
cd packages/components && pnpm test -- useSlidingIndicator
```

Expected: 4 passed.

If the zero-size test fails because `style` is populated: that is correct — `style` is published whenever geometry exists, and only `ready` gates visibility. The assertion is on `ready` alone.

- [ ] **Step 5: Commit**

```bash
git add packages/components/src/components/Navigator/useSlidingIndicator.ts \
        packages/components/src/components/Navigator/useSlidingIndicator.test.tsx
git commit -m "feat(navigator): role-neutral sliding indicator measurement"
```

---

### Task 3: The `NavigatorIndicator` component and its variants

Turns the vars into a pill. Three shapes: `tab` (mobile bar, overhanging), `strip` (mobile secondary, hugging), `rail` (desktop, vertical).

The overhang is the point of the whole plan: `left` is inset by `0.5rem` and `width` inflated by `1rem`, so the pill is wider than the tab it tracks.

**Files:**

- Create: `packages/components/src/components/Navigator/NavigatorIndicator.tsx`
- Modify: `packages/components/src/components/Navigator/variants.ts`

**Interfaces:**

- Consumes: `useSlidingIndicator`, `SlidingIndicatorState` from Task 2.
- Produces:
  - `NavigatorIndicator` with props `{ trackRef: RefObject<HTMLElement | null>; activeKey: string | undefined; surface: 'tab' | 'strip' | 'rail'; hidden?: boolean }`
  - `navigatorIndicatorVariants` in `variants.ts`

  Tasks 4, 5 and 6 mount this component.

- [ ] **Step 1: Add the variants**

Append to `packages/components/src/components/Navigator/variants.ts`:

```ts
// The sliding active-destination pill, shared by all three surfaces. Geometry
// arrives as `--active-tab-*` custom properties from `useSlidingIndicator`.
//
// `tab` deliberately inflates the measured box by 0.5rem per side: the mobile
// bar's tabs are `flex-1` and share the bar evenly, so a pill drawn at the
// tab's own width crowds the label. The bar's `px-2` is exactly that 0.5rem,
// so an edge tab's pill lands flush with the bar's inner edge.
//
// `data-[ready=false]` covers the first paint, before any measurement exists:
// no transition, so the pill never slides in from (0,0).
export const navigatorIndicatorVariants = cva(
  [
    'pointer-events-none absolute z-0 rounded-full',
    'motion-safe:data-[ready=true]:transition-[left,top,width,height]',
    'motion-safe:data-[ready=true]:duration-slow motion-safe:data-[ready=true]:ease-enter',
    'motion-reduce:transition-none'
  ],
  {
    variants: {
      surface: {
        tab: [
          'intent-accent bg-[var(--intent-bg-subtle)]',
          'top-[var(--active-tab-top)] h-[var(--active-tab-height)]',
          'left-[calc(var(--active-tab-left)-0.5rem)]',
          'w-[calc(var(--active-tab-width)+1rem)]'
        ].join(' '),
        // Matches `tabsIndicatorVariants({ emphasis: 'subtle' })` — the strip
        // deliberately reads as a Tabs subtle pill row. See Task 6.
        strip: [
          'emphasis-subtle',
          'top-[var(--active-tab-top)] h-[var(--active-tab-height)]',
          'left-[var(--active-tab-left)] w-[var(--active-tab-width)]'
        ].join(' '),
        rail: [
          'emphasis-raised rounded-xl',
          'top-[var(--active-tab-top)] h-[var(--active-tab-height)]',
          'left-[var(--active-tab-left)] w-[var(--active-tab-width)]'
        ].join(' ')
      },
      visible: {
        true: 'opacity-100',
        false: 'opacity-0'
      }
    },
    defaultVariants: { surface: 'tab', visible: false }
  }
)

export type NavigatorIndicatorSurface = 'tab' | 'strip' | 'rail'
```

- [ ] **Step 2: Create the component**

Create `packages/components/src/components/Navigator/NavigatorIndicator.tsx`:

```tsx
'use client'

import type { RefObject } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { useSlidingIndicator } from './useSlidingIndicator'
import {
  type NavigatorIndicatorSurface,
  navigatorIndicatorVariants
} from './variants'

export type NavigatorIndicatorProps = {
  /** The element the active destination is measured against. */
  trackRef: RefObject<HTMLElement | null>
  /** Re-measures whenever this changes — Navigator's active value. */
  activeKey: string | undefined
  surface: NavigatorIndicatorSurface
  /** Suppress without unmounting, e.g. while the tab bar is collapsed. */
  hidden?: boolean
  className?: string
}

/**
 * Purely presentational: `aria-hidden` because `aria-current` on the
 * destination itself is what conveys currency. The pill is decoration.
 */
export function NavigatorIndicator({
  trackRef,
  activeKey,
  surface,
  hidden = false,
  className
}: NavigatorIndicatorProps) {
  const { style, ready } = useSlidingIndicator(trackRef, activeKey)
  const visible = ready && !hidden

  return (
    <span
      aria-hidden='true'
      data-slot='navigator-indicator'
      data-ready={String(ready)}
      style={style}
      className={cn(
        navigatorIndicatorVariants({ surface, visible }),
        className
      )}
    />
  )
}

NavigatorIndicator.displayName = 'NavigatorIndicator'
```

- [ ] **Step 3: Verify it compiles and nothing regressed**

```bash
cd packages/components && pnpm typecheck && pnpm lint && pnpm test -- Navigator
```

Expected: clean. The component is not mounted anywhere yet, so tests are unchanged.

- [ ] **Step 4: Commit**

```bash
git add packages/components/src/components/Navigator/NavigatorIndicator.tsx \
        packages/components/src/components/Navigator/variants.ts
git commit -m "feat(navigator): sliding indicator pill component"
```

---

### Task 4: Adopt on the mobile tab bar

The visible payoff. The active tab's background moves off the tab and onto the indicator, which is wider than the tab.

Collapsed, the bar becomes two floating circles with their own surfaces — the indicator is suppressed rather than animated into a circle, because collapsed tabs shrink to `max-w-0` and the geometry is meaningless mid-transition.

**Files:**

- Modify: `packages/components/src/components/Navigator/NavigatorPrimary.tsx:333-338`
- Modify: `packages/components/src/components/Navigator/variants.ts` (`navigatorTabBarVariants`, `navigatorTabVariants`)
- Test: `packages/components/src/components/Navigator/Navigator.test.tsx`

**Interfaces:**

- Consumes: `NavigatorIndicator` from Task 3.
- Produces: nothing new.

- [ ] **Step 1: Write the failing tests**

The suite has no shared render helper — each `describe` renders inline JSX. Follow that. Add a new top-level `describe` after `describe('Navigator mobile tab bar', …)` (which starts at line 741):

```tsx
describe('Navigator sliding indicator', () => {
  const tree = (active: string) => (
    <Navigator value={active}>
      <Navigator.Primary aria-label='Primary'>
        <Navigator.Item value='discover'>Discover</Navigator.Item>
        <Navigator.Item value='tickets'>Tickets</Navigator.Item>
      </Navigator.Primary>
    </Navigator>
  )

  it('renders a decorative indicator in the tab bar', () => {
    const { container } = render(tree('tickets'))

    const indicator = container.querySelector(
      '[data-slot="navigator-tab-bar"] [data-slot="navigator-indicator"]'
    )

    expect(indicator).toBeInTheDocument()
    expect(indicator).toHaveAttribute('aria-hidden', 'true')
  })

  it('keeps the indicator out of the accessibility tree', () => {
    const { container } = render(tree('tickets'))

    const indicator = container.querySelector(
      '[data-slot="navigator-indicator"]'
    )!

    expect(indicator.tagName).toBe('SPAN')
    expect(indicator).not.toHaveAttribute('aria-current')
    expect(indicator).not.toHaveAttribute('data-slot', 'navigator-item')
  })

  it('carries the tab bar active surface on the indicator, not the tab', () => {
    const { container } = render(tree('tickets'))

    const indicator = container.querySelector(
      '[data-slot="navigator-tab-bar"] [data-slot="navigator-indicator"]'
    )!

    expect(indicator.className).toContain('bg-[var(--intent-bg-subtle)]')
  })

  // jsdom reports zero rects, so the indicator can never measure a real box.
  // That is the correct first-paint state and worth pinning: no transition
  // until a measurement exists, so the pill never slides in from (0,0).
  it('stays unready while nothing can be measured', () => {
    const { container } = render(tree('tickets'))

    const indicator = container.querySelector(
      '[data-slot="navigator-tab-bar"] [data-slot="navigator-indicator"]'
    )!

    expect(indicator).toHaveAttribute('data-ready', 'false')
    expect(indicator.className).toContain('opacity-0')
  })
})
```

- [ ] **Step 1b: Migrate the one presentational assertion this task invalidates**

`Navigator.test.tsx:1763` currently asserts the active mobile tab paints its own tinted background:

```tsx
expect(active.className).toContain('bg-[var(--intent-bg-subtle)]')
```

That background now lives on the indicator. Replace that single line with:

```tsx
expect(active.className).toContain('text-accent-11')
```

Leave line 1785 (`not.toContain('bg-[var(--intent-bg-subtle)]')` for the inactive tab) exactly as it is — it is still true. The new "carries the tab bar active surface on the indicator" test above is what now covers the moved background.

- [ ] **Step 2: Run to verify they fail**

```bash
cd packages/components && pnpm test -- Navigator
```

Expected: the two new tests FAIL — no `navigator-indicator` element.

- [ ] **Step 3: Make the bar a positioning context**

In `variants.ts`, `navigatorTabBarVariants`, add `relative` to the base array. Change:

```ts
    'mx-3',
    'flex items-center',
```

to:

```ts
    'relative mx-3',
    'flex items-center',
```

- [ ] **Step 4: Move the active surface off the tab onto the indicator**

In `variants.ts`, `navigatorTabVariants`, the tab must sit above the pill and no longer paint its own background. Add `relative z-[1]` to the base array — change:

```ts
    'is-interactive min-w-0 overflow-hidden rounded-full',
```

to:

```ts
    'is-interactive relative z-[1] min-w-0 rounded-full',
```

`overflow-hidden` is dropped: it was clipping the tab's own background to its rounded box, and the background now lives on the indicator. The label's `truncate` still handles overflow.

Then in `compoundVariants`, the expanded-active entry loses its background but keeps the accent text:

```ts
      {
        active: true,
        presentation: 'expanded',
        class: 'text-accent-11'
      },
```

Leave the other three compound entries exactly as they are — the collapsed circles still own their surfaces.

- [ ] **Step 5: Mount the indicator**

In `NavigatorPrimary.tsx`, add to the imports:

```tsx
import { NavigatorIndicator } from './NavigatorIndicator'
```

and add `useRef` to the existing `react` import.

Inside the component body, alongside the other hooks:

```tsx
const tabBarRef = useRef<HTMLElement>(null)
```

Then change the tab-bar `<nav>` opening tag (line 333) to attach the ref, and add the indicator as its first child:

```tsx
      <nav
        ref={tabBarRef}
        data-slot='navigator-tab-bar'
        data-collapsed={String(navCollapsed)}
        aria-label={`${ariaLabel} tabs`}
        className={navigatorTabBarVariants({ collapsed: navCollapsed })}
      >
        <NavigatorIndicator
          trackRef={tabBarRef}
          activeKey={activeValue}
          surface='tab'
          hidden={navCollapsed}
        />
        {slots.tabs.map((tab) => {
```

The indicator is first in DOM order so it paints beneath the tabs, which carry `z-[1]`.

- [ ] **Step 6: Run the tests**

```bash
cd packages/components && pnpm test -- Navigator && pnpm typecheck && pnpm lint
```

Expected: the two new tests PASS and every pre-existing Navigator test still passes. If an existing test now fails, do not edit its assertion — the change was wrong.

- [ ] **Step 7: Verify visually**

```bash
cd /Users/lukebrooker/Code/roadie && pnpm dev
```

Open the docs site at a 390px-wide viewport. Confirm:

- The active pill is visibly wider than its tab's label box and does not bleed past the bar's rounded edge on the first or last tab.
- Tapping another tab slides the pill rather than cross-fading it.
- Scrolling a pane collapses the bar to two circles with **no** pill left behind.
- The label of the longest section ("Foundations" / "Components") still fits without truncating.

- [ ] **Step 8: Commit**

```bash
git add packages/components/src/components/Navigator/NavigatorPrimary.tsx \
        packages/components/src/components/Navigator/variants.ts \
        packages/components/src/components/Navigator/Navigator.test.tsx
git commit -m "feat(navigator): sliding overhanging pill on the mobile tab bar"
```

---

### Task 5: Adopt on the desktop rail

The rail is vertical and its active element may be nested inside a `Navigator.Secondary`. `useSlidingIndicator` already handles both — it queries a descendant, not a child, and publishes `top`/`height` the same way it publishes `left`/`width`.

The rail's current item today gets `emphasis-raised` from `navigatorItemVariants({ state: 'current' })`. That surface moves to the indicator, or two raised pills stack.

**Files:**

- Modify: `packages/components/src/components/Navigator/NavigatorPrimary.tsx:325-332`
- Modify: `packages/components/src/components/Navigator/variants.ts` (`navigatorRailVariants`, `navigatorItemVariants`)
- Test: `packages/components/src/components/Navigator/Navigator.test.tsx`

**Interfaces:**

- Consumes: `NavigatorIndicator` from Task 3.
- Produces: nothing new.

- [ ] **Step 1: Write the failing tests**

Add to the `describe('Navigator sliding indicator', …)` block created in Task 4:

```tsx
const nestedTree = (active: string) => (
  <Navigator value={active}>
    <Navigator.Primary aria-label='Primary'>
      <Navigator.Item value='components'>
        Components
        <Navigator.Secondary aria-label='Components pages'>
          <Navigator.Item value='button'>Button</Navigator.Item>
          <Navigator.Item value='card'>Card</Navigator.Item>
        </Navigator.Secondary>
      </Navigator.Item>
    </Navigator.Primary>
  </Navigator>
)

it('renders a sliding indicator in the rail', () => {
  const { container } = render(tree('tickets'))

  const indicator = container.querySelector(
    '[data-slot="navigator-rail"] [data-slot="navigator-indicator"]'
  )

  expect(indicator).toBeInTheDocument()
  expect(indicator).toHaveAttribute('aria-hidden', 'true')
  expect(indicator?.className).toContain('emphasis-raised')
})

it('leaves the nested sub-page as the sole aria-current element in the rail', () => {
  const { container } = render(nestedTree('button'))

  const current = container.querySelectorAll(
    '[data-slot="navigator-rail"] [aria-current]'
  )

  expect(current).toHaveLength(1)
  expect(current[0]).toHaveAttribute('data-slot', 'navigator-item')
  expect(current[0]).toHaveTextContent('Button')
})

it('mounts one indicator per rail, not one per nested group', () => {
  const { container } = render(nestedTree('button'))

  expect(
    container.querySelectorAll(
      '[data-slot="navigator-rail"] [data-slot="navigator-indicator"]'
    )
  ).toHaveLength(1)
})
```

- [ ] **Step 1b: Migrate the five presentational assertions this task invalidates**

Each is a positive `emphasis-raised` assertion on the _current_ rail item. That surface now lives on the rail indicator, which the "renders a sliding indicator in the rail" test above covers. Change exactly these five lines, nothing else:

| Line | From                                                            | To                                                       |
| ---- | --------------------------------------------------------------- | -------------------------------------------------------- |
| 425  | `expect(railItem('Tickets')).toHaveClass('emphasis-raised')`    | `expect(railItem('Tickets')).toHaveClass('text-strong')` |
| 526  | `expect(current).toHaveClass('emphasis-raised')`                | `expect(current).toHaveClass('text-strong')`             |
| 643  | `expect(railItem('Tickets')).toHaveClass('emphasis-raised')`    | `expect(railItem('Tickets')).toHaveClass('text-strong')` |
| 701  | `expect(current).toHaveClass('emphasis-raised', 'text-strong')` | `expect(current).toHaveClass('text-strong')`             |
| 728  | `expect(current).toHaveClass('emphasis-raised')`                | `expect(current).toHaveClass('text-strong')`             |

Line numbers will have drifted by the edits in Task 4 — locate each by its surrounding `it(…)` title rather than trusting the number. The five titles are:

- `'gives the active rail item the neutral raised pill classes'` (two occurrences of this shape, at 425 and 643, in different `describe` blocks)
- `'gives aria-current to the exact descendant, not the branch section'` region (526)
- `'raises the current sub-page neutrally with the accent bar on the tree-line'` (701)
- `'raises the selected primary as current with an accent icon and no bar'` (728)

All six _negative_ assertions (`not.toHaveClass('emphasis-raised')` at 428, 522, 645, 694, 715, 737) stay exactly as they are — they remain true, since non-current items never had the surface.

Every `aria-current` assertion in these same tests stays untouched. If you find yourself editing one, stop.

- [ ] **Step 2: Run to verify it fails**

```bash
cd packages/components && pnpm test -- Navigator
```

Expected: the rail indicator test FAILS.

- [ ] **Step 3: Make the rail a positioning context**

In `variants.ts`, `navigatorRailVariants` base array, change:

```ts
    'group/rail hidden min-h-0 md:col-start-1 md:row-start-1 md:flex md:flex-col',
```

to:

```ts
    'group/rail relative hidden min-h-0 md:col-start-1 md:row-start-1 md:flex md:flex-col',
```

- [ ] **Step 4: Move the current row's surface onto the indicator**

In `variants.ts`, `navigatorItemVariants`, the `current` state drops `emphasis-raised` and keeps its text and accent icon. Change:

```ts
        current: [
          'emphasis-raised text-strong',
          '[&_[data-slot=navigator-item-icon]]:text-accent-11'
        ],
```

to:

```ts
        current: [
          'text-strong',
          '[&_[data-slot=navigator-item-icon]]:text-accent-11'
        ],
```

The row's base already carries `relative`, so it paints above the indicator without a `z-` addition — but the indicator needs to be behind. Add `z-[1]` to the base array; change:

```ts
    'is-interactive relative w-full min-w-0 rounded-xl text-left text-sm font-semibold',
```

to:

```ts
    'is-interactive relative z-[1] w-full min-w-0 rounded-xl text-left text-sm font-semibold',
```

- [ ] **Step 5: Mount it**

In `NavigatorPrimary.tsx`, add another ref alongside `tabBarRef`:

```tsx
const railRef = useRef<HTMLElement>(null)
```

and change the rail `<nav>` (line 325) to:

```tsx
<nav
  ref={railRef}
  data-slot='navigator-rail'
  data-form={form}
  aria-label={ariaLabel}
  className={cn(navigatorRailVariants({ form }), className)}
>
  <NavigatorIndicator
    trackRef={railRef}
    activeKey={activeValue}
    surface='rail'
  />
  {children}
</nav>
```

- [ ] **Step 6: Run the tests**

```bash
cd packages/components && pnpm test -- Navigator && pnpm typecheck && pnpm lint
```

Expected: new tests pass, all pre-existing tests still pass. In particular the test at `Navigator.test.tsx:706-713`, which asserts the nested accent-bar classes, must be untouched — the tree-line accent bar stays.

- [ ] **Step 7: Verify visually**

With `pnpm dev` running, at desktop width:

- The rail pill sits behind the current row, not on top of its text.
- Clicking a different top-level section slides the pill.
- Opening a section whose sub-page is current slides the pill **into** the nested group, and the nested sub-page keeps its short accent bar on the tree-line.
- The compact rail form (a tree with no `Navigator.Secondary` anywhere) still looks right — the pill tracks the centred icon-stack rows.

- [ ] **Step 8: Commit**

```bash
git add packages/components/src/components/Navigator/NavigatorPrimary.tsx \
        packages/components/src/components/Navigator/variants.ts \
        packages/components/src/components/Navigator/Navigator.test.tsx
git commit -m "feat(navigator): sliding indicator on the desktop rail"
```

---

### Task 6: Adopt on the mobile secondary strip

The strip lives in `NavigatorPaneHeader`, renders the same authored `Navigator.Item` elements the rail does, and scrolls horizontally. The scroll offset handling in `useSlidingIndicator` exists for this surface.

**The strip should look exactly like a Roadie Tabs `subtle` pill row** — that was the explicit design call. It gets there by importing Tabs' CVA class strings, not by rendering `Tabs`. Navigator keeps `<nav>` + `<a aria-current='page'>`; only the vocabulary is shared. This is the one part of the original Tabs-unification idea that survives scrutiny.

That forces a structural change first. The strip currently styles its items through descendant selectors (`[&_[data-slot=navigator-item]]:…`) because it doesn't own the elements it renders — and **a CVA output string cannot be applied through a descendant selector**, since every class would need the `[&_…]:` prefix. So `NavigatorItem` has to learn which surface it is rendering into.

A context does that cleanly: the strip's children are distinct React elements from the rail's (they come through `secondaryNav.children`), so a provider wrapped around the strip only affects strip instances. This also retires the fragile descendant-selector styling, which is a win on its own.

`Tabs/variants.ts` imports nothing but `cva`, so importing from it pulls no Base UI into Navigator's bundle. Verified.

**Files:**

- Create: `packages/components/src/components/Navigator/NavigatorPresentationContext.ts`
- Modify: `packages/components/src/components/Navigator/NavigatorItem.tsx:117` (class selection)
- Modify: `packages/components/src/components/Navigator/NavigatorPaneHeader.tsx:96-107`
- Modify: `packages/components/src/components/Navigator/variants.ts` (`navigatorSecondaryStripVariants`)
- Test: `packages/components/src/components/Navigator/Navigator.test.tsx`

**Interfaces:**

- Consumes: `NavigatorIndicator` from Task 3; `tabsListVariants`, `tabsTabVariants` from `../Tabs/variants`.
- Produces:
  - `NavigatorPresentationContext` (a `Context<NavigatorPresentation>`, default `'rail'`)
  - `type NavigatorPresentation = 'rail' | 'strip'`

- [ ] **Step 1: Write the failing test**

The strip only renders when a `Navigator.Pane.Header` is mounted to host it, so this tree needs a pane. Add to the `describe('Navigator sliding indicator', …)` block:

```tsx
it('renders a sliding indicator in the secondary strip', () => {
  const { container } = render(
    <Navigator value='button'>
      <Navigator.Primary aria-label='Primary'>
        <Navigator.Item value='components'>
          Components
          <Navigator.Secondary aria-label='Components pages'>
            <Navigator.Item value='button'>Button</Navigator.Item>
            <Navigator.Item value='card'>Card</Navigator.Item>
          </Navigator.Secondary>
        </Navigator.Item>
      </Navigator.Primary>
      <Navigator.Content>
        <Navigator.Pane>
          <Navigator.Pane.Header heading='Button' />
        </Navigator.Pane>
      </Navigator.Content>
    </Navigator>
  )

  const indicator = container.querySelector(
    '[data-slot="navigator-secondary-strip"] [data-slot="navigator-indicator"]'
  )

  expect(indicator).toBeInTheDocument()
  expect(indicator).toHaveAttribute('aria-hidden', 'true')
})
```

Cross-check the pane/header JSX against the existing `describe('Navigator.Pane.Header', …)` block (starts at line 1178) and match whatever shape it uses — the strip is populated through a context effect, so the tree has to be right for it to appear at all.

- [ ] **Step 2: Run to verify it fails**

```bash
cd packages/components && pnpm test -- Navigator
```

Expected: FAIL.

- [ ] **Step 3: Add the presentation context**

Create `packages/components/src/components/Navigator/NavigatorPresentationContext.ts`:

```ts
'use client'

import { createContext } from 'react'

/**
 * Which surface a `Navigator.Item` is currently rendering into. The rail and
 * the mobile strip render the *same authored elements* through different
 * parents, so the item can't infer this from its own props.
 */
export type NavigatorPresentation = 'rail' | 'strip'

export const NavigatorPresentationContext =
  createContext<NavigatorPresentation>('rail')
```

- [ ] **Step 4: Teach `NavigatorItem` the strip presentation**

In `NavigatorItem.tsx`, add the imports:

```tsx
import { tabsTabVariants } from '../Tabs/variants'
import { NavigatorPresentationContext } from './NavigatorPresentationContext'
```

Read the context alongside the existing one:

```tsx
const presentation = use(NavigatorPresentationContext)
```

Then replace the `finalClassName` assignment (line 117):

```tsx
const finalClassName = cn(navigatorItemVariants({ state }), className)
```

with:

```tsx
// The strip reads as a Tabs `subtle` pill row — same class vocabulary, but
// still a <nav> of routed links, so currency stays `aria-current`. Tabs'
// own active colour keys off `data-[active]`, which only Base UI sets, so
// the current item's `text-strong` is applied here instead.
const finalClassName = cn(
  presentation === 'strip'
    ? cn(
        tabsTabVariants({ emphasis: 'subtle', size: 'sm' }),
        'shrink-0',
        isCurrent && 'text-strong'
      )
    : navigatorItemVariants({ state }),
  className
)
```

- [ ] **Step 5: Restyle the strip container and drop the descendant overrides**

In `variants.ts`, replace `navigatorSecondaryStripVariants` entirely. The per-item descendant selectors are gone — `NavigatorItem` now styles itself:

```ts
// The mobile face of the same declaration: a horizontally scrolling row that
// lives inside `Navigator.Pane.Header`. Mirrors `tabsListVariants({ emphasis:
// 'subtle' })` so it reads as a Tabs pill row, with scrolling added — Tabs'
// own list never scrolls. `relative` anchors the sliding indicator.
//
// Items are no longer styled from here: `NavigatorItem` picks its own classes
// off `NavigatorPresentationContext`. A CVA output string can't be pushed
// through a `[&_…]:` selector, which is what forced that change.
export const navigatorSecondaryStripVariants = cva([
  'md:hidden',
  'relative flex items-center gap-1 rounded-full p-1',
  'overflow-x-auto overscroll-x-contain'
])
```

- [ ] **Step 6: Mount the provider and the indicator**

In `NavigatorPaneHeader.tsx`, add the imports:

```tsx
import { NavigatorIndicator } from './NavigatorIndicator'
import { NavigatorPresentationContext } from './NavigatorPresentationContext'
```

add `useRef` to the existing `react` import, and read `value` from context — change:

```tsx
const { secondaryNav, registerHeader } = use(NavigatorContext)
```

to:

```tsx
const { secondaryNav, registerHeader, value } = use(NavigatorContext)
const stripRef = useRef<HTMLElement>(null)
```

Then change the strip `<nav>` to:

```tsx
<nav
  ref={stripRef}
  data-slot='navigator-secondary-strip'
  aria-label={`${secondaryNav['aria-label']} tabs`}
  className={cn(secondaryNav.className, navigatorSecondaryStripVariants())}
>
  <NavigatorIndicator trackRef={stripRef} activeKey={value} surface='strip' />
  <NavigatorPresentationContext value='strip'>
    {secondaryNav.children}
  </NavigatorPresentationContext>
</nav>
```

React 19 allows a context object to be used directly as the provider — no `.Provider`. Match whatever the rest of the codebase does; `NavigatorRoot.tsx` is the reference.

- [ ] **Step 6b: Add a test pinning the shared vocabulary**

Add to the `describe('Navigator sliding indicator', …)` block, so a future refactor can't silently drift the strip away from the Tabs look:

```tsx
it('styles strip items with the Tabs subtle pill vocabulary', () => {
  const { container } = render(stripTree())

  const item = container.querySelector(
    '[data-slot="navigator-secondary-strip"] [data-slot="navigator-item"]'
  )!

  expect(item.className).toContain('rounded-full')
  expect(item).toHaveClass('is-interactive')
  // Still navigation, not a tab.
  expect(item).not.toHaveAttribute('role', 'tab')
  expect(item).not.toHaveAttribute('aria-selected')
})
```

Extract the pane/header JSX from Step 1 into a `stripTree()` helper inside the `describe` so both tests share it.

- [ ] **Step 7: Run the tests**

```bash
cd packages/components && pnpm test -- Navigator && pnpm typecheck && pnpm lint
```

Expected: all pass. Two existing strip tests are worth watching specifically — `'marks the active secondary destination with aria-current'` (line ~1154) and the strip's landmark-name test. Both are semantic and must survive untouched; if either goes red, the presentation context is leaking past the strip.

- [ ] **Step 8: Verify visually**

At 390px width, on a page with a section nav:

- The strip reads as a Tabs `subtle` pill row — compare side by side with the Tabs docs page at the same width. If it doesn't match, the gap is in `tabsTabVariants`' size choice (`sm` vs `md`), not in the structure.
- The current pill slides between sub-pages.
- Scrolling the strip horizontally keeps the pill aligned to its item (this is the scroll-offset path — if the pill drifts, the `scrollLeft` handling is wrong).
- The **rail's** secondary items are unchanged — the tree-line, indentation and accent bar all still render. If they changed, the presentation context defaulted wrong.

- [ ] **Step 9: Commit**

```bash
git add packages/components/src/components/Navigator/NavigatorPresentationContext.ts \
        packages/components/src/components/Navigator/NavigatorItem.tsx \
        packages/components/src/components/Navigator/NavigatorPaneHeader.tsx \
        packages/components/src/components/Navigator/variants.ts \
        packages/components/src/components/Navigator/Navigator.test.tsx
git commit -m "feat(navigator): strip adopts the Tabs pill vocabulary and sliding indicator"
```

---

### Task 7: Record the outcome in the brainstorm

The brainstorm carries eight open questions. Four are now answered by running code, and leaving them open invites someone to redo this analysis.

**Files:**

- Modify: `docs/brainstorms/2026-07-24-navigator-tabs-unification-brainstorm.md`

- [ ] **Step 1: Append the resolution section**

Add at the end of the brainstorm:

```markdown
## Resolution (2026-07-24)

Implemented as `docs/plans/2026-07-24-navigator-sliding-indicator-plan.md`.
Option B, but with the sharing seam drawn tighter than the brainstorm proposed:
**nothing is shared with `Tabs` at all.** The primitive lives in Navigator.

- **Q2 (More disclosure):** moot. The indicator tracks `[aria-current]`, so the
  disclosure participates or not purely by whether it carries currency. It stays
  an ordinary `<button aria-expanded>` sibling.
- **Q3 (collapseNav):** the indicator is suppressed while collapsed
  (`hidden={navCollapsed}`). Collapsed tabs shrink to `max-w-0`, so their
  geometry is meaningless mid-transition and the edge circles own their surfaces.
- **Q4 (indicator reuse):** Navigator reimplements measurement in
  `useSlidingIndicator`. `Tabs.Indicator` is untouched. Two reasons, both
  verified against `@base-ui/react@1.3.0`: (a) `Tabs.Indicator` measures only
  tabs registered in the root's `tabMap`, and only direct `Tabs.Tab` children
  register — so it cannot track the rail's nested `Navigator.Secondary` items;
  (b) `composite/` is absent from the package's `exports` map, so the
  roving-focus engine cannot be imported without its role.
- **Q6 (one element, two presentations):** preserved and made explicit. The strip
  still renders the authored `Navigator.Item` elements; a
  `NavigatorPresentationContext` tells them which surface they are in, replacing
  the descendant-selector styling the strip used before. The indicator reads
  their DOM rather than replacing them, which is precisely why a hand-rolled
  primitive beat Base UI here.

Adopted from the brainstorm's step 4: the strip now imports `tabsTabVariants` /
`tabsListVariants` so it reads as a Tabs `subtle` pill row. One-way only —
`Tabs/variants.ts` is untouched, and no `role=tab` reaches the DOM. Sharing the
skin without the semantics is the whole shape of the answer.

Also settled: normal tab order is retained on all three surfaces, since the
WAI-ARIA APG prescribes it for site navigation. Roving focus was never a gap.

Still open, unchanged: the `ScrollArea` question for `Navigator.Pane`.
```

- [ ] **Step 2: Verify the doc renders**

```bash
cd /Users/lukebrooker/Code/roadie && pnpm --filter docs build
```

Expected: build succeeds. Do **not** run `prettier --write` on `.mdx` files (it empties them) — this is `.md`, so `pnpm format` is safe.

- [ ] **Step 3: Full verification before calling this done**

```bash
cd /Users/lukebrooker/Code/roadie && pnpm test && pnpm typecheck && pnpm lint
```

Expected: all green across the monorepo.

- [ ] **Step 4: Commit**

```bash
git add docs/brainstorms/2026-07-24-navigator-tabs-unification-brainstorm.md
git commit -m "docs(brainstorm): record sliding-indicator resolution"
```

---

## Deferred, deliberately

- **`Navigator.Pane` on Base UI `ScrollArea`.** Independent subsystem; needs its own plan. The `collapseNav` scroll listener currently reads `scrollTop` on the pane and would have to move to ScrollArea's viewport element.
- **Adding variants _to_ `Tabs`.** The brainstorm's step 3 (icon-stack tab layout, floating pill skin as new Tabs variants) presupposed Navigator consuming Tabs. With the direction reversed, adding those to `Tabs` would be speculative API with no consumer — YAGNI. Step 4 (shared skin vocabulary) _is_ adopted, but one-way: Navigator imports Tabs' existing class strings in Task 6. `Tabs/variants.ts` is not modified.
- **Unifying `Tabs.Tab`'s smart-href with Navigator's.** They are different contracts: `Tabs.Tab` synthesizes a Base UI `render` prop and flips `nativeButton`; Navigator forks between `RoadieRoutedLink` and `<button>` directly. Task 1 unifies Navigator's two copies, which is the real duplication.
