'use client'

import type { RefAttributes } from 'react'

import { Collapsible as CollapsiblePrimitive } from '@base-ui/react/collapsible'

import { cn } from '@oztix/roadie-core/utils'

export type CollapsiblePanelProps = CollapsiblePrimitive.Panel.Props &
  RefAttributes<HTMLDivElement>

export function CollapsiblePanel({
  className,
  ...props
}: CollapsiblePanelProps) {
  return (
    <CollapsiblePrimitive.Panel
      data-slot='collapsible-panel'
      className={cn('is-disclosure-animated', className)}
      {...props}
    />
  )
}

CollapsiblePanel.displayName = 'Collapsible.Panel'
