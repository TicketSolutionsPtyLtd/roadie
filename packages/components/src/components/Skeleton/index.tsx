import type { ComponentProps } from 'react'

import { type VariantProps, cva } from 'class-variance-authority'

import { cn } from '@oztix/roadie-core/utils'

import { intentVariants } from '../../variants'

/**
 * A placeholder that holds the space content will occupy while it loads.
 *
 * One box per shape. `text` is one line tall at the inherited line height, so
 * it tracks the type size around it; `block` is a full-width panel; `circle`
 * is an avatar-sized disc. Width and height come from Tailwind utilities on
 * `className`, so a paragraph or a list row is several Skeletons in a grid.
 *
 * A highlight sweeps across the surface over a slow tint pulse. Reduced
 * motion drops the sweep and holds the tint.
 *
 * The root is `aria-hidden`, so nothing is announced from here. The region
 * that owns the fetch announces the wait, usually with `aria-busy` and a live
 * region carrying the result.
 */
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
      // Pinned after the spread: the pending ring reads this to tell a pane is
      // still loading.
      data-slot='skeleton'
    />
  )
}

Skeleton.displayName = 'Skeleton'
