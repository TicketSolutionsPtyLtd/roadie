'use client'

import type { RefAttributes } from 'react'

import { Collapsible as CollapsiblePrimitive } from '@base-ui/react/collapsible'

export type CollapsibleRootProps = CollapsiblePrimitive.Root.Props &
  RefAttributes<HTMLDivElement>

export function CollapsibleRoot(props: CollapsibleRootProps) {
  return <CollapsiblePrimitive.Root data-slot='collapsible' {...props} />
}

CollapsibleRoot.displayName = 'Collapsible.Root'
