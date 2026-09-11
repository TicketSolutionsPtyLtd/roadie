'use client'

import type { RefAttributes } from 'react'

import { ScrollArea as ScrollAreaPrimitive } from '@base-ui/react/scroll-area'

import { cn } from '@oztix/roadie-core/utils'

import { scrollAreaContentVariants } from './variants'

export type ScrollAreaContentProps = ScrollAreaPrimitive.Content.Props &
  RefAttributes<HTMLDivElement> & {
    /**
     * Size the wrapper to its content's natural width — what a horizontally
     * scrolling area needs to measure correctly. Turn it off when the wrapper
     * is only there so the area re-measures as its content changes, and the
     * width should still follow the viewport.
     *
     * @default true
     */
    fitWidth?: boolean
  }

/**
 * Wraps the scrolling content. Base UI watches this element with a
 * `ResizeObserver`; the viewport alone is only observed for its own box, so
 * without this wrapper an area whose content changes height keeps whatever
 * overflow state it had — most visibly, a scrollbar that stays after the
 * content shrinks.
 */
export function ScrollAreaContent({
  className,
  fitWidth = true,
  style,
  ...props
}: ScrollAreaContentProps) {
  return (
    <ScrollAreaPrimitive.Content
      data-slot='scroll-area-content'
      className={cn(scrollAreaContentVariants({ className }))}
      // Base UI sets `min-width: fit-content` inline, so only a style can
      // release it.
      style={fitWidth ? style : { minWidth: 0, ...style }}
      {...props}
    />
  )
}

ScrollAreaContent.displayName = 'ScrollArea.Content'
