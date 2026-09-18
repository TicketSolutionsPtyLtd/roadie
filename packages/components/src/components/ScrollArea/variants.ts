import { cva } from 'class-variance-authority'

// `overflow-hidden` stops edge-pinned scrollbars painting over a rounded corner.
export const scrollAreaRootVariants = cva(
  'relative min-h-0 min-w-0 overflow-hidden'
)

export type ScrollAreaFade = 'none' | 'y' | 'x' | 'both'

// Static literals only: Tailwind scans the dist as text.
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

// Base UI sets `overflow: scroll` inline; clamp an axis via `style`, not a class.
export const scrollAreaViewportVariants = cva(
  [
    // Keeps the focus ring inside the root's clipped corners.
    'size-full overscroll-contain rounded-[inherit]',
    'focus-visible:outline-2 focus-visible:-outline-offset-2',
    'focus-visible:outline-[var(--intent-border-strong)]',
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

// Touch-scroll never reveals the thumb, so coarse pointers keep the native one.
export const scrollAreaScrollbarVariants = cva(
  [
    // Above low-z sticky accents, below `z-sticky` pane headers.
    'z-docked flex touch-none p-0.5 select-none pointer-coarse:hidden',
    // Reveal is gated on overflow because `keepMounted` skips Base UI's hiding.
    'opacity-0',
    'motion-safe:transition-opacity motion-safe:duration-moderate motion-safe:ease-enter',
    'motion-reduce:transition-none'
  ],
  {
    variants: {
      // Longhands, so tailwind-merge keeps one side when a consumer overrides the other.
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
      flush: {
        true: 'm-0',
        false: ''
      }
    },
    defaultVariants: { orientation: 'vertical', flush: false }
  }
)

// Not `flex-1`: it would override Base UI's inline thumb length.
export const scrollAreaThumbVariants = cva([
  'size-full rounded-full bg-[var(--intent-border-strong)]',
  'motion-safe:transition-colors motion-safe:duration-moderate motion-safe:ease-enter',
  'hover:bg-[var(--intent-bg-inverted)]'
])

export const scrollAreaCornerVariants = cva('bg-transparent')
