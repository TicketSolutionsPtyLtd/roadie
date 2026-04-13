---
date: 2026-04-13
topic: carousel-component
---

# Carousel Component

## What We're Building

A compound `Carousel` primitive for `@oztix/roadie-components`, built on top of
`embla-carousel-react`. It replicates the functionality of the prototype at
`/Users/lukebrooker/Code/prototype/src/components/Carousel.tsx` — horizontal
scroll of cards, optional infinite loop, auto-play, dot indicators, and
previous/next navigation — but reshaped as a composable design-system
primitive that matches Roadie's conventions (`Card`-style compound exports,
`direction` prop, Tailwind utility sizing, intent-aware styling).

The prototype bakes mode, header, child sizing, and behaviour into a single
monolithic component. The Roadie version decomposes those concerns into a
compound API so consumers can build both the "default grid" and "featured
hero" looks — and anything in between — from the same building blocks.

## Why This Approach

The prototype works but it's tightly coupled: switching between `default` and
`featured` modes flips internal state machines, the header/link is hardcoded,
slide sizing is baked in, and the infinite-loop logic is a ~50-line
scroll-end clone-snap-back effect that's hard to test. A compound API plus
Embla as the engine gives us:

1. **One set of primitives, many layouts.** Consumers express "5-up grid with
   arrows" or "2-up hero with dots and autoplay" purely via composition +
   className, without new variants.
2. **Battle-tested scroll behaviour.** Embla owns drag, keyboard, touch,
   scroll snapping, and seamless loop. Same library shadcn uses. Drops ~150
   lines of custom DOM math.
3. **Consistency with Roadie.** Matches `Card.Header` / `Card.Title`
   structure, uses the `direction` prop convention from `RadioGroup` / `Steps`,
   and lets `Carousel.Item` be sized with standard Tailwind utilities
   (`basis-*`, `md:basis-1/5`).

## Key Decisions

### API shape: compound, shadcn-style

```tsx
<Carousel opts={{ loop: true }} autoPlay={5000} direction='horizontal'>
  <Carousel.Header>
    <Carousel.Title href='/events'>Featured events</Carousel.Title>
    <Carousel.Previous />
    <Carousel.Next />
  </Carousel.Header>
  <Carousel.Content>
    <Carousel.Item className='basis-[84vw] md:basis-1/2'>…</Carousel.Item>
    <Carousel.Item className='basis-[84vw] md:basis-1/2'>…</Carousel.Item>
  </Carousel.Content>
  <Carousel.Dots />
</Carousel>
```

Parts:

- **`Carousel`** (root) — owns the Embla instance and context. Props:
  `opts` (pass-through `EmblaOptionsType`), `autoPlay` (number ms or `false`,
  default `false`), `direction` (`'horizontal' | 'vertical'`, default
  `'horizontal'`), `plugins` (escape hatch for advanced consumers), plus
  `className` / native div props. Renders a positioning wrapper.
- **`Carousel.Content`** — the Embla viewport + container in one element.
  Applies `overflow-hidden` + `flex -ml-4` (container uses negative margin,
  items use matching `pl-4` for gutter — Embla requires padding gutters over
  `gap` for snap math). Holds the Embla ref.
- **`Carousel.Item`** — flex child. Defaults to `min-w-0 shrink-0 grow-0
basis-full pl-4`. Role: `group`, `aria-roledescription="slide"`,
  `aria-label="Slide N of M"`.
- **`Carousel.Header`** — layout wrapper matching `Card.Header`, a `flex
items-center justify-between gap-4 mb-4`. Pure composition shell.
- **`Carousel.Title`** — `<h2 class='text-display-ui-4 text-strong'>` by
  default. Accepts optional `href` which renders it as a Base UI-style link
  with trailing `ArrowRightIcon` (matches prototype).
- **`Carousel.Previous`** / **`Carousel.Next`** — compose Roadie's existing
  `IconButton` (`packages/components/src/components/Button/IconButton.tsx`)
  with `CaretLeftIcon` / `CaretRightIcon` and the appropriate `aria-label`.
  All `IconButton` props (`emphasis`, `intent`, `size`, `className`) pass
  through so consumers can customise. Auto-disable when `canScrollPrev` /
  `canScrollNext` is false. Hidden when both are false and `autoPlay` is
  off (all items fit).
- **`Carousel.Dots`** — renders one button per slide. Active dot gets the
  `intent-accent` pill treatment (`bg-accent h-2 w-5`), inactive dots are
  `bg-subtler h-2 w-2` with hover. Clicking calls `scrollTo(index)`.
- **`useCarousel()`** hook — exported for consumers who need custom
  controls. Returns `{ api, canScrollPrev, canScrollNext, selectedIndex,
slideCount, scrollPrev, scrollNext, scrollTo }`.

### Engine: `embla-carousel-react`

Added as a new dependency on `@oztix/roadie-components`. `embla-carousel-autoplay`
is wired internally when `autoPlay` prop is set, so consumers don't import
plugins directly for the common case. Advanced consumers can still drop to
the `plugins` prop.

Rationale: the user wants an opinionated API. The small bundle cost (~1kb)
from always including autoplay is acceptable given how central this
behaviour is to the featured use case.

### Sizing: consumer owns it

`Carousel.Item` ships with `basis-full`. Consumers override with Tailwind
responsive utilities. No size variant on the root. This is the cleanest way
to get from "2-up hero on desktop, 1-up on mobile" to "5-up grid with
arbitrary breakpoints" without multiplying the API surface.

### Direction prop, not orientation

