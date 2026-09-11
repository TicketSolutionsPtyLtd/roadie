import { cva } from 'class-variance-authority'

// `relative` matches the inline position Base UI sets on Root so absolutely
// positioned scrollbars anchor to it. `min-h/w-0` lets the area shrink inside
// a flex/grid parent instead of the content's intrinsic size winning.
// `overflow-hidden` keeps the scrollbars inside a rounded root — they are
// pinned to its edges, so without it a thumb paints over the corner radius.
export const scrollAreaRootVariants = cva(
  'relative min-h-0 min-w-0 overflow-hidden'
)

export type ScrollAreaFade = 'none' | 'y' | 'x' | 'both'

// Stops driven off Base UI's overflow-edge attributes; each sits at 0 until
// its edge overflows, so an edge with nothing past it draws no fade.
//
// They snap rather than transition — animating would lag the exact moment
// Base UI flips the attribute.
//
// Each mask is one static literal: Tailwind scans the dist as plain text, so
// a class assembled by interpolation never reaches the consumer's CSS.
const fadeYStops = [
  'data-[overflow-y-start]:[--scroll-area-fade-top:var(--scroll-area-fade-size)]',
  'data-[overflow-y-end]:[--scroll-area-fade-bottom:var(--scroll-area-fade-size)]'
]
const fadeXStops = [
  'data-[overflow-x-start]:[--scroll-area-fade-left:var(--scroll-area-fade-size)]',
  'data-[overflow-x-end]:[--scroll-area-fade-right:var(--scroll-area-fade-size)]'
]

const fadeY = [
  ...fadeYStops,
  '[mask-image:linear-gradient(to_bottom,transparent_0,black_var(--scroll-area-fade-top),black_calc(100%-var(--scroll-area-fade-bottom)),transparent_100%)]'
]
const fadeX = [
  ...fadeXStops,
  '[mask-image:linear-gradient(to_right,transparent_0,black_var(--scroll-area-fade-left),black_calc(100%-var(--scroll-area-fade-right)),transparent_100%)]'
]

// Base UI sets `overflow: scroll` inline here — a Tailwind `overflow-*` class
// can't beat it, clamp an axis via the `style` prop instead.
// `overscroll-contain` stops a scroll gesture chaining into the page on iOS.
export const scrollAreaViewportVariants = cva(
  [
    // `rounded-[inherit]` so the focus ring follows the root's corners instead
    // of drawing a square the root's `overflow-hidden` then crops.
    'size-full overscroll-contain rounded-[inherit]',
    'focus-visible:outline-2 focus-visible:-outline-offset-2',
    'focus-visible:outline-[var(--intent-border-strong)]',
    // Zero by default so an edge with nothing past it draws no fade.
    '[--scroll-area-fade-size:2rem]',
    '[--scroll-area-fade-top:0px] [--scroll-area-fade-bottom:0px]',
    '[--scroll-area-fade-left:0px] [--scroll-area-fade-right:0px]'
  ],
  {
    variants: {
      fade: {
        none: '',
        y: fadeY,
        x: fadeX,
        both: [
          ...fadeYStops,
          ...fadeXStops,
          '[mask-image:linear-gradient(to_bottom,transparent_0,black_var(--scroll-area-fade-top),black_calc(100%-var(--scroll-area-fade-bottom)),transparent_100%),linear-gradient(to_right,transparent_0,black_var(--scroll-area-fade-left),black_calc(100%-var(--scroll-area-fade-right)),transparent_100%)]',
          '[mask-composite:intersect]'
        ]
      }
    },
    defaultVariants: { fade: 'none' }
  }
)

export const scrollAreaContentVariants = cva('min-w-0')

export type ScrollAreaScrollbarOrientation = 'vertical' | 'horizontal'

// Idle-hidden, revealed on hover/scroll (macOS overlay behaviour) everywhere.
// Hidden on coarse pointers — this thumb is sized for hover and never
// appears for a touch-scroll, so touch keeps the platform's own affordance.
export const scrollAreaScrollbarVariants = cva(
  [
    // Base UI positions this absolutely, as a sibling of the viewport. It sits
    // deliberately between two tiers: above ordinary content and low-z sticky
    // accents (a group heading), so those can't cut the track into segments as
    // they scroll past; below `z-sticky`, the tier pinned chrome uses, so a
    // pane header stays opaque over it and the bar reads as stopping at the
    // header rather than running underneath it.
    'z-docked flex touch-none p-0.5 select-none pointer-coarse:hidden',
    // Revealing is gated on the matching axis actually overflowing, per
    // orientation below. Unmounting can't carry it: `keepMounted` is what
    // Base UI checks to skip its own hiding, so a kept-mounted bar (a pane
    // needs one, to bind its header offset before measurement) would
    // otherwise show a full-length thumb on hover with nothing to scroll.
    'opacity-0',
    'motion-safe:transition-opacity motion-safe:duration-moderate motion-safe:ease-enter',
    'motion-reduce:transition-none'
  ],
  {
    variants: {
      // Base UI pins the bar to the root's edges inline, so the margin is what
      // holds it clear of a rounded corner — without it the track's ends
      // disappear under the radius. Split rather than `my-1`/`mx-1` shorthand
      // so a consumer overriding one side with an arbitrary value (a pane
      // offsetting the top past its header) doesn't drop the other — a
      // shorthand and its longhand fall in the same conflict group, so
      // Tailwind-merge would discard the whole pair, not just the side named.
      //
      // The cross-axis margin (`me-*`/`mb-*`) is 0.5 (2px), not 1: the track's
      // own padding (`p-0.5`, 2px) sits inside it, so the visible thumb inset
      // from the pane edge is the sum of both — 4px, not 6px.
      orientation: {
        vertical: [
          'mt-1 mb-1 me-0.5 w-2.5',
          'data-[has-overflow-y]:data-[hovering]:opacity-100',
          'data-[has-overflow-y]:data-[scrolling]:opacity-100'
        ],
        horizontal: [
          'mx-1 mb-0.5 h-2.5',
          'data-[has-overflow-x]:data-[hovering]:opacity-100',
          'data-[has-overflow-x]:data-[scrolling]:opacity-100'
        ]
      },
      // For a square, untinted area there is no corner to clear and the inset
      // just reads as a gap.
      flush: {
        true: 'm-0',
        false: ''
      }
    },
    defaultVariants: { orientation: 'vertical', flush: false }
  }
)

// Base UI writes the thumb's length and its scroll offset as inline styles.
// `size-full` fills the track's thickness and yields the other axis to that
// inline length — `flex-1` would take over the main axis and strand the thumb
// mid-track.
export const scrollAreaThumbVariants = cva([
  'size-full rounded-full bg-[var(--intent-border-strong)]',
  'motion-safe:transition-colors motion-safe:duration-moderate motion-safe:ease-enter',
  'hover:bg-[var(--intent-bg-inverted)]'
])

export const scrollAreaCornerVariants = cva('bg-transparent')
