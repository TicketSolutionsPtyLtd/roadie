'use client'

import type { RefAttributes } from 'react'

import { ScrollArea as ScrollAreaPrimitive } from '@base-ui/react/scroll-area'

import { cn } from '@oztix/roadie-core/utils'

import { scrollAreaScrollbarVariants } from './variants'

export type ScrollAreaScrollbarProps = ScrollAreaPrimitive.Scrollbar.Props &
  RefAttributes<HTMLDivElement> & {
    /**
     * Sit hard against the area's edge instead of inset from it. The default
     * inset keeps the bar's ends clear of a rounded corner; a square,
     * untinted area has no corner to clear, so the inset just reads as a gap.
     *
     * @default false
     */
    flush?: boolean
  }

export function ScrollAreaScrollbar({
  className,
  orientation = 'vertical',
  flush,
  ...props
}: ScrollAreaScrollbarProps) {
  return (
    <ScrollAreaPrimitive.Scrollbar
      data-slot='scroll-area-scrollbar'
      orientation={orientation}
      className={cn(
        scrollAreaScrollbarVariants({ orientation, flush, className })
      )}
      {...props}
    />
  )
}

ScrollAreaScrollbar.displayName = 'ScrollArea.Scrollbar'
