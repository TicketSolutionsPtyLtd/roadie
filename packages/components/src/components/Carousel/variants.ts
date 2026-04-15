import { cva } from 'class-variance-authority'

// The `overflow` variant controls how slides escape the viewport box:
//
//   `hidden`  — slides are clipped at the viewport edge. Classic behaviour.
//   `visible` — slides can extend indefinitely. Useful on wide screens
//               where you deliberately want peeking slides to remain fully
//               rendered in the margin area.
//   `subtle`  — the default. Slides bleed past the viewport edges by the
//               same amount as the inner gutter, and fade to the page
//               background via `::before` / `::after` gradient overlays.
//               Gives the scroll hint of `visible` without the reading
//               noise of half-clipped cards at the edges.
//
// Horizontal subtle bleeds with `-mx-4 px-4` (sm+: `-mx-6 px-6`); the
// gradients cover those padding strips. Vertical subtle is the same idea
// rotated to the block axis.
//
// The `-my-4 py-4` on horizontal preserves the small vertical overflow
// bleed needed to let `shadow-md` (~6–10px) escape the viewport box on
// `Card` slides without the clip region eating the tint.
export const carouselContentVariants = cva(
  'relative focus-visible:outline-none',
  {
    variants: {
      direction: {
        horizontal: '-my-4 py-4',
        vertical: undefined
      },
      overflow: {
        hidden: 'overflow-clip',
        visible: 'overflow-visible',
        subtle: 'overflow-clip'
      }
    },
    compoundVariants: [
      {
        overflow: 'subtle',
        direction: 'horizontal',
        class: [
          '-mx-4 px-4 sm:-mx-6 sm:px-6',
          'before:pointer-events-none before:absolute before:inset-y-0 before:left-0 before:z-10',
          'before:w-4 sm:before:w-6',
          'before:bg-linear-to-r before:from-[var(--intent-bg-normal)] before:to-transparent',
          'after:pointer-events-none after:absolute after:inset-y-0 after:right-0 after:z-10',
          'after:w-4 sm:after:w-6',
          'after:bg-linear-to-l after:from-[var(--intent-bg-normal)] after:to-transparent'
        ].join(' ')
      },
      {
        // Vertical subtle intentionally omits the negative block-axis
        // margin — its axis collides with Carousel.Header sitting above
        // it, and pulling Content upward would overlap the header. The
        // py-4 padding creates the fade area inside Content's own box
        // and the Embla container's -mt-4 still lets items scroll
        // through that padding during transitions.
        overflow: 'subtle',
        direction: 'vertical',
        class: [
          'py-4',
          'before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:z-10',
          'before:h-4',
          'before:bg-linear-to-b before:from-[var(--intent-bg-normal)] before:to-transparent',
          'after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:z-10',
          'after:h-4',
          'after:bg-linear-to-t after:from-[var(--intent-bg-normal)] after:to-transparent'
        ].join(' ')
      }
    ],
    defaultVariants: { direction: 'horizontal', overflow: 'subtle' }
  }
)

export const carouselContainerVariants = cva('flex', {
  variants: {
    direction: {
      horizontal: '-ml-4',
      vertical: '-mt-4 h-full flex-col'
    }
  },
  defaultVariants: { direction: 'horizontal' }
})

export const carouselItemVariants = cva(
  'min-h-0 min-w-0 shrink-0 grow-0 basis-full',
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

export const carouselDotsVariants = cva('flex items-center justify-center', {
  variants: {
    direction: {
      horizontal: 'flex-row gap-1.5',
      vertical: 'flex-col gap-1.5'
    }
  },
  defaultVariants: { direction: 'horizontal' }
})

// Literal union (rather than `VariantProps<typeof carouselContentVariants>`)
// so that `react-docgen-typescript` — which can't drill into CVA's
// conditional types — can extract the three values and surface them in
// the docs site's <PropsDefinitions> table.
export type CarouselContentOverflow = 'hidden' | 'visible' | 'subtle'
