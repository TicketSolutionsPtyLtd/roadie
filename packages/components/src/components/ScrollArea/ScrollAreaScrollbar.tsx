'use client'

import type { RefAttributes } from 'react'

import { ScrollArea as ScrollAreaPrimitive } from '@base-ui/react/scroll-area'

import { cn } from '@oztix/roadie-core/utils'

import { scrollAreaScrollbarVariants } from './variants'

export type ScrollAreaScrollbarProps = ScrollAreaPrimitive.Scrollbar.Props &
  RefAttributes<HTMLDivElement> & {
    /** Sit against the edge instead of inset to clear a rounded corner. @default false */
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
