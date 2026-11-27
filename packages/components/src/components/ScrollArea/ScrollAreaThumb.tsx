'use client'

import type { RefAttributes } from 'react'

import { ScrollArea as ScrollAreaPrimitive } from '@base-ui/react/scroll-area'

import { mergeClassName } from '../../utils/mergeClassName'
import { scrollAreaThumbVariants } from './variants'

export type ScrollAreaThumbProps = ScrollAreaPrimitive.Thumb.Props &
  RefAttributes<HTMLDivElement>

export function ScrollAreaThumb({ className, ...props }: ScrollAreaThumbProps) {
  return (
    <ScrollAreaPrimitive.Thumb
      data-slot='scroll-area-thumb'
      className={mergeClassName(scrollAreaThumbVariants(), className)}
      {...props}
    />
  )
}

ScrollAreaThumb.displayName = 'ScrollArea.Thumb'
