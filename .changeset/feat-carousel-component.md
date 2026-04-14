---
'@oztix/roadie-components': minor
---

Add `Carousel` compound component built on Embla v9.

New parts:

- `Carousel` root with `direction`, `autoPlay`, `opts`, and `aria-label` props.
- `Carousel.Header` — responsive three-slot layout (title left, dots
  centered, controls right on desktop; collapses to flex `justify-between`
  on mobile). Children are placed by source order so consumers can drop
  arbitrary nodes into any slot.
- `Carousel.Title` (`<h2>` with `as` prop for heading level) and
  `Carousel.TitleLink` (anchor with trailing arrow icon and `as` for
  framework router links).
- `Carousel.Controls` — inline flex row that hides on mobile by default
  (`hidden md:flex`) and hides entirely when there's nothing to scroll
  to. Pass `forceVisible` to keep it rendered.
- `Carousel.Content` — Embla viewport + container. New `overflow` prop
  with `subtle` (default) / `hidden` / `visible` options. `subtle`
  bleeds slides past the gutter and fades them to the page background
  via `::before` / `::after` gradient overlays.
- `Carousel.Item` — single slide. Uses Embla's `slidesinview` event to
  drive the `inert` attribute, so every visible slide in a multi-visible
  layout (e.g. `basis-1/3` with 4 cards) stays interactive.
- `Carousel.Previous` / `Carousel.Next` — nav buttons compose `IconButton`.
  Auto-hide when `canScroll` is false.
- `Carousel.PlayPause` — play/pause toggle, renders only when `autoPlay`
  is set.
- `Carousel.Dots` — one button per *Embla snap* (not per slide), so
  multi-visible layouts get the correct dot count. Also auto-hides when
  there's nothing to scroll.
- `useCarousel()` hook returns `{ state, actions }`. `useCarouselUnsafeEmbla()`
  is the explicit escape hatch for consumers that need the raw Embla
  `api` — named separately so raw-Embla coupling is greppable.

Behaviour notes:

- `align: 'start'` is the Roadie default in `resolvedOpts` (consumers can
  still override via `opts`).
- Embla's `snapList()` feeds a `snapCount` state that powers all
  navigation logic, so `canGoToPrev` / `canGoToNext` / `canScroll` /
  `Carousel.Dots` all work correctly for multi-visible layouts.
- Keyboard nav (`ArrowLeft`/`Right`, `ArrowUp`/`Down` in vertical mode,
  `Home` / `End`) on the viewport; arrow keys yield to focusable
  content inside slides.
- `prefers-reduced-motion: reduce` disables the autoplay plugin
  entirely and sets Embla's `duration` to 0 for instant transitions.
- WCAG 2.2.2-compliant pause model: `Carousel.PlayPause` is a sticky
  toggle; hover / focus pause the plugin transiently without retriggering
  the live region.
- `safePluginCall` warns in dev when Embla's autoplay plugin throws
  instead of silently swallowing the error.
