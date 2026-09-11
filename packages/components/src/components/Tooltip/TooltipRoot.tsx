'use client'

import { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip'

export type TooltipRootProps = TooltipPrimitive.Root.Props

export function TooltipRoot(props: TooltipRootProps) {
  return <TooltipPrimitive.Root {...props} />
}

TooltipRoot.displayName = 'Tooltip.Root'
