'use client'

import type { RefAttributes } from 'react'

import { ScrollArea as ScrollAreaPrimitive } from '@base-ui/react/scroll-area'

import { mergeClassName } from '../../utils/mergeClassName'
import { scrollAreaRootVariants } from './variants'

export type ScrollAreaRootProps = ScrollAreaPrimitive.Root.Props &
  RefAttributes<HTMLDivElement>

export function ScrollAreaRoot({ className, ...props }: ScrollAreaRootProps) {
  return (
    <ScrollAreaPrimitive.Root
      data-slot='scroll-area'
      className={mergeClassName(scrollAreaRootVariants(), className)}
      {...props}
    />
  )
}

ScrollAreaRoot.displayName = 'ScrollArea.Root'
