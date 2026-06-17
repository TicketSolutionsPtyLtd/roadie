import type { ComponentProps } from 'react'

import { cn } from '@oztix/roadie-core/utils'

export type EmptyStateActionsProps = ComponentProps<'div'>

export function EmptyStateActions({
  className,
  ...props
}: EmptyStateActionsProps) {
  return (
    <div
      data-slot='empty-state-actions'
      className={cn(
        'flex flex-wrap items-center justify-center gap-3',
        className
      )}
      {...props}
    />
  )
}

EmptyStateActions.displayName = 'EmptyState.Actions'
