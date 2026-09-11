'use client'

import type { RefAttributes } from 'react'

import { ScrollArea as ScrollAreaPrimitive } from '@base-ui/react/scroll-area'

import { cn } from '@oztix/roadie-core/utils'

import { type ScrollAreaFade, scrollAreaViewportVariants } from './variants'

export type ScrollAreaViewportProps = ScrollAreaPrimitive.Viewport.Props &
  RefAttributes<HTMLDivElement> & {
    /**
     * Fade the content out at any edge with more to scroll. `y` fades top and
     * bottom, `x` fades left and right, `both` intersects the two. Override
     * `--scroll-area-fade-size` (default `2rem`) to retune the depth.
     *
     * A mask applies to everything the viewport paints — including a
     * `position: sticky` header, which will fade as it pins. Leave this at
     * `none` for areas with sticky content.
     *
     * @default 'none'
     */
    fade?: ScrollAreaFade
  }

// Read `scrollTop` / call `scrollTo` / listen for `scroll` on this element,
// not the root.
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
