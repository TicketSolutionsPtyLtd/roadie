import { cva } from 'class-variance-authority'

import { intentVariants } from '../../variants'

/** The edge the drawer is anchored to. */
export type DrawerSide = 'bottom' | 'top' | 'left' | 'right'

/** The drawer's extent along its own axis: `fit` follows the content, the rest are fixed. */
export type DrawerSize = 'fit' | 'sm' | 'md' | 'lg'

// Derived from `side` so the dismiss gesture can never disagree with the edge.
export const DRAWER_SWIPE_DIRECTION = {
  bottom: 'down',
  top: 'up',
  left: 'left',
  right: 'right'
} as const satisfies Record<DrawerSide, 'down' | 'up' | 'left' | 'right'>

// The track stays full-width, so `max-w-*` resolves against the viewport.
// Centred, a capped top or bottom drawer sits in the middle of a wide window.
// A top or bottom viewport pads out the far edge's safe area and a gap, like an iOS large sheet,
// and from `sm` the float off the near edge; every size is a share of what's left.
export const drawerViewportVariants = cva('fixed inset-0 z-modal grid', {
  variants: {
    side: {
      bottom:
        'items-end justify-items-center pt-[calc(max(env(safe-area-inset-top),--spacing(4))_+_--spacing(4))] sm:[--drawer-float:max(--spacing(2),env(safe-area-inset-bottom))] sm:pb-(--drawer-float)',
      top: 'items-start justify-items-center pb-[calc(max(env(safe-area-inset-bottom),--spacing(4))_+_--spacing(4))] sm:[--drawer-float:max(--spacing(2),env(safe-area-inset-top))] sm:pt-(--drawer-float)',
      left: 'justify-items-start',
      right: 'justify-items-end'
    }
  },
  defaultVariants: { side: 'bottom' }
})

export const drawerPopupVariants = cva(
  [
    // Flex, so the body fills the space whether or not a header or footer is present.
    // Clipped, so sticky chrome that bleeds to the edge follows the rounded corners.
    'flex flex-col min-h-0 overflow-clip emphasis-floating motion-drawer',
    // Header, body and footer each read this; the body scrolls, so the popup can't pad itself.
    '[--content-inset:--spacing(6)]'
  ],
  {
    variants: {
      intent: intentVariants,
      side: {
        // The cart drawer's width and float, so every sheet reads as the same object.
        bottom: 'w-full max-w-xl rounded-t-4xl sm:rounded-4xl',
        top: 'w-full max-w-xl rounded-b-4xl sm:rounded-4xl',
        left: 'h-full rounded-r-4xl',
        right: 'h-full rounded-l-4xl'
      },
      size: { fit: '', sm: '', md: '', lg: '' }
    },
    // Fixed heights hold still while the content changes under them; `fit` caps at the tallest.
    compoundVariants: [
      { side: ['bottom', 'top'], size: 'fit', class: 'max-h-full' },
      { side: ['bottom', 'top'], size: 'sm', class: 'h-1/2' },
      { side: ['bottom', 'top'], size: 'md', class: 'h-3/4' },
      { side: ['bottom', 'top'], size: 'lg', class: 'h-full' },
      { side: ['left', 'right'], size: 'fit', class: 'w-fit max-w-lg' },
      { side: ['left', 'right'], size: 'sm', class: 'w-full max-w-sm' },
      { side: ['left', 'right'], size: 'md', class: 'w-full max-w-md' },
      { side: ['left', 'right'], size: 'lg', class: 'w-full max-w-lg' }
    ],
    defaultVariants: { side: 'bottom', size: 'fit' }
  }
)
