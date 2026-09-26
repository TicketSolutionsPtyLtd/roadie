'use client'

import { type RefAttributes, useState } from 'react'

import { Collapsible as CollapsiblePrimitive } from '@base-ui/react/collapsible'

import { CollapsibleOpenContext } from './CollapsibleContext'

export type CollapsibleRootProps = CollapsiblePrimitive.Root.Props &
  RefAttributes<HTMLDivElement>

// Base UI keeps its open state private, so the root owns it and shares it
// with parts such as Collapsible.Text that change shape when open.
export function CollapsibleRoot({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  ...props
}: CollapsibleRootProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen)
  const open = openProp ?? uncontrolledOpen

  const handleOpenChange: CollapsibleRootProps['onOpenChange'] = (
    next,
    details
  ) => {
    onOpenChange?.(next, details)
    if (openProp === undefined && !details.isCanceled) setUncontrolledOpen(next)
  }

  return (
    <CollapsibleOpenContext.Provider value={open}>
      <CollapsiblePrimitive.Root
        data-slot='collapsible'
        open={open}
        onOpenChange={handleOpenChange}
        {...props}
      />
    </CollapsibleOpenContext.Provider>
  )
}

CollapsibleRoot.displayName = 'Collapsible.Root'
