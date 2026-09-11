import { cva } from 'class-variance-authority'

import { intentVariants } from '../../variants'

/** The edge the drawer is anchored to. */
export type DrawerSide = 'bottom' | 'top' | 'left' | 'right'

/** The drawer's extent along its own axis. */
export type DrawerSize = 'sm' | 'md' | 'lg'

// Derived from `side` so the dismiss gesture can never disagree with the edge.
export const DRAWER_SWIPE_DIRECTION = {
  bottom: 'down',
  top: 'up',
  left: 'left',
  right: 'right'
} as const satisfies Record<DrawerSide, 'down' | 'up' | 'left' | 'right'>

// `justify-items-*`, not `justify-content-*`, keeps the track full-width so the
// popup's `max-w-*` resolves against the viewport.
export const drawerViewportVariants = cva('fixed inset-0 z-modal grid', {
  variants: {
    side: {
      bottom: 'items-end',
      top: 'items-start',
      left: 'justify-items-start',
      right: 'justify-items-end'
    }
  },
  defaultVariants: { side: 'bottom' }
})

export const drawerPopupVariants = cva(
  [
    // Flex, not fixed grid rows, so the body fills whatever space is left
    // whether or not a header or footer is present.
    'flex flex-col min-h-0 emphasis-floating motion-drawer',
    // Header, body and footer each read this inset; the body scrolls, so the
    // popup can't pad itself.
    '[--content-inset:--spacing(6)]'
  ],
  {
    variants: {
      intent: intentVariants,
      side: {
        bottom: 'w-full rounded-t-5xl',
        top: 'w-full rounded-b-5xl',
        left: 'h-full w-full rounded-r-2xl',
        right: 'h-full w-full rounded-l-2xl'
      },
      size: { sm: '', md: '', lg: '' }
    },
    compoundVariants: [
      { side: ['bottom', 'top'], size: 'sm', class: 'max-h-[50dvh]' },
      { side: ['bottom', 'top'], size: 'md', class: 'max-h-[75dvh]' },
      { side: ['bottom', 'top'], size: 'lg', class: 'max-h-[90dvh]' },
      { side: ['left', 'right'], size: 'sm', class: 'max-w-sm' },
      { side: ['left', 'right'], size: 'md', class: 'max-w-md' },
      { side: ['left', 'right'], size: 'lg', class: 'max-w-lg' }
    ],
    defaultVariants: { side: 'bottom', size: 'md' }
  }
)
