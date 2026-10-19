import { cva } from 'class-variance-authority'

// A pill on one row, and a rounded box once it wraps or stands up.
export const toolbarSurfaceVariants = cva('w-fit max-w-full rounded-3xl', {
  variants: {
    emphasis: {
      normal: 'emphasis-normal',
      subtle: 'emphasis-subtle',
      // Each has a border, seen or not, so every emphasis is one size.
      subtler: 'border border-transparent',
      raised: 'emphasis-raised is-translucent border',
      floating: 'emphasis-floating is-translucent border'
    }
  },
  defaultVariants: { emphasis: 'normal' }
})

export const toolbarVariants = cva('flex min-w-0 items-center gap-1 p-1', {
  variants: {
    orientation: {
      // Touch screens and phones keep one row and scroll it sideways.
      horizontal:
        'flex-wrap pointer-coarse:w-max pointer-coarse:flex-nowrap max-md:w-max max-md:flex-nowrap',
      vertical: 'flex-col items-stretch *:w-auto'
    }
  },
  defaultVariants: { orientation: 'horizontal' }
})
