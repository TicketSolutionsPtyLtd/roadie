'use client'

import type { RefAttributes } from 'react'

import { ScrollArea as ScrollAreaPrimitive } from '@base-ui/react/scroll-area'

import { cn } from '@oztix/roadie-core/utils'

import { scrollAreaCornerVariants } from './variants'

export type ScrollAreaCornerProps = ScrollAreaPrimitive.Corner.Props &
  RefAttributes<HTMLDivElement>

export function ScrollAreaCorner({
  className,
  ...props
}: ScrollAreaCornerProps) {
  return (
    <ScrollAreaPrimitive.Corner
      data-slot='scroll-area-corner'
      className={cn(scrollAreaCornerVariants({ className }))}
      {...props}
    />
  )
}

ScrollAreaCorner.displayName = 'ScrollArea.Corner'
