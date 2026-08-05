'use client'

import type { ComponentProps } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { paneActionsVariants } from './variants'

export type PaneActionsProps = ComponentProps<'div'>

/**
 * Trailing slot in the header's top row, opposite the back affordance.
 *
 * Must be a **direct child** of `Pane.Header` — it places itself in the
 * header's grid, and grid placement only reaches direct children.
 *
 * Where a small-screen affordance for a pane that yielded belongs: a
 * `Drawer` re-presenting the inspector is declared here, by the consumer.
 */
export function PaneActions({
  className,
  children,
  ...props
}: PaneActionsProps) {
  return (
    <div
      data-slot='pane-actions'
      className={cn(paneActionsVariants(), className)}
      {...props}
    >
      {children}
    </div>
  )
}

PaneActions.displayName = 'Pane.Actions'
