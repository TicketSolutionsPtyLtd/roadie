import type { ComponentProps } from 'react'

import { cn } from '@oztix/roadie-core/utils'

export type EmptyStateActionsProps = ComponentProps<'div'>

/**
 * Centered action row. Holds the consumer's own `<Button>`s — zero, one, or
 * two. Does not re-wrap Button. Server-safe (no context read).
 */
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
