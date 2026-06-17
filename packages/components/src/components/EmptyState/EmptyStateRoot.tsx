'use client'

import type { ComponentProps } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { EmptyStateContext } from './EmptyStateContext'
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

export function EmptyStateRoot({
  className,
  size = 'md',
  intent,
  ...props
}: EmptyStateProps) {
  return (
    <EmptyStateContext value={size}>
      <div
        data-slot='empty-state'
        className={cn(emptyStateVariants({ size, intent }), className)}
        {...props}
      />
    </EmptyStateContext>
  )
}

EmptyStateRoot.displayName = 'EmptyState.Root'
