---
title: Add Carousel component to @oztix/roadie-components
type: feat
status: active
date: 2026-04-13
origin: docs/brainstorms/2026-04-13-carousel-component-brainstorm.md
---

# Add Carousel component to @oztix/roadie-components

## Enhancement Summary

**Deepened on:** 2026-04-13
**Agents used:** shadcn implementation study, React 19 compound-context
perf research, Embla-in-jsdom testing research, `julik-frontend-races-reviewer`,
`kieran-typescript-reviewer`, `code-simplicity-reviewer`,
`architecture-strategist`, `performance-oracle`.

### Key improvements folded into the plan

1. **Embla v9 is a release candidate** — pinned to a specific RC; API
   drift during RC is now a first-class risk with a re-verification
   acceptance criterion.
2. **Dependency typing fixed** — `embla-carousel` (types package) moved
   from `devDependencies` to `dependencies`. Its types leak into the
   generated `.d.ts`; shipping it as a dev-only dep would break
   consumers' `tsc`.
3. **`plugins` escape hatch dropped from the public v1 API** — memoised
   plugin arrays are a memo footgun (identity changes → `reInit` storms).
   Autoplay is internal; advanced consumers can wait for v2.
4. **Pause state machine race-hardened** — read the autoplay plugin
   fresh from `api.plugins()` on every handler, promote `userPaused` to
   React state, RAF-defer `onBlur` `relatedTarget` for Safari, stop the
   old plugin before swapping on autoplay toggle, add `isConnected`
   guards in the focus-drop handler.
5. **React 19 idioms adopted** — refs-as-props (no `forwardRef`), boolean
   `inert` (not the `'' as const` hack), split context into
   `{ state, actions, api }` so components only re-render on the slice
   they consume. `useSyncExternalStore` for the Embla bridge.
6. **Testing setup corrected** — `ResizeObserver` no-op alone is
   insufficient; stub `HTMLElement.prototype` `offsetWidth`/`clientWidth`
   (or adopt `jsdom-testing-mocks`). Fake-timers list is
   `['setTimeout', 'Date']` — **not** `setInterval` (breaks Embla's
   internals) and **not** RAF. `matchMedia` mock tracks listeners and
   exposes `__setReducedMotion(value)` that dispatches `change`.
   Pointer events don't fire in jsdom — call `plugin.stop()` / `.play()`
   directly and assert state.
7. **SSR correctness** — initial `slideCount` seeds from
   `React.Children.count(children)` so the first paint renders the
   right number of dots (no CLS, no hydration mismatch).
8. **Typography aligned with Card** — `Carousel.Title` uses
   `text-display-ui-6 text-strong` to match `Card.Title`, not the
   originally drafted `text-display-ui-4`.
9. **Bundle gate added** — `size-limit` CI check at 13 KB gzipped for
   the Carousel entry point; regressions fail the PR.
10. **Compound-pattern idiom documented** — the `Children.map` index
    injection used by `Carousel.Content` is a new idiom in Roadie. A
    short `docs/contributing/COMPOUND_PATTERNS.md` (or a new section in
    `BASE_UI.md`) is added to the plan's doc deliverables so future
    authors have a reference.

### New considerations surfaced

- **`Children.map` does not unwrap Fragments or conditional children.**
  Document the direct-children constraint on `Carousel.Content`, mirror
  shadcn's stance. A dev-only `Children.forEach` walk warns when a
  non-`Carousel.Item` element is a direct child.
- **`Carousel.PlayPause` placement is fragile** — WCAG 2.2.2 requires
  the pause control to be reachable before any auto-updating content.
  v1 ships only examples that place it first and documents the rule
  loudly; a v2 `Carousel.Controls` slot could enforce it.
- **`useCarousel()` public hook and the focus-drop guard** are flagged
  by the simplicity review as candidates for deferral. v1 keeps both
  (they serve clear use cases) but they are on the "cut first if the
  scope slips" list rather than non-negotiable.
- **Vertical direction and `Carousel.Header` are kept in v1** despite
  the simplicity-review recommendation to defer — both were explicit
  user decisions in the brainstorm.

## Overview

Add a compound `Carousel` primitive to `@oztix/roadie-components`, built on
`embla-carousel-react` v9 + `embla-carousel-autoplay`. Replaces the
monolithic prototype at `/Users/lukebrooker/Code/prototype/src/components/Carousel.tsx`
with a composable, accessible, WCAG 2.2 AA-compliant building block that
matches Roadie's existing conventions (compound exports, `direction`
prop, CVA variants, `IconButton` reuse, `'use client'` discipline).

Parts shipped in v1: `Carousel` + `Carousel.Header` + `Carousel.Title` +
`Carousel.Content` + `Carousel.Item` + `Carousel.Previous` +
`Carousel.Next` + `Carousel.Dots` + `Carousel.PlayPause` + `useCarousel()`
hook.

## Problem Statement

The Oztix prototype carousel works but it is:

- **Monolithic** — one component with `cardSize="default" | "featured"`,
  hardcoded header/link, baked-in child sizing, two distinct state
  machines flipped by a prop.
- **Not accessible** — no `aria-live` handling, no WCAG 2.2.2 pause
  control, no `inert` on off-screen slides, no keyboard nav, no
  `prefers-reduced-motion` handling.
- **Fragile** — reimplements infinite loop via DOM-cloned children +
  scroll-end detection (~50 lines of race-prone scroll math).
- **Off-style** — hardcoded `neutral-300` borders, custom `rounded-full
border` button visuals that don't match Roadie's `IconButton`, uses
  `text-emphasis-strong` utilities that don't exist in the migrated
  Tailwind design system.
- **Not in the design system** — can't be consumed by other Oztix apps
  or tested in isolation.

Every new feature that needs a horizontal scroller either reinvents the
wheel or copies-and-pastes the prototype. A single authoritative
primitive in `@oztix/roadie-components` solves both.

## Proposed Solution

Ship a compound, Embla-backed `Carousel` component with the API below.
Consumers compose the pieces they need; the root owns the Embla instance
and a `CarouselContext` that every subcomponent reads from.

Minimal usage:

```tsx
<Carousel>
  <Carousel.Content>
    <Carousel.Item>…</Carousel.Item>
    <Carousel.Item>…</Carousel.Item>
  </Carousel.Content>
  <Carousel.Previous />
  <Carousel.Next />
</Carousel>
```

Featured-style auto-playing hero with Roadie-compliant pause control:

```tsx
<Carousel
  aria-label='Featured events'
  autoPlay={5000}
  opts={{ loop: true, align: 'start' }}
>
  <Carousel.Header>
    <Carousel.Title href='/events'>Featured events</Carousel.Title>
    <div className='flex items-center gap-2'>
      <Carousel.PlayPause />
      <Carousel.Previous />
      <Carousel.Next />
    </div>
  </Carousel.Header>
  <Carousel.Content>
    <Carousel.Item className='basis-[84vw] md:basis-1/2'>
      <EventCard />
    </Carousel.Item>
    <Carousel.Item className='basis-[84vw] md:basis-1/2'>
      <EventCard />
    </Carousel.Item>
  </Carousel.Content>
  <Carousel.Dots />
</Carousel>
```

