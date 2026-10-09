'use client'

import { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip'

import { useAccentScopeProps } from '../../providers/AccentScopeContext'

export type TooltipPortalProps = TooltipPrimitive.Portal.Props

export function TooltipPortal(props: TooltipPortalProps) {
  const scope = useAccentScopeProps(props.style)
  return <TooltipPrimitive.Portal {...props} {...scope} />
}

TooltipPortal.displayName = 'Tooltip.Portal'
