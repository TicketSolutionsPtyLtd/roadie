import type { ComponentProps } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { paneFooterClass } from './variants'

export type PaneFooterProps = ComponentProps<'div'>

/** Sticky chrome at the foot of a pane. */
export function PaneFooter({ className, ...props }: PaneFooterProps) {
  return (
    <div
      data-slot='pane-footer'
      className={cn(paneFooterClass, className)}
      {...props}
    />
  )
}

PaneFooter.displayName = 'Pane.Footer'
