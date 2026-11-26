import type { ComponentProps } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { EmptyStateSizeProvider } from './EmptyStateSizeProvider'
import {
  type EmptyStateIntent,
  type EmptyStateSize,
  emptyStateVariants
} from './variants'

export type EmptyStateProps = ComponentProps<'div'> & {
  /** Scales typography, spacing, and media together. */
  size?: EmptyStateSize
  /** Palette for the empty state. Omit to inherit from an ancestor. */
  intent?: EmptyStateIntent
}

// The parts style themselves off data-size; only IconTile reads the provider.
export function EmptyStateRoot({
  className,
  size = 'md',
  intent,
  ...props
}: EmptyStateProps) {
  return (
    <EmptyStateSizeProvider size={size}>
      <div
        data-slot='empty-state'
        data-size={size}
        className={cn(emptyStateVariants({ size, intent }), className)}
        {...props}
      />
    </EmptyStateSizeProvider>
  )
}

EmptyStateRoot.displayName = 'EmptyState.Root'
