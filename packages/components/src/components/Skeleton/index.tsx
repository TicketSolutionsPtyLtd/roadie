import type { ComponentProps } from 'react'

import { type VariantProps, cva } from 'class-variance-authority'

import { cn } from '@oztix/roadie-core/utils'

import { intentVariants } from '../../variants'

/** Holds the space loading content will fill; `aria-hidden`, so the region owning the fetch announces the wait. */
export const skeletonVariants = cva('animate-shimmer block', {
  variants: {
    intent: intentVariants,
    emphasis: {
      subtle: 'emphasis-subtle',
      subtler: 'emphasis-subtler'
    },
    shape: {
      text: 'h-[1lh] w-full rounded-sm',
      block: 'h-24 w-full rounded-xl',
      circle: 'size-10 rounded-full'
    }
  },
  defaultVariants: {
    emphasis: 'subtle',
    shape: 'text'
  }
})

/** A literal union, because `react-docgen-typescript` can't read CVA types. */
export type SkeletonShape = 'text' | 'block' | 'circle'

export interface SkeletonProps
  extends ComponentProps<'div'>, VariantProps<typeof skeletonVariants> {}

export function Skeleton({
  className,
  intent,
  emphasis,
  shape,
  ...props
}: SkeletonProps) {
  return (
    <div
      aria-hidden='true'
      className={cn(skeletonVariants({ intent, emphasis, shape, className }))}
      {...props}
      // After the spread: the pending ring reads it to tell a pane is still loading.
      data-slot='skeleton'
    />
  )
}

Skeleton.displayName = 'Skeleton'
