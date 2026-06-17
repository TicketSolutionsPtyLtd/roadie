'use client'

import { type ComponentProps, use } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { EmptyStateContext } from './EmptyStateContext'
import { emptyStateIllustrationVariants } from './variants'

export type EmptyStateIllustrationProps = ComponentProps<'div'>

/**
 * Media wrapper for a `SpotIllustration` (recommended at `size='md'`) or a
 * custom hero illustration — large `<img>` / SVG (recommended at `size='lg'`).
 * Centers and size-scales whatever is dropped inside.
 */
export function EmptyStateIllustration({
  className,
  ...props
}: EmptyStateIllustrationProps) {
  const size = use(EmptyStateContext)
  return (
    <div
      data-slot='empty-state-illustration'
      className={cn(emptyStateIllustrationVariants({ size }), className)}
      {...props}
    />
  )
}

EmptyStateIllustration.displayName = 'EmptyState.Illustration'
