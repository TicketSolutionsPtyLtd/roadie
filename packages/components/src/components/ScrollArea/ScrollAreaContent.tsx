'use client'

import type { RefAttributes } from 'react'

import { ScrollArea as ScrollAreaPrimitive } from '@base-ui/react/scroll-area'

import { cn } from '@oztix/roadie-core/utils'

import { scrollAreaContentVariants } from './variants'

export type ScrollAreaContentProps = ScrollAreaPrimitive.Content.Props &
  RefAttributes<HTMLDivElement> & {
    /**
     * Size to the content's natural width; turn off to follow the viewport's.
     *
     * @default true
     */
    fitWidth?: boolean
  }

// Base UI only re-measures overflow on content resize through this wrapper.
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
      // Base UI sets `min-width: fit-content` inline.
      style={fitWidth ? style : { minWidth: 0, ...style }}
      {...props}
    />
  )
}

ScrollAreaContent.displayName = 'ScrollArea.Content'
