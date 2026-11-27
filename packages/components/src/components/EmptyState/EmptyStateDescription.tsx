import type { ComponentProps } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { emptyStateDescriptionClass } from './variants'

export type EmptyStateDescriptionProps = ComponentProps<'p'>

export function EmptyStateDescription({
  className,
  ...props
}: EmptyStateDescriptionProps) {
  return (
    <p
      data-slot='empty-state-description'
      className={cn(emptyStateDescriptionClass, className)}
      {...props}
    />
  )
}

EmptyStateDescription.displayName = 'EmptyState.Description'
