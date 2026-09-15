'use client'

import { type ComponentProps, type ReactElement, use } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { PaneContext } from './PaneContext'
import { PaneTitleCompact } from './PaneTitleCompact'
import { paneTitleVariants } from './variants'

export type PaneTitleProps = ComponentProps<'h2'> & {
  /** Replaces the h2. The compact title is unaffected. */
  render?: (props: ComponentProps<'h2'>) => ReactElement
}

/** The pane's heading, plus a compact title that scrolls the pane to the top. A direct child of `Pane.Header`. */
export function PaneTitle({
  className,
  children,
  render,
  ...props
}: PaneTitleProps) {
  const pane = use(PaneContext)
  const collapsible = pane !== null
  const collapsed = pane?.collapsed ?? false

  const resolved = {
    'data-slot': 'pane-title',
    className: cn(paneTitleVariants({ collapsible, collapsed }), className),
    children: collapsible ? (
      // A clipping item, or the row can't shrink below its content.
      <span className='overflow-hidden'>{children}</span>
    ) : (
      children
    ),
    ...props
  }

  return (
    <>
      {render ? render(resolved) : <h2 {...resolved} />}
      <PaneTitleCompact>{children}</PaneTitleCompact>
    </>
  )
}

PaneTitle.displayName = 'Pane.Title'