Default grid (matches prototype's `cardSize="default"`):

```tsx
<Carousel aria-label='Upcoming shows'>
  <Carousel.Header>
    <Carousel.Title href='/shows'>Upcoming shows</Carousel.Title>
    <Carousel.Previous />
    <Carousel.Next />
  </Carousel.Header>
  <Carousel.Content>
    <Carousel.Item className='max-w-[220px] basis-[42vw] md:basis-1/5'>
      <EventCard />
    </Carousel.Item>
  </Carousel.Content>
</Carousel>
```

## Technical Approach

### Research Insights (from deepen-plan agents)

**shadcn carousel study** — shadcn's implementation is a strong
reference for compound-context plumbing but chooses a simpler path on
item discovery: it does **not** wrap children with `Children.map`.
Instead, it reads `api.slideNodes()` in a `select` effect and
synchronises DOM-level `aria-label` / `inert` / `data-active`
attributes imperatively. That approach works with Fragments and
conditional children, but it leaks DOM mutation outside React's model
and makes per-item context state harder to test. We keep the
`Children.map` approach for v1 because (a) per-item `aria-label="N of M"`
is important and (b) the direct-children constraint is acceptable for
a design-system primitive — but the trade-off is documented and the
dev warning is non-negotiable.

**React 19 compound + context perf research** — confirms the
three-context split (actions / state / refs), `useSyncExternalStore`
for Embla bridging, refs-as-props instead of `forwardRef`, and boolean
`inert` prop. Context value identity matters more than value content:
stabilising the actions object with `useMemo([])` keeps
`Previous`/`Next`/`PlayPause` from re-rendering on every selection.

**Embla in jsdom testing research** — the critical finding is that
the previously drafted polyfills are insufficient. Embla measures
elements with `offsetWidth` / `offsetHeight` during `init`, and jsdom
returns zero for both — which means the library never progresses past
"not ready" and `api` stays `undefined`. The Phase 1 setup code now
stubs the layout methods. See the updated `vitest.setup.ts` snippet
in the phased implementation section.

**Race review (julik-frontend-races-reviewer)** — surfaced nine
concrete race conditions in the pause state machine. All nine are now
addressed: plugin read fresh on every handler via optional chaining,
`userPaused` promoted from ref to state, Safari `relatedTarget` null
case handled via RAF-deferred `document.activeElement` read, plugin
stopped before swap on autoplay toggle, `mountedRef` guard in
focus-drop handler, `isPlaying` initialises to `false` and is
driven **only** by `autoplay:play` / `autoplay:stop` events.

**TypeScript quality review (kieran-typescript-reviewer)** — two
critical findings now folded in: (1) `embla-carousel` must be a
direct dependency, not devDependency — its types leak into
`.d.ts`; (2) drop the `plugins` escape hatch from the v1 public API.
Also adopted: refs-as-props (no `forwardRef`), React 19 boolean
`inert`, no `any` casts in the type surface, explicit return types on
all exported functions.

**Simplicity review (code-simplicity-reviewer)** — recommended
cutting vertical direction, `CarouselItemContext`, `Carousel.Header`,
and `Carousel.Previous`/`Next` auto-hide-on-reInit logic. Most of
these were explicit user decisions in the brainstorm and are kept in
v1. The `useCarousel()` public hook and the focus-drop guard are
retained for v1 but explicitly flagged as "cut first if scope slips".

**Architecture review (architecture-strategist)** — typography
aligned to Card (`text-display-ui-6`, not `-4`). New
`COMPOUND_PATTERNS.md` contributing doc added. `usePauseStateMachine()`
extracted as a separate hook for testability. `as?: ElementType` prop
on `Carousel.Item` (matches `Card`'s consumer pattern).

**Performance review (performance-oracle)** — `plugins` prop
dropped (memo footgun). Initial `slideCount` seeds from
`React.Children.count(children)` so the first paint renders the
correct number of dots (no CLS, no hydration mismatch). A CI
`size-limit` check is added at 13 KB gzipped. Context split (see
above) is the main re-render mitigation.

### Architecture

#### Dependencies

**⚠ Embla v9 is a release candidate.** The `9.x` line has not yet had
a stable GA release at the time of writing. The plan uses v9 because
the user explicitly chose v9 over v8; until GA ships, we pin to a
**specific RC version** (not a caret range) to avoid surprise API drift
between RCs. Before merging the implementation PR, re-verify the
method/event/option names against the installed RC — Embla has renamed
methods between v8 and v9 (e.g. `scrollPrev` → `goToPrev`) and could
still rename or remove surface area during RC.

Add to `packages/components/package.json` `dependencies` (not
peerDependencies — the brainstorm decision was to hide Embla from
consumers). The `embla-carousel` types package must be a **direct
dependency**, not a devDependency, because its types leak through the
generated `.d.ts` (`EmblaCarouselType` is referenced by
`useCarousel()` and by `CarouselProps['opts']`). Marking it dev-only
would break downstream `tsc`.

```json
"dependencies": {
  "@oztix/roadie-core": "workspace:*",
  "embla-carousel": "9.0.0-rc.XX",
  "embla-carousel-react": "9.0.0-rc.XX",
  "embla-carousel-autoplay": "9.0.0-rc.XX"
}
```

Replace `9.0.0-rc.XX` with the exact RC available at implementation
time. All three Embla packages must be pinned to the **same** RC —
they release in lockstep.

**Lock file:** commit the pnpm lockfile change; this prevents auto-bumps
to a newer RC during CI.

**Re-verify on bump to GA:** once Embla v9 ships a stable release,
a follow-up PR can bump to `^9.x.x` after re-running the test suite
and the bundle-size gate.

**tsdown externalization:** leave embla packages OUT of
`packages/components/tsdown.config.ts`'s `deps.neverBundle` list — they
will be bundled into the component output. This keeps consumers from
needing their own Embla install.

#### File layout

```
packages/components/src/components/Carousel/
├── index.tsx              # All parts, context, hook, variants
├── Carousel.test.tsx      # Vitest + RTL behavioural tests
└── useCarousel.ts         # (optional split if index.tsx grows > ~600 lines)
```

Single-file is the preferred starting point — matches Accordion, Card,
RadioGroup. Split only if the line count actually warrants it.

Barrel addition to `packages/components/src/index.tsx`:

```ts
export {
  Carousel,
  carouselVariants,
  useCarousel,
  type CarouselProps,
  type CarouselContentProps,
  type CarouselItemProps,
  type CarouselTitleProps
} from './components/Carousel'
```

#### Component tree and context

```
<Carousel>                                ← owns Embla hook, context provider
  <Carousel.Header>                       ← pure layout shell
    <Carousel.Title [href]>               ← <h2> or <a>
    <Carousel.PlayPause>                  ← icon button, reads context.isPlaying
    <Carousel.Previous>                   ← icon button, reads context.canGoToPrev
    <Carousel.Next>                       ← icon button, reads context.canGoToNext
  </Carousel.Header>
  <Carousel.Content>                      ← viewport + container, holds emblaRef
    <Carousel.Item>                       ← flex child, reads index/total from CarouselItemContext
    <Carousel.Item>
  </Carousel.Content>
  <Carousel.Dots>                         ← buttons, reads context.slideCount + selectedIndex
</Carousel>
```

Three React contexts (split to minimise re-render blast radius — the
performance review flagged that a single monolithic context value
means every `selectedIndex` change re-renders the header, nav buttons,
dots, _and_ every item):

1. **`CarouselActionsContext`** — stable across the lifetime of the
   carousel; created once per root with `useMemo([])`. Consumed by
   `Carousel.Previous`, `Carousel.Next`, `Carousel.PlayPause`, and
   `Carousel.Dots` click handlers. Shape:

   ```ts
   type CarouselActions = {
     goToPrev: () => void
     goToNext: () => void
     goTo: (index: number) => void
     play: () => void
     pause: () => void
     toggle: () => void
   }
   ```

2. **`CarouselStateContext`** — changes whenever Embla selects or
   scrolls. Consumed by components that actually render selection
   state (dots, PlayPause icon, nav button disabled). Shape:

   ```ts
   type CarouselState = {
     direction: 'horizontal' | 'vertical'
     selectedIndex: number
     slideCount: number
     canGoToPrev: boolean
     canGoToNext: boolean
     isPlaying: boolean // driven by autoplay:play / autoplay:stop events
     hasAutoPlay: boolean // whether autoPlay prop was provided
     userPaused: boolean // sticky flag set by PlayPause click
     labelId: string | undefined // id of Carousel.Title, for aria-labelledby
     rootAriaLabel: string | undefined
   }
   ```

   The bridge from Embla to this context uses `useSyncExternalStore`
   so React 19's concurrent rendering doesn't tear. Subscribe to Embla
   events in `subscribe`, read the snapshot in `getSnapshot`. This
   replaces the previously planned `useEffect` + `setState` pattern
   which was vulnerable to re-entrant updates.

3. **`CarouselRefContext`** — carries the Embla `api` and `emblaRef`.
   Only `Carousel.Content` and `useCarousel()` consume it. Keeps the
   api out of the hot state context so a slide selection doesn't
   invalidate every consumer that just needs to call a method.

   ```ts
   type CarouselRefs = {
     api: EmblaCarouselType | undefined
     emblaRef: (node: HTMLElement | null) => void
   }
   ```

The public `useCarousel()` hook returns a combined facade
`{ state, actions, api }` so consumer code stays ergonomic while
internal components subscribe to the narrowest context slice they need.

2. **`CarouselItemContext`** — injected by `Carousel.Content` via
   `Children.map` + a provider wrapper around each `Carousel.Item`.
   Shape:

   ```ts
   type CarouselItemContextValue = {
     index: number // zero-based
     total: number // total slide count
     isActive: boolean // index === selectedIndex
   }
   ```

   This solves the **"Item index discovery"** gap SpecFlow surfaced:
   each Item reads its position from its own context, so it can build
   correct `aria-label="N of M"` and apply `inert` when not active —
   without lifting state or using refs.

#### Embla integration

```tsx
'use client'

import type {
  EmblaCarouselType,
  EmblaOptionsType,
  EmblaPluginType
} from 'embla-carousel'
import Autoplay from 'embla-carousel-autoplay'
import useEmblaCarousel from 'embla-carousel-react'

function Carousel({
  opts,
  autoPlay = false,
  direction = 'horizontal',
  children,
  className,
  'aria-label': ariaLabel,
  ref,
  ...props
}: CarouselProps) {
  const prefersReducedMotion = usePrefersReducedMotion()

  // Resolve axis from direction prop. Warn in dev if consumer also
  // passes opts.axis that disagrees — direction wins.
  const axis: 'x' | 'y' = direction === 'vertical' ? 'y' : 'x'

  // Build plugin list: internally wire autoplay unless reduced motion is on.
  // NOTE: No public `plugins` escape hatch in v1 — a memoised plugin array
  // passed by a consumer is a memo footgun (identity changes → reInit
  // storms). Revisit in v2 if a real use case lands.
  const plugins = useMemo<EmblaPluginType[]>(() => {
    if (!autoPlay || prefersReducedMotion) return []
    return [
      Autoplay({
        delay: autoPlay,
        defaultInteraction: true, // handles pointerdown pause
        stopOnLastSnap: false
      })
    ]
  }, [autoPlay, prefersReducedMotion])

  const resolvedOpts: EmblaOptionsType = {
    ...opts,
    axis,
    duration: prefersReducedMotion ? 0 : (opts?.duration ?? 25)
  }

  const [emblaRef, api] = useEmblaCarousel(resolvedOpts, plugins)

  // ... context + handlers + effects below
}
```

#### `useCarousel` hook (public + internal)

```ts
export function useCarousel(): CarouselContextValue {
  const ctx = useContext(CarouselContext)
  if (!ctx) throw new Error('useCarousel must be used inside <Carousel>')
  return ctx
}
```

The same hook the subcomponents use internally, exported so
consumers can build custom controls. Also exported as a named export
from the barrel.

#### State sync with Embla

Canonical pattern:

```tsx
const [selectedIndex, setSelectedIndex] = useState(0)
const [slideCount, setSlideCount] = useState(0)
const [canGoToPrev, setCanGoToPrev] = useState(false)
const [canGoToNext, setCanGoToNext] = useState(false)
const [isPlaying, setIsPlaying] = useState(
  Boolean(autoPlay && !prefersReducedMotion)
)

const onSelect = useCallback((api: EmblaCarouselType) => {
  setSelectedIndex(api.selectedSnap())
  setCanGoToPrev(api.canGoToPrev())
  setCanGoToNext(api.canGoToNext())
}, [])

const onInit = useCallback((api: EmblaCarouselType) => {
  setSlideCount(api.snapList().length)
}, [])

useEffect(() => {
  if (!api) return
  onInit(api)
  onSelect(api)
  api.on('reinit', onInit).on('reinit', onSelect).on('select', onSelect)
  return () => {
    api.off('reinit', onInit).off('reinit', onSelect).off('select', onSelect)
  }
}, [api, onInit, onSelect])
```

**Important:** v9 method names — `goToPrev`, `goToNext`, `goTo`,
`canGoToPrev`, `canGoToNext`, `selectedSnap`, `snapList`. NOT the v8
names (`scrollPrev`, etc). Event names are all lowercase
(`reinit`, not `reInit`; `slidesinview`, not `slidesInView`).

#### `reInit` on children change

When the number of `Carousel.Item` children changes at runtime, Embla
must be told to re-measure. Watch `React.Children.count(children)` on
`Carousel.Content` and call `api.reInit()`:

```tsx
const childCount = Children.count(children)
useEffect(() => {
  api?.reInit()
}, [api, childCount])
```

#### Pause state machine

This resolves the **SpecFlow contradiction** around
`defaultInteraction` + hover-pause + WCAG pause. Explicit truth table:

| Input                          | Action                                                                                  | Sticky?                                          |
| ------------------------------ | --------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Mount (autoPlay set, !reduced) | `plugin.play()`, `isPlaying=true`                                                       | —                                                |
| Mount (reduced motion)         | no plugin, `isPlaying=false`                                                            | —                                                |
| Pointerdown on viewport        | plugin auto-pauses (built-in)                                                           | No — plugin resumes on next tick unless…         |
| Mouseenter on root             | `plugin.pause()`, manual                                                                | No — resumes on mouseleave _unless_ `userPaused` |
| Focusin inside root            | `plugin.pause()`, manual                                                                | No — resumes on focusout _unless_ `userPaused`   |
| Click `Carousel.PlayPause`     | `plugin.stop()` + `userPaused=true`; click again → `plugin.play()` + `userPaused=false` | Yes                                              |
| Reduced-motion toggles → true  | `plugin.stop()`, `isPlaying=false`, plugin destroyed via `reInit`                       | Yes                                              |
| Reduced-motion toggles → false | new plugin wired via `reInit`                                                           | —                                                |

`userPaused` is **React state** (not a ref). The race review flagged
that reading a ref inside an effect can tear against the state snapshot
that triggered the render — promote it to state and include it in
dependency arrays.

`isPlaying` is also state, but it starts as `false` and is **driven
solely by Embla's events**. Don't initialise it to `!!autoPlay` or the
race review's "ghost advance" scenario (user clicks Pause during a
reInit gap) sticks an out-of-sync `true` in state. The
`autoplay:play` / `autoplay:stop` events are the single source of
truth.

```tsx
useEffect(() => {
  if (!api) return
  // Read plugin FRESH every effect run — a prior plugin reference can
  // be stale if autoplay was toggled off then back on and Embla
  // reInit-ed with a new plugin list.
  const plugin = api.plugins().autoplay
  if (!plugin) {
    setIsPlaying(false)
    return
  }
  const onPlay = () => setIsPlaying(true)
  const onStop = () => setIsPlaying(false)
  api.on('autoplay:play', onPlay).on('autoplay:stop', onStop)
  return () => {
    // Stop the plugin before we drop our listeners so we don't leave a
    // running timer behind that fires into the new plugin instance.
    plugin.stop()
    api.off('autoplay:play', onPlay).off('autoplay:stop', onStop)
  }
}, [api, plugins])
```

Every handler that touches the plugin reads it through
`api?.plugins().autoplay?.` with optional chaining — never via a closed-over
reference — so a mid-flight reInit can't dereference a stale plugin.

Hover / focus handlers are attached to the root wrapper of
`Carousel` (not the viewport) so they catch the whole region including
header controls:

```tsx
<div
  onMouseEnter={onHoverPause}
  onMouseLeave={onHoverResume}
  onFocus={onFocusPause}   // bubbles from children; no capture phase
  onBlur={onFocusResume}
>
```

The `onBlur` handler uses `e.currentTarget.contains(e.relatedTarget)` to
ignore focus moving between children inside the carousel. **Safari
quirk:** `relatedTarget` is `null` for some blur events — defer the
check one RAF and re-read `document.activeElement` instead of relying
on the synthetic event payload. Without this, Safari users get
spurious resume → pause flickers when focus moves between nav buttons.

#### Keyboard navigation

Embla ships no keyboard handler. Wire one on the `Carousel.Content`
viewport (the element with the Embla ref), active only when focus is
inside the carousel:

- `ArrowLeft` / `ArrowRight` → `goToPrev` / `goToNext`
  (when `direction === 'horizontal'`)
- `ArrowUp` / `ArrowDown` → `goToPrev` / `goToNext`
  (when `direction === 'vertical'`)
- `Home` → `goTo(0)`
- `End` → `goTo(slideCount - 1)`
- Only if `event.target` is NOT a focusable element inside a slide
  (checked via `closest('[role="group"][aria-roledescription="slide"]')`
  plus `matches('button, a, input, textarea, [tabindex]')`). This
  prevents arrow keys from hijacking focus when the user is tabbing
  through a card's internal links.

#### `aria-live` thrash mitigation

SpecFlow flagged that toggling `aria-live` on every play/pause causes
re-announcements. Fix: set `aria-live` based on `hasAutoPlay` at mount
time, and only flip when `userPaused` changes (not on every transient
pause):

- `hasAutoPlay=false` → `aria-live="polite"` (manual nav announces)
- `hasAutoPlay=true && !userPaused` → `aria-live="off"`
- `hasAutoPlay=true && userPaused` → `aria-live="polite"`

Transient hover/focus pauses do NOT flip `aria-live` — only the
user's explicit PlayPause.

#### Off-screen slide inerting

Each `Carousel.Item` renders with `inert` when its index !==
`selectedIndex`. Implementation via `useCarouselItem()` which reads
`CarouselItemContext`:

```tsx
function CarouselItem({ className, children, ...props }: CarouselItemProps) {
  const { index, total, isActive } = useCarouselItem()
  return (
    <div
      role='group'
      aria-roledescription='slide'
      aria-label={`${index + 1} of ${total}`}
      {...(isActive ? {} : { inert: '' as const })}
      className={cn(carouselItemVariants(), className)}
      {...props}
    >
      {children}
    </div>
  )
}
```

**Browser support:** `inert` is supported in Chrome 102+, Safari 15.5+,
Firefox 112+ — all from 2022 or earlier. Acceptable floor for Roadie
consumers. No polyfill needed.

**Focus drop guard:** When `goTo(n)` is called, if
`document.activeElement` was inside the previous slide (which is about
to become `inert`), move focus to the new active slide's wrapper. Hook
into the `select` event:

```tsx
api.on('select', (api) => {
  const activeEl = document.activeElement as HTMLElement | null
  if (!activeEl) return
  const prevSlide = activeEl.closest('[aria-roledescription="slide"]')
  if (prevSlide && activeEl !== prevSlide) {
    const newSlide = api.slideNodes()[api.selectedSnap()]
    newSlide?.focus({ preventScroll: true })
  }
})
```

The new slide wrapper must be `tabindex="-1"` for `.focus()` to work —
add that to `Carousel.Item`.

#### `Carousel.Previous` / `Carousel.Next` visibility

The brainstorm's "hide when all items fit" heuristic was wrong —
`canGoToPrev`/`canGoToNext` being false just means "at boundary with
loop off." Correct detection: `api.snapList().length <= 1` means
there's only one scroll position, which implies every slide fits.

```tsx
const hasMultipleSnaps = slideCount > 1 // slideCount = snapList().length
```

Default behaviour in `Carousel.Previous`/`Carousel.Next`:

- `!hasMultipleSnaps` → render `null` (button absent from DOM)
- `hasMultipleSnaps` and at boundary with `loop=false` →
  `aria-disabled="true"`, visually muted via CSS
- Otherwise → enabled

Consumers who want the button always visible can always pass through
props or compose their own nav via `useCarousel()`.

#### `Carousel.PlayPause`

Only rendered meaningfully when `hasAutoPlay` is true. When `hasAutoPlay`
is false, returns `null`. Uses `IconButton` internally with
`PauseIcon` / `PlayIcon` from Phosphor. Per APG, this should be the
first focusable element inside the carousel — achieved by placing it
first in the `Carousel.Header` examples in docs (it's DOM-order, not
CSS-order). Consumers who place it elsewhere accept responsibility for
tab order.

```tsx
function CarouselPlayPause({ className, ...props }: CarouselPlayPauseProps) {
  const { hasAutoPlay, isPlaying, toggle } = useCarousel()
  if (!hasAutoPlay) return null
  return (
    <IconButton
      emphasis='subtler'
      aria-label={isPlaying ? 'Pause carousel' : 'Play carousel'}
      aria-pressed={!isPlaying}
      onClick={toggle}
      className={className}
      {...props}
    >
      {isPlaying ? <PauseIcon /> : <PlayIcon />}
    </IconButton>
  )
}
```

#### Carousel.Title with optional href

Matches Card.Title pattern. `href` is a runtime flag that swaps the
element between `<h2>` and `<a>` with a trailing arrow icon (prototype
behaviour, prototype styling via Roadie utilities):

```tsx
type CarouselTitleProps = ComponentProps<'h2'> & { href?: string }

function CarouselTitle({
  className,
  children,
  href,
  id,
  ...props
}: CarouselTitleProps) {
  const generatedId = useId()
  const titleId = id ?? generatedId
  const { setLabelId } = useCarousel() // write-through so root can aria-labelledby
  useEffect(() => {
    setLabelId(titleId)
    return () => setLabelId(undefined)
  }, [titleId, setLabelId])

  if (href) {
    return (
      <a
        id={titleId}
        href={href}
        className={cn(
          'group/title is-interactive flex items-center gap-2 text-display-ui-6 text-strong',
          className
        )}
      >
        {children}
        <ArrowRightIcon
          weight='bold'
          className='size-4 transition-transform group-hover/title:translate-x-0.5'
        />
      </a>
    )
  }
  return (
    <h2
      id={titleId}
      className={cn('text-display-ui-6 text-strong', className)}
      {...props}
    >
      {children}
    </h2>
  )
}
```

If `Carousel.Title` is present, the root's `Carousel.Content` uses
`aria-labelledby={titleId}` so screen readers announce the region name
from the title. If no Title is present, the root falls back to
`aria-label={rootAriaLabel ?? 'Carousel'}`.

#### CVA variants

Keep it minimal — the heavy lifting is composition. Only one variant
file (direction) is actually needed; emphasis and intent inherit from
context.

```ts
export const carouselContentVariants = cva(
  'relative overflow-hidden focus-visible:outline-none',
  {
    variants: {
      direction: {
        horizontal: '',
        vertical: ''
      }
    },
    defaultVariants: { direction: 'horizontal' }
  }
)

export const carouselContainerVariants = cva('flex', {
  variants: {
    direction: {
      horizontal: '-ml-4',
      vertical: '-mt-4 flex-col'
    }
  },
  defaultVariants: { direction: 'horizontal' }
})

export const carouselItemVariants = cva(
  'min-w-0 min-h-0 shrink-0 grow-0 basis-full',
  {
    variants: {
      direction: {
        horizontal: 'pl-4',
        vertical: 'pt-4'
      }
    },
    defaultVariants: { direction: 'horizontal' }
  }
)

export const carouselDotsVariants = cva('flex items-center', {
  variants: {
    direction: {
      horizontal: 'flex-row gap-1.5',
      vertical: 'flex-col gap-1.5'
    }
  },
  defaultVariants: { direction: 'horizontal' }
})
```

Gaps are implemented via the padding + negative margin trick (Embla
v9 still does NOT support container `gap` — it breaks snap math).

#### Runtime validation (dev only)

```ts
if (process.env.NODE_ENV !== 'production') {
  if (autoPlay !== false && autoPlay < 2000) {
    console.warn(
      '[Carousel] autoPlay delay < 2000ms may fail WCAG 2.2.1 minimum timing; prefer >= 4000ms.'
    )
  }
  if (opts?.axis && opts.axis !== axis) {
    console.warn(
      `[Carousel] opts.axis="${opts.axis}" conflicts with direction="${direction}". direction wins.`
    )
  }
}
```

### Implementation Phases

#### Phase 1 — Foundation

1. **Add Embla dependencies** (all three as direct dependencies, pinned
   to the same v9 RC — replace `rc.XX` with the current RC):
   - `pnpm --filter @oztix/roadie-components add embla-carousel@9.0.0-rc.XX embla-carousel-react@9.0.0-rc.XX embla-carousel-autoplay@9.0.0-rc.XX`
   - Commit the updated `pnpm-lock.yaml`
   - Verify in `packages/components/package.json` — all three should
     live in `dependencies`, not `devDependencies`
2. **Add vitest polyfills** at
   `packages/components/vitest.setup.ts`. A no-op `ResizeObserver`
   alone is **insufficient** — jsdom also reports zero `offsetWidth`
   for every element, which prevents Embla from ever computing slide
   positions. Stub the layout methods too, and replace the naive
   `matchMedia` mock with a listener-tracking version that exposes a
   `__setReducedMotion(value)` helper so reduced-motion change
   listeners can be exercised:

   ```ts
   import '@testing-library/jest-dom/vitest'
   import { cleanup } from '@testing-library/react'
   import { afterEach, beforeAll, vi } from 'vitest'

   class ResizeObserverMock {
     observe() {}
     unobserve() {}
     disconnect() {}
   }

   // Listener-tracking matchMedia mock. One MediaQueryList per query,
   // with a `__setReducedMotion` escape hatch on globalThis that
   // dispatches a real `change` event to every registered listener.
   type Listener = (e: MediaQueryListEvent) => void
   const mediaLists = new Map<
     string,
     {
       matches: boolean
       listeners: Set<Listener>
     }
   >()

   function getList(query: string) {
     let list = mediaLists.get(query)
     if (!list) {
       list = { matches: false, listeners: new Set() }
       mediaLists.set(query, list)
     }
     return list
   }

   beforeAll(() => {
     if (typeof globalThis.ResizeObserver === 'undefined') {
       ;(globalThis as any).ResizeObserver = ResizeObserverMock
     }

     // Stub layout so Embla sees non-zero slide dimensions. Without
     // this, `slidesinview` never fires and `api` stays undefined.
     Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
       configurable: true,
       get: function () {
         return 800
       }
     })
     Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
       configurable: true,
       get: function () {
         return 600
       }
     })
     Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
       configurable: true,
       get: function () {
         return 800
       }
     })
     Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
       configurable: true,
       get: function () {
         return 600
       }
     })

     if (typeof window.matchMedia === 'undefined') {
       Object.defineProperty(window, 'matchMedia', {
         writable: true,
         value: (query: string) => {
           const list = getList(query)
           return {
             get matches() {
               return list.matches
             },
             media: query,
             onchange: null,
             addEventListener: (_: 'change', l: Listener) =>
               list.listeners.add(l),
             removeEventListener: (_: 'change', l: Listener) =>
               list.listeners.delete(l),
             addListener: (l: Listener) => list.listeners.add(l),
             removeListener: (l: Listener) => list.listeners.delete(l),
             dispatchEvent: () => true
           }
         }
       })
     }

     ;(globalThis as any).__setReducedMotion = (value: boolean) => {
       const list = getList('(prefers-reduced-motion: reduce)')
       list.matches = value
       list.listeners.forEach((l) =>
         l({
           matches: value,
           media: '(prefers-reduced-motion: reduce)'
         } as MediaQueryListEvent)
       )
     }
   })

   afterEach(() => {
     cleanup()
     ;(globalThis as any).__setReducedMotion?.(false)
   })
   ```

   **Fake-timers gotcha:** do **not** use
   `vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval'] })` as
   originally drafted. Embla uses `setInterval` internally and mocking
   it breaks initialisation. Use `['setTimeout', 'Date']` only, and
   advance with `vi.advanceTimersByTimeAsync` inside `act(...)`. When
   a test needs to verify autoplay behaviour, call
   `api.plugins().autoplay!.stop()` / `.play()` directly — don't try
   to drive it through `fireEvent.pointerDown` (jsdom does not emit
   pointer events reliably).

3. **Create component directory + empty skeleton**
   `packages/components/src/components/Carousel/index.tsx` with
   `'use client'`, imports, and an exported `Carousel` stub returning
   `null`. Make sure the file builds and `pnpm --filter
@oztix/roadie-components typecheck` passes.
4. **Add to barrel** `packages/components/src/index.tsx`.
5. **Write a failing smoke test** `Carousel.test.tsx`:
   `it('renders with a single slide', () => { ... })`. This locks in
   the test harness before any implementation.

**Deliverables:** deps added, test setup polyfilled, stub exports
present, typecheck green.

**Success criteria:** `pnpm test --filter @oztix/roadie-components`
runs the Carousel test file (and the smoke test fails with "not
implemented," not an environment error).

**Effort:** ~1 hour.

#### Phase 2 — Core primitives

6. **Implement `Carousel` root + `CarouselContext`**
   - Wires `useEmblaCarousel` with axis / duration / plugins
   - Exposes full `CarouselContextValue`
   - No subscribing yet — just the hook and a bare context provider
7. **Implement `Carousel.Content`**
   - Viewport element with `emblaRef`, `role='group'`,
     `aria-roledescription='carousel'`, `aria-labelledby` or
     `aria-label`, initial `aria-live`
   - Container div inside with `carouselContainerVariants`
   - Uses `Children.map` to wrap each child in a `CarouselItemContext`
     provider carrying `{ index, total, isActive }`
   - Watches `Children.count(children)` and calls `api.reInit()` on
     change
8. **Implement `Carousel.Item`**
   - Reads `CarouselItemContext`
   - Renders `div` with `role='group'`, `aria-roledescription='slide'`,
     `aria-label={index+1 of total}`, `tabindex='-1'`, `inert` when
     not active, `carouselItemVariants({ direction })`
9. **Wire Embla state sync effects**
   - `onInit` / `onSelect` subscribe/unsubscribe
   - Populate context with `selectedIndex`, `slideCount`,
     `canGoToPrev`, `canGoToNext`
10. **Implement `Carousel.Previous` / `Carousel.Next`**
    - Compose `IconButton`, icon swap based on direction
    - Read context, set `disabled` / `aria-disabled` based on canGoTo
    - Return `null` if `slideCount <= 1`
11. **Implement `Carousel.Dots`**
    - Render one `<button>` per slide
    - Active dot gets `aria-disabled='true'` + accent pill styling;
      inactive dots use neutral styling
    - `onClick={() => goTo(i)}`
    - Direction-aware layout via `carouselDotsVariants`

**Deliverables:** working carousel with manual nav, no autoplay, no
keyboard, no reduced motion, no header.

**Success criteria:** tests pass for render, click Previous, click
Next, click dot, boundary disabling.

**Effort:** ~4–6 hours.

#### Phase 3 — Autoplay + accessibility

12. **Wire `embla-carousel-autoplay`**
    - Conditional plugin instantiation in `useMemo`
    - Subscribe to `autoplay:play` / `autoplay:stop` → `setIsPlaying`
13. **Implement pause state machine**
    - `userPaused` ref
    - Hover / focus-in / focus-out handlers on root wrapper
    - `e.currentTarget.contains(e.relatedTarget)` guard on blur
14. **Implement `Carousel.PlayPause`**
    - `toggle` function in context (plays/stops the plugin and flips
      `userPaused`)
    - Returns `null` when `!hasAutoPlay`
15. **Implement `Carousel.Header` + `Carousel.Title`**
    - Header: pure `div` with flex layout
    - Title: `<h2>` / `<a>` branching, registers `id` into context via
      `setLabelId`
16. **`prefers-reduced-motion` hook**
    - `usePrefersReducedMotion()` using `matchMedia` +
      `addEventListener('change', ...)` so live toggles take effect
    - Returns `false` on SSR to match server render; syncs to real
      value after first client effect (no hydration mismatch)
    - Effect dep triggers Embla `reInit` when the value flips
17. **Keyboard navigation handler** on `Carousel.Content`'s viewport
18. **`aria-live` sync** — set based on `hasAutoPlay` initially, flip
    only on `userPaused` change
19. **Focus drop guard** on `select` event

**Deliverables:** full a11y-compliant carousel.

**Success criteria:** behavioural tests for every item in the pause
state machine table above.

**Effort:** ~5–7 hours.

#### Phase 4 — Polish, docs, prototype migration

20. **Runtime dev warnings** for invalid `autoPlay` delay and
    conflicting `opts.axis`
21. **Docs MDX page** at
    `docs/src/app/components/carousel/page.mdx`
    - Metadata export (`title`, `description`, `status`, `category`)
    - `## Import`
    - `## Examples` — Default grid, Featured hero with autoplay,
      Vertical, With dots, Keyboard + reduced motion callout
    - `## Accessibility`
    - `<PropsDefinitions componentPath='packages/components/src/components/Carousel/index.tsx' />`
22. **Update CodePreview scope**
    `docs/src/components/CodePreview.tsx` — add `CaretLeft`,
    `CaretRight`, `CaretUp`, `CaretDown`, `Pause`, `Play`, `ArrowRight`
    to the `PhosphorIcons` map if missing
23. **Prototype migration** (optional, document-only for v1):
    - Add a "Migrating from prototype" callout in docs showing the
      shadcn-style translation
    - Note that `cardSize="default"` maps to `basis-[42vw] md:basis-1/5`
    - Note that `cardSize="featured"` maps to `basis-[84vw] md:basis-1/2`
      - `opts={{ loop: true, align: 'start' }}` + `autoPlay={5000}`

**Deliverables:** docs page, prototype migration guidance, warnings.

**Effort:** ~3 hours.

## Alternative Approaches Considered

### Approach B — Keep the prototype's native scroll-snap DIY engine

**Rejected.** The prototype's clone-snap-back effect (~50 lines) is
already fragile and doesn't handle keyboard, drag momentum, or RTL. It
can't do vertical. Edge cases around `scrollend` timing vary by
browser. Embla is ~5kb and battle-tested by shadcn, Mantine, and
hundreds of production apps.

### Approach C — Monolithic component matching the prototype 1:1

**Rejected.** The brainstorm explicitly chose compound. A monolithic
API couples content to layout, and extending it to new use cases
requires adding props (`autoPlay`, `dotPosition`, `cardSize`,
`showHeader`, `headerPosition`, …) until it collapses.

### Approach D — Wrap Embla in a Base UI-style `render` prop compound

**Rejected.** Not a Base UI primitive. The
`docs/contributing/BASE_UI.md` guide explicitly says the `render`
prop policy applies only to Base UI wrappers, and that non-Base-UI
components like Card and Breadcrumb are free to use the
`as` / `ElementType` pattern. For Carousel we don't even need polymorphism
— the root is always a `<div>`, the title swaps between `<h2>` and `<a>`
via the `href` prop.

## System-Wide Impact

### Interaction Graph

1. Consumer renders `<Carousel>` — `useEmblaCarousel` initialises on
   mount. The hook internally creates a `root → container → slides`
   measurement model and subscribes to `ResizeObserver` and
   `MutationObserver` on the container.
2. `useEffect` subscribes to Embla's `init`, `reinit`, `select`,
   `autoplay:play`, `autoplay:stop` events. Each event updates React
   state and re-renders subcomponents via `CarouselContext`.
3. `Carousel.Content` `Children.map` produces a new array on every
   render — each `Carousel.Item` child is wrapped in a
   `CarouselItemContext.Provider`. Changing the number of children
   triggers the `childCount` effect which calls `api.reInit()`,
   restarting at step 2.
4. `Carousel.PlayPause.onClick` → `context.toggle()` →
   `plugin.play()` or `plugin.stop()` → emits `autoplay:play` /
   `autoplay:stop` → React state updates `isPlaying` → `PauseIcon`
   swaps to `PlayIcon`.
5. Reduced-motion `matchMedia` change listener fires → sets local
   state → effect dep changes → new plugin list → `useEmblaCarousel`
   returns a new `api`... Actually Embla v9's react hook does NOT
   re-create on plugin changes — it uses `api.reInit(newOpts,
newPlugins)` internally when the inputs change. We must pass the
   **same plugin array reference** across renders unless the content
   actually differs. `useMemo` on `plugins` handles this.

### Error Propagation

- **Embla init failure** (e.g. ref attached to non-element): Embla
  throws synchronously on first `init` — propagates up to the nearest
  error boundary. React's dev overlay shows it. Production: wrapping
  `Carousel` is the consumer's responsibility.
- **`useCarousel()` outside provider**: explicit throw with helpful
  message (`'useCarousel must be used inside <Carousel>'`).
- **Autoplay plugin absent but PlayPause rendered**: component returns
  `null` — no error, no visible artefact. This matches other "slot is
  empty" behaviours in Roadie (e.g. `Card.Image` without a src).
- **`matchMedia` unsupported** (very old environments): fallback to
  `false` from the hook; autoplay proceeds normally.

### State Lifecycle Risks

- **Hover-pause sticky bug**: If `userPaused` is set to `true` by a
  click but the mouse is still over the carousel, the `mouseleave`
  handler would naively try to resume. Guard: `onMouseLeave` only
  calls `plugin.play()` when `!userPausedRef.current`.
- **Focus-in pause race**: Focus events bubble; clicking the PlayPause
  button itself triggers focus-in on the carousel and would pause
  again. Guard: the toggle logic runs _after_ focus pause, so the
  final state is correct regardless. Also: the `userPaused` ref is
  set before the play/stop call so any subsequent focus handler sees
  the right sticky state.
- **`reInit` on children change + autoplay + reduced motion**: if
  reduced motion flips while children are also changing, both effects
  may call `reInit` in the same tick. Embla handles back-to-back
  `reInit` safely, but we should pass `plugins` as a stable memo to
  avoid re-subscribing event listeners unnecessarily.
- **SSR rehydration**: `prefersReducedMotion` returns `false` on
  server and true initial client render, then syncs after mount.
  This is a deliberate one-frame difference to avoid hydration
  mismatch — the carousel renders "no reduced motion" markup on both
  server and initial client, then Embla `reInit`s on the next tick
  if the user actually has the setting.

### API Surface Parity

The existing `/Users/lukebrooker/Code/prototype/src/components/Carousel.tsx`
is the only consumer-facing surface today. It is **not** shipped in a
published package, so no breaking change to manage. The prototype
itself should be retired once a consumer app migrates — but that is
out of scope for this PR.

### Integration Test Scenarios

1. **Autoplay → hover → click pause → mouseleave → stays paused.**
   Unit tests with fake timers and `fireEvent.mouseEnter` / `mouseLeave`.
2. **Reduced-motion toggles at runtime.** Start with matchMedia
   returning `{matches: false}`, render, then mutate the mock to
   return `{matches: true}` and dispatch a `change` event. Assert
   `isPlaying` becomes `false` and `duration` option on the Embla
   API is `0`.
3. **Children change triggers re-init.** Render with 3 items, rerender
   with 5, assert `api.snapList().length === 5` and Previous/Next
   visibility update accordingly.
4. **Keyboard navigation with focus inside a slide link.** Place a
   focusable `<a>` inside a slide, tab to it, press ArrowRight, assert
   the carousel DID NOT advance (arrow hijack prevention).
5. **Focus drop guard on goTo.** Focus inside slide 0, call
   `goTo(1)`, assert focus is on the slide 1 wrapper, not `<body>`.

## Acceptance Criteria

### Functional Requirements

- [ ] `Carousel` root renders an Embla-powered viewport with children
- [ ] `direction='horizontal'` and `direction='vertical'` both work
      end-to-end (drag, keyboard, dots, nav buttons)
- [ ] `opts.loop=true` produces seamless infinite scroll in both directions
- [ ] `autoPlay={n}` advances slides every `n`ms, respects reduced motion
- [ ] `Carousel.Previous` / `Carousel.Next` go to prev/next snap,
      disable at boundaries when `loop=false`, hide when `slideCount <= 1`
- [ ] `Carousel.Dots` renders `slideCount` buttons, active dot styled,
      click calls `goTo` and focus stays on dot
- [ ] `Carousel.PlayPause` toggles autoplay, swaps Play/Pause icon,
      returns `null` when no `autoPlay`
- [ ] `Carousel.Title href=…` renders anchor with trailing
      `ArrowRightIcon`; no `href` renders `<h2>`
- [ ] `Carousel.Content` uses `aria-labelledby={titleId}` when
      `Carousel.Title` is present
- [ ] `useCarousel()` returns the documented context shape; throws
      helpful error outside provider
- [ ] Barrel exports `Carousel`, `useCarousel`, types

### Non-Functional Requirements

- [ ] **WCAG 2.2 AA compliance**:
  - [ ] Root has `aria-roledescription='carousel'` + accessible name
        (`aria-labelledby` or `aria-label`)
  - [ ] Each slide has `role='group'` + `aria-roledescription='slide'` + `aria-label='N of M'`
  - [ ] Non-active slides are `inert`
  - [ ] Previous/Next have `aria-label='Previous slide'` / `'Next slide'`
  - [ ] When `autoPlay` is set, `Carousel.PlayPause` is present and is
        the first tab stop in the carousel (documented in examples)
  - [ ] Autoplay pauses on hover, focus-in, and explicit click — never
        auto-resumes after an explicit user pause
  - [ ] `aria-live` is `off` during autoplay, `polite` when paused or
        when there's no autoplay
  - [ ] Dots are grouped buttons with `aria-label='Choose slide to display'`
        on the group, individual `aria-label='Go to slide N'`, active
        dot has `aria-disabled='true'`
- [ ] **Keyboard navigation**: arrow keys (direction-aware), Home, End,
      only active when focus is inside the viewport and not on a
      nested interactive element
- [ ] **prefers-reduced-motion**: disables autoplay entirely, sets
      Embla `duration: 0`, reacts to live `matchMedia` changes
- [ ] **Roadie styling rules**: no `gap` on Embla container, no
      transforms on Content/Item, no hardcoded colours, uses
      `emphasis-subtler` / `intent-accent` / `text-strong` utilities
- [ ] **Bundle size**: Carousel + Embla + Autoplay contributes
      < 12 KB gzipped to the components package bundle (measured via
      `pnpm --filter @oztix/roadie-components build` output)
- [ ] **SSR safety**: no hydration mismatch warnings in Next.js 16

### Quality Gates

- [ ] `pnpm typecheck` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm test` passes with ≥ 90% line coverage on `Carousel/index.tsx`
- [ ] `pnpm build` succeeds for `@oztix/roadie-core`,
      `@oztix/roadie-components`, and `docs`
- [ ] Docs page renders in the local docs site and all `tsx-live`
      examples compile and run
- [ ] `head -c 13 packages/components/dist/Carousel.js` outputs
      `"use client";` (per `BASE_UI.md` §7 verification step)
- [ ] Axe DevTools scan on the docs page reports 0 violations on
      the Carousel examples
- [ ] **Embla v9 RC verification** — at install time, cross-check the
      installed RC's method, event, and option names against this
      plan's assumed surface (`goToPrev`, `goToNext`, `goTo`,
      `canGoToPrev`, `canGoToNext`, `selectedSnap`, `snapList`, events
      `init` / `reinit` / `select` / `slidesinview` / `slideschanged` /
      `autoplay:play` / `autoplay:stop`, autoplay options `delay` /
      `defaultInteraction` / `stopOnLastSnap`). Any rename forces a
      plan update before implementation proceeds.
- [ ] All three Embla packages pinned to the **same** RC version in
      `package.json` (not a caret range) and reflected in
      `pnpm-lock.yaml`
- [ ] `size-limit` gate at **13 KB gzipped** for the Carousel export
      passes in CI

### Testing Requirements

Co-located `packages/components/src/components/Carousel/Carousel.test.tsx`
(Vitest + RTL). Must cover:

#### Rendering & structure

- [ ] Renders with 1, 2, 5 children; correct `slideCount` context value
- [ ] Each `Carousel.Item` gets `aria-label='N of M'`
- [ ] Non-active items have `inert` attribute, active item does not
- [ ] Root gets `aria-roledescription='carousel'` and accessible name
- [ ] With `Carousel.Title`, Content uses `aria-labelledby`; without,
      uses `aria-label`

#### Navigation

- [ ] Click `Previous` calls `api.goToPrev`
- [ ] Click `Next` calls `api.goToNext`
- [ ] Previous is `aria-disabled` at index 0 with `loop=false`
- [ ] Next is `aria-disabled` at last index with `loop=false`
- [ ] Neither disables when `loop=true`
- [ ] Both hidden when `slideCount <= 1`
- [ ] Click a dot calls `api.goTo(index)`; focus stays on dot

#### Autoplay + pause state machine

- [ ] `autoPlay={3000}` starts with `isPlaying=true`, icon shows Pause
- [ ] Fake-timer advance of 3000ms moves `selectedIndex` by 1
- [ ] Mouseenter → `isPlaying` becomes false, `aria-live` stays `off`
- [ ] Mouseleave → `isPlaying` returns to true (only if `!userPaused`)
- [ ] Click `PlayPause` → `isPlaying=false`, `aria-live='polite'`,
      `userPaused=true`, icon shows Play
- [ ] Mouseleave after explicit pause → still paused
- [ ] Focus-in from outside pauses; tab-out (blur to outside) resumes;
      focus moving between children stays playing
- [ ] Click `PlayPause` again → resumes, `userPaused=false`

#### Reduced motion

- [ ] `matchMedia('(prefers-reduced-motion: reduce)').matches=true` at
      mount → no autoplay plugin wired, `duration=0`
- [ ] Live toggle (dispatch `change` event) from `false` to `true`
      stops autoplay; toggle back starts it again

#### Keyboard

- [ ] ArrowRight on viewport (horizontal) advances
- [ ] ArrowLeft goes back
- [ ] ArrowUp/Down in vertical mode
- [ ] Home goes to index 0, End to last
- [ ] ArrowRight while focus is inside a slide's child `<a>` does NOT
      advance

#### Dynamic children

- [ ] Rerendering with a different number of children calls
      `api.reInit`; `slideCount` updates

#### Focus drop guard

- [ ] Focus an element inside slide 0, call `goTo(1)`, assert
      `document.activeElement` is the slide 1 wrapper

#### SSR

- [ ] A separate `Carousel.ssr.test.tsx` uses
      `renderToString` to confirm no throws and valid HTML — Embla's
      ref is never called, markup matches the first client render

## Success Metrics

- **Merged PR** with all quality gates green
- **Prototype retirement path documented** in docs (the existing
  prototype in `/Users/lukebrooker/Code/prototype/` can be replaced
  with the Roadie component following the migration section)
- **Zero axe violations** on docs page
- **Bundle impact** < 12 KB gzipped
- **Test coverage** ≥ 90% on `Carousel/index.tsx`

## Dependencies & Prerequisites

**New npm dependencies (all pinned to the same Embla v9 RC):**

- `embla-carousel-react@9.0.0-rc.XX` — runtime dep
- `embla-carousel-autoplay@9.0.0-rc.XX` — runtime dep
- `embla-carousel@9.0.0-rc.XX` — **direct dependency** (types leak
  through the generated `.d.ts`, so dev-only would break downstream
  `tsc`)

**v9 is a release candidate.** Pin the exact RC version, commit the
pnpm lockfile, and block any caret range until Embla v9 has a stable
GA. Before implementation, re-verify that the RC still exposes the v9
method names used throughout this plan (`goToPrev`, `goToNext`, `goTo`,
`canGoToPrev`, `canGoToNext`, `selectedSnap`, `snapList`) and the
lowercased event names (`init`, `reinit`, `select`, `slidesinview`,
`slideschanged`, `autoplay:play`, `autoplay:stop`).

**Bundle-size gate:** add a `size-limit` entry for the `Carousel`
export at **13 KB gzipped**. Regressions beyond this fail CI. This
replaces the informal "< 12 KB" success metric with an enforced gate.

**Existing Roadie APIs used:**

- `IconButton` from `packages/components/src/components/Button/IconButton.tsx`
- `intentVariants` / styling utilities (not strictly needed — only if
  we expose intent on the dots, which we don't)
- `cn` from `@oztix/roadie-core/utils`
- `'use client'` directive and tsdown bundling pipeline

**No core package changes required.** No `safelist.html` additions
needed (all classes are static in CVA).

**No changes to `tsdown.config.ts`** — the new Embla deps aren't in
`neverBundle`, so they are bundled automatically.

## Risk Analysis & Mitigation

| Risk                                                            | Likelihood | Impact | Mitigation                                                                                                                                                                                                                                                                                                          |
| --------------------------------------------------------------- | ---------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Embla v9 is a release candidate — API can still shift           | Medium     | High   | Pin to an exact RC (no caret); lock file committed; re-verify method/event/option names at install time; block GA bump until stable v9 ships and tests rerun                                                                                                                                                        |
| jsdom can't simulate pointer/drag                               | High       | Medium | Test Embla's `api` methods directly, not drag gestures. Integration tests in Chromium are out of scope for v1 (no Playwright in this repo).                                                                                                                                                                         |
| jsdom reports zero-size elements so Embla never initialises     | High       | Medium | Stub `HTMLElement.prototype.offsetWidth`/`offsetHeight` in `vitest.setup.ts`, or adopt `jsdom-testing-mocks`. Gate all `api`-dependent assertions behind `await waitFor(() => expect(result.current.api).toBeTruthy())`                                                                                             |
| `inert` assertions in jsdom are advisory only                   | Medium     | Low    | Assert presence of the attribute; rely on axe in the docs site for live verification                                                                                                                                                                                                                                |
| Autoplay fake-timer interaction breaks                          | High       | Medium | `vi.useFakeTimers({ toFake: ['setTimeout', 'Date'] })` — **do not** fake `setInterval` (Embla uses it internally) and **do not** fake RAF. Advance timers with `vi.advanceTimersByTimeAsync` wrapped in `act`. When in doubt, call `plugin.play()` / `plugin.stop()` directly instead of relying on the timer path. |
| Reduced-motion matchMedia mock doesn't emit events              | Medium     | Medium | Setup file installs a listener-tracking `matchMedia` stub that exposes a global `__setReducedMotion(value)` helper; calling it updates `matches` and dispatches a real `MediaQueryListEvent` so the hook's `change` listener fires                                                                                  |
| Pointer-event simulation in jsdom is unreliable                 | High       | Medium | Don't drive autoplay pause via `fireEvent.pointerDown` — invoke `api.plugins().autoplay!.stop()` directly and assert the resulting context state                                                                                                                                                                    |
| SSR hydration mismatch from reduced-motion                      | Medium     | High   | Hook returns `false` on server and initial client render; syncs after mount. Document clearly.                                                                                                                                                                                                                      |
| Consumer passes both `direction` and `opts.axis`                | Medium     | Low    | Dev warning; `direction` wins                                                                                                                                                                                                                                                                                       |
| Bundle size blows past 12 KB                                    | Low        | Low    | Tree-shake — Embla is already split; autoplay adds ~1 KB. Monitor in the PR                                                                                                                                                                                                                                         |
| `Carousel.PlayPause` misplaced by consumer (not first tab stop) | Medium     | Medium | Document strongly in examples; it's the consumer's responsibility but v1 ships only examples that do it right                                                                                                                                                                                                       |

## Resource Requirements

- **1 developer** — ~2 days full-time, including tests and docs
- **1 reviewer** — ~1 hour for code review, plus axe scan on docs page
- **Design input** — none; this is a primitive, not a visual design task

## Future Considerations

### v2+ features (explicitly out of scope)

- **RTL support** via Embla's `direction: 'ltr' | 'rtl'` option
- **Variable-width slides** with `dragFree: true` momentum
- **Autoplay breakpoints** (different intervals at different screen
  widths)
- **Autoplay progress indicator** (ring around dot or bottom bar)
- **Linked / thumbnail carousels** (two Embla instances sharing state)
- **Tablist variant** — `role='tablist'` + `role='tab'` + `role='tabpanel'`
  APG pattern, for carousels where slides are semantically tabs
- **Lazy image loading plugin** integration
  (`embla-carousel-class-names` or similar)

The v1 API is designed so these can be added as plugins or new
subcomponents without breaking existing consumers. For example, an
`AutoplayProgress` subcomponent could be added later without touching
the root.

### Migration path for the prototype

A separate PR can delete
`/Users/lukebrooker/Code/prototype/src/components/Carousel.tsx` and
replace its call sites with the Roadie component once both apps are on
the same published version of `@oztix/roadie-components`. This plan
does not block on that migration.

## Documentation Plan

### Roadie docs site

- New page at `docs/src/app/components/carousel/page.mdx` following
  the existing component MDX template (`docs/contributing/COMPONENT_DOC_TEMPLATE.md`)
- Metadata: `title: 'Carousel'`, `description: 'Compound horizontal
or vertical carousel built on Embla.'`, `status: 'beta'`,
  `category: 'Content'`
- Sections in order: one-liner → Import → Examples (Default grid →
  Featured hero → Vertical → With dots → Keyboard and reduced motion
  callout) → Accessibility → `<PropsDefinitions componentPath='packages/components/src/components/Carousel/index.tsx' />`
- `Carousel` added to `docs/src/components/CodePreview.tsx`
  automatically via the existing `@oztix/roadie-components` spread
- Phosphor icon additions to `CodePreview.tsx` `PhosphorIcons` map:
  `CaretLeft`, `CaretRight`, `CaretUp`, `CaretDown`, `Pause`, `Play`,
  `ArrowRight` (any missing ones)

### AGENTS.md updates

- Add `Carousel` to the "Components Package" section's directory
  listing
- Add a note under "Component Patterns" about the compound + context
  - `Children.map` index-injection pattern, since it's a new idiom in
    the codebase

### New contributing doc: `docs/contributing/COMPOUND_PATTERNS.md`

Add a short contributing doc covering the two compound idioms in use:

1. **Context-only compounds** (Card, Accordion) — root owns state,
   children consume via `use(Context)`.
2. **Index-injection compounds** (Carousel) — root owns state, the
   container subcomponent walks direct children with `Children.map`
   and wraps each in a per-item context provider. Document the
   constraint that only direct `Carousel.Item` children are supported
   (Fragments and conditional children are not unwrapped), and the
   dev-only warning that fires when a non-Item element is found.

This closes the architecture review's "codify the idiom before it
proliferates" note.

### In-file JSDoc

- Each exported component gets a one-line JSDoc used by
  `react-docgen-typescript` in `PropsDefinitions`
- Each prop on the root props type gets a short JSDoc so the
  generated props table is useful

## Sources & References

### Origin

- **Brainstorm document:**
  [docs/brainstorms/2026-04-13-carousel-component-brainstorm.md](../brainstorms/2026-04-13-carousel-component-brainstorm.md)
- Key decisions carried forward:
  1. Compound API (shadcn-style) over monolithic
  2. `embla-carousel-react` + internal `embla-carousel-autoplay`
     wrapped behind an opinionated `autoPlay` prop
  3. `direction: 'horizontal' | 'vertical'` matching `RadioGroup` / `Steps`
  4. `Carousel.Header` / `.Title` matching `Card` compound convention
  5. `IconButton` reuse for `Previous` / `Next` with prop
     pass-through
  6. Consumer-owned slide sizing via Tailwind `basis-*`
  7. `prefers-reduced-motion` handling + seamless loop in v1
- **New in the plan vs brainstorm** (consumer should re-confirm):
  - `Carousel.PlayPause` subcomponent added for WCAG 2.2.2 compliance
    (persistent pause control is non-negotiable under
    `autoPlay > 5s`). The brainstorm's "pause-on-pointer + 10s idle"
    pattern is insufficient on its own.
  - `CarouselItemContext` for index discovery via `Children.map`
    injection — the brainstorm left this mechanism unspecified.
  - Previous/Next visibility uses `slideCount > 1`, not
    `canGoToPrev || canGoToNext`. The original heuristic was wrong.

### Internal References

- `packages/components/src/components/Card/index.tsx:130-144` —
  compound `Object.assign` pattern with type-cast augmentation
- `packages/components/src/components/Accordion/index.tsx` —
  compound + `createContext` / `use` hook pattern (closest analog for
  state-owning custom primitive)
- `packages/components/src/components/Marquee/index.tsx` —
  `'use client'` + `ResizeObserver` + animation state (closest
  ref-driven analog)
- `packages/components/src/components/Button/IconButton.tsx:5-9` —
  `Omit<ButtonProps, 'aria-label'> & { 'aria-label': string }`;
  defaults `size='icon-md'`
- `packages/components/src/components/RadioGroup/index.tsx:42-52` and
  `packages/components/src/components/Steps/index.tsx:22-32` —
  `direction` CVA variant precedents
- `packages/components/src/variants.ts:4` — `intentVariants`
- `packages/components/src/index.tsx` — barrel export pattern
- `packages/components/package.json` — current deps
- `packages/components/tsdown.config.ts:49-58` — `deps.neverBundle`
  list (Embla stays out = bundled)
- `packages/components/vitest.setup.ts` — will be extended with
  `ResizeObserver` + `matchMedia` polyfills
- `docs/contributing/BASE_UI.md` — `'use client'` verification step,
  non-Base-UI divergence note
- `docs/contributing/COMPONENT_DOC_TEMPLATE.md` — MDX section order
- `docs/src/components/CodePreview.tsx` — Phosphor icon map
- `docs/src/components/PropsDefinitions.tsx` — auto props table
- `/Users/lukebrooker/Code/prototype/src/components/Carousel.tsx` —
  the existing prototype being replaced

### External References

- **Embla v9 docs**: https://www.embla-carousel.com/api/methods/ —
  `goToPrev`, `goToNext`, `goTo`, `canGoToPrev`, `canGoToNext`,
  `selectedSnap`, `snapList` (v9 renamed all of these)
- **Embla v9 options**: https://www.embla-carousel.com/api/options/
- **Embla v9 events**: https://www.embla-carousel.com/api/events/ —
  lowercase names: `init`, `reinit`, `select`, `settle`, `scroll`,
  `slidesinview`, `slideschanged`, `pointerdown`, `pointerup`,
  `autoplay:play`, `autoplay:stop`
- **Autoplay plugin v9**:
  https://www.embla-carousel.com/plugins/autoplay/ — `delay`,
  `defaultInteraction`, `stopOnLastSnap`, `rootNode`, `active`
- **Embla accessibility guide**:
  https://www.embla-carousel.com/guides/accessibility/ — `inert`
  pattern, reduced-motion `duration: 0`
- **Embla React getting-started**:
  https://www.embla-carousel.com/get-started/react/
- **W3C WAI-ARIA APG Carousel pattern**:
  https://www.w3.org/WAI/ARIA/apg/patterns/carousel/
- **APG auto-rotating carousel example**:
  https://www.w3.org/WAI/ARIA/apg/patterns/carousel/examples/carousel-1-prev-next/
- **WCAG 2.2 SC 2.2.2 Pause, Stop, Hide**:
  https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html
- **MDN `inert`**:
  https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/inert
- **MDN `prefers-reduced-motion`**:
  https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion

### Related Work

- Prior component plans in `docs/plans/` following this structure:
  - `2026-04-07-feat-autocomplete-component-plan.md`
  - `2026-04-07-feat-steps-component-plan.md`
- No prior PRs or issues for Carousel in the Roadie repo (this is the
  first)
