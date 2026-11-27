import type { ComponentProps } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { emptyStateIllustrationClass } from './variants'

export type EmptyStateIllustrationProps = ComponentProps<'div'>

export function EmptyStateIllustration({
  className,
  ...props
}: EmptyStateIllustrationProps) {
  return (
    <div
      data-slot='empty-state-illustration'
      className={cn(emptyStateIllustrationClass, className)}
      {...props}
    />
  )
}

EmptyStateIllustration.displayName = 'EmptyState.Illustration'
