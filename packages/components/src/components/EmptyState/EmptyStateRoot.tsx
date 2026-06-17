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
  /**
   * Scales typography, spacing, and the media slot together.
   * `sm` for an empty section, `md` (default) for a standalone empty
   * state, `lg` for a whole-page empty/404 screen.
   */
  size?: EmptyStateSize
  /**
   * Colour palette for the empty state. Sets the intent on the root so the
   * IconTile and Buttons inside inherit it. Omit to let the palette cascade
   * from an ancestor (the default — no intent class is applied).
   */
  intent?: EmptyStateIntent
}

/**
 * EmptyState root. Provides the size context and an unopinionated centered
 * layout. No background or border — wrap in a `Card` for a surface. Pass
 * `intent` to set the palette, or omit it to inherit from an ancestor via
 * the CSS cascade, so an IconTile or Button inside picks up the context.
 */
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
