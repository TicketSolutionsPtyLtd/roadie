'use client'

import type { ComponentProps } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { paneActionsClass } from './variants'

export type PaneActionsProps = ComponentProps<'div'>

/** Trailing slot in the header's top row. Direct child of `Pane.Header`. */
export function PaneActions({
  className,
  children,
  ...props
}: PaneActionsProps) {
  return (
    <div
      data-slot='pane-actions'
      className={cn(paneActionsClass, className)}
      {...props}
    >
      {children}
    </div>
  )
}

PaneActions.displayName = 'Pane.Actions'
