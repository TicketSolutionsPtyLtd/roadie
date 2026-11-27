'use client'

import type { RefAttributes } from 'react'

import { ScrollArea as ScrollAreaPrimitive } from '@base-ui/react/scroll-area'

import { mergeClassName } from '../../utils/mergeClassName'
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
      className={mergeClassName(
        scrollAreaScrollbarVariants({ orientation, flush }),
        className
      )}
      {...props}
    />
  )
}

ScrollAreaScrollbar.displayName = 'ScrollArea.Scrollbar'
