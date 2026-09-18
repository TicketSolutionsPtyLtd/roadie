'use client'

import type { RefAttributes } from 'react'

import { ScrollArea as ScrollAreaPrimitive } from '@base-ui/react/scroll-area'

import { cn } from '@oztix/roadie-core/utils'

import { type ScrollAreaFade, scrollAreaViewportVariants } from './variants'

export type ScrollAreaViewportProps = ScrollAreaPrimitive.Viewport.Props &
  RefAttributes<HTMLDivElement> & {
    /** Fade edges with more to scroll; sticky content fades too. @default 'none' */
    fade?: ScrollAreaFade
  }

// The scroll container is this element, not the root.
export function ScrollAreaViewport({
  className,
  fade,
  ...props
}: ScrollAreaViewportProps) {
  return (
    <ScrollAreaPrimitive.Viewport
      data-slot='scroll-area-viewport'
      className={cn(scrollAreaViewportVariants({ fade, className }))}
      {...props}
    />
  )
}

ScrollAreaViewport.displayName = 'ScrollArea.Viewport'
