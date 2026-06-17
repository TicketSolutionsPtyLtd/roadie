'use client'

import { type ComponentProps, use } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { EmptyStateContext } from './EmptyStateContext'
import { emptyStateDescriptionVariants } from './variants'

export type EmptyStateDescriptionProps = ComponentProps<'p'>

export function EmptyStateDescription({
  className,
  ...props
}: EmptyStateDescriptionProps) {
  const size = use(EmptyStateContext)
  return (
    <p
      data-slot='empty-state-description'
      className={cn(emptyStateDescriptionVariants({ size }), className)}
      {...props}
    />
  )
}

EmptyStateDescription.displayName = 'EmptyState.Description'
