import { cva } from 'class-variance-authority'

import type { ToolbarEmphasis } from './ToolbarContext'

const insetSurface: Record<ToolbarEmphasis, string> = {
  normal: 'emphasis-normal',
  subtle: 'emphasis-subtle',
  // Each has a border, seen or not, so every emphasis is one size.
  subtler: 'border border-transparent',
  raised: 'emphasis-raised is-translucent border',
  floating: 'emphasis-floating is-translucent border'
}

// The parent draws any edge and clips the corners, so a flush toolbar keeps
// only the fill.
const flushSurface: Record<ToolbarEmphasis, string> = {
  normal: 'bg-normal',
  subtle: 'bg-subtle',
  subtler: '',
  raised: 'bg-raised',
  floating: 'surface-floating is-translucent'
}

const emphases = Object.keys(insetSurface) as ToolbarEmphasis[]

// A pill on one row, and a rounded box once it wraps or stands up.
export const toolbarSurfaceVariants = cva('w-fit max-w-full', {
  variants: {
    flush: { false: 'rounded-3xl', true: '' },
    emphasis: { normal: '', subtle: '', subtler: '', raised: '', floating: '' }
  },
  compoundVariants: emphases.flatMap((emphasis) => [
    { flush: false, emphasis, className: insetSurface[emphasis] },
    { flush: true, emphasis, className: flushSurface[emphasis] }
  ]),
  defaultVariants: { flush: false, emphasis: 'normal' }
})

// Inset alike, docked or not, so a control's hover and focus ring clear the
// edges, where the scrolling row would clip them.
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