Matches `RadioGroup.direction` and `Steps.direction`. `horizontal` default.
Vertical flips the Embla axis (`axis: 'y'`), swaps the container's flex
direction to `flex-col`, and repositions dots (below in horizontal, right
in vertical). Previous/Next icons swap to `CaretUpIcon` / `CaretDownIcon`
when vertical.

Embla's `direction: 'ltr' | 'rtl'` (text direction, separate concept) is
not exposed in v1 — Roadie doesn't support RTL today.

### Featured flags that ship in v1

All four selected:

- **Pause auto-play on pointer interaction.** `pointerdown` → stop autoplay
  plugin → restart after a 10s idle timer. Wired inside the root with refs.
- **Hide Previous/Next when all items fit.** Read `canScrollPrev` and
  `canScrollNext` from Embla; when both are false and `autoPlay` is off,
  the buttons render `hidden`. When `autoPlay` is on, buttons always show
  (featured mode always needs them).
- **Seamless infinite loop.** Handled by Embla's native `loop: true`
  option, passed via `opts`. No manual clones, no scroll-end detection.
- **`prefers-reduced-motion` handling.** When the user has the OS
  preference set, `autoPlay` is ignored (no ticker starts) and Embla is
  configured with `duration: 0` for instant scrolling. Implemented with
  `window.matchMedia('(prefers-reduced-motion: reduce)')` in the root.

### Styling rules followed

- **No transforms on `Carousel.Content` or `Carousel.Item`.** Embla owns
  those. If a slide ever needs a scale-on-hover effect, it must go on an
  inner element inside the consumer's `Carousel.Item` child.
- **No hardcoded colours.** Dots, buttons, and text use `bg-accent`,
  `bg-subtler`, `text-subtle`, `emphasis-subtler`.
- **Rounded-full buttons** (matches Roadie's "pill" shape tier for
  circular controls).
- **Gutter via padding, not `gap`.** Default `pl-4` / `-ml-4`. Consumers
  override per-Item if they need a different gutter.
- **`'use client'` directive** at the top of `index.tsx` — Embla uses
  hooks, so this file is client-only.

### Tests

Co-located `Carousel.test.tsx` with Vitest + RTL. Embla works in jsdom as
long as `ResizeObserver` is polyfilled (Roadie already has
`vitest.setup.ts` — we'll add the polyfill there if it's missing).
Behaviour assertions:

- Renders the right number of `role='group'` slides from children
- Previous/Next buttons call Embla's `scrollPrev` / `scrollNext`
- Buttons are disabled at boundaries (and both hidden when all items fit
  - autoplay off)
- `autoPlay={5000}` advances the selected index after the delay (fake
  timers)
- `pointerdown` pauses autoplay and resumes after 10s (fake timers)
- Loop mode wraps from last → first without jumping
- `direction='vertical'` sets `aria-orientation='vertical'` and renders
  vertical caret icons
- `prefers-reduced-motion` disables autoplay (mock `matchMedia`)
- `Carousel.Title` with `href` renders an anchor; without, renders an `h2`
- `useCarousel()` returns the documented shape

## Implementation Notes

**File layout:**

```
packages/components/src/components/Carousel/
├── index.tsx              # All parts + context
├── Carousel.test.tsx      # Vitest + RTL
└── (no separate types file — co-located)
```

**Docs:**

```
docs/src/app/components/carousel/page.mdx
```

Structure follows `COMPONENT_DOC_TEMPLATE.md`: one-line description,
Import, Examples (Default → Featured hero with autoplay → Vertical →
With dots → With header + link → All controls), Guidelines,
Accessibility, PropsDefinitions.

**Accessibility:**

- Root: `role='region'`, `aria-roledescription='carousel'`, optional
  `aria-label` via prop
- Content: `aria-live='polite'` when `autoPlay` is off, `aria-live='off'`
  when on (matches WAI-ARIA APG carousel pattern)
- Items: `role='group'`, `aria-roledescription='slide'`,
  `aria-label='Slide N of M'`
- Buttons: `aria-label='Previous slide'` / `'Next slide'`
- Dots: `aria-label='Go to slide N'`, plus `aria-current='true'` on the
  active one
- Keyboard: Embla's native arrow-key nav (left/right or up/down based on
  axis). We don't intercept.

## Open Questions

Resolved during dialogue:

- ✅ Compound API shape — shadcn-style
- ✅ Engine — `embla-carousel-react`
- ✅ Sizing — consumer owns via className
- ✅ Autoplay — opinionated `autoPlay` prop, plugin hidden internally
- ✅ Orientation — both, via `direction` prop
- ✅ Dots — `Carousel.Dots` subcomponent
- ✅ Header — `Carousel.Header` + `Carousel.Title` matching Card
- ✅ v1 features — all four (pause, hide, loop, reduced-motion)

## Resolved Questions

- **`Carousel.Title` link rendering** → `href` prop renders an `<a>` with a
  trailing `ArrowRightIcon`; no `href` renders a plain `<h2>`. No Base UI
  `render` prop. Matches the prototype 1:1.
- **Dots position in vertical mode** → Vertically stacked strip to the
  right of `Carousel.Content`. Horizontal mode keeps dots in the header or
  below (consumer's choice — it's just a child element).
- **Previous/Next default styling** → Compose Roadie's existing
  `IconButton` and pass all props through. Consumers can override
  `emphasis`, `intent`, `size`, or `className` on the nav buttons directly.

## Open Questions

1. **Vitest setup for Embla.** Embla needs `ResizeObserver` in jsdom.
   Verify whether the existing `vitest.setup.ts` polyfills it; add the
   polyfill if not. (Action for planning phase.)

## Next Steps

→ `/ce:plan` for implementation details (file changes, test plan,
dependency addition, migration notes).
