'use client'

import type { RefAttributes } from 'react'

import { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip'

export type TooltipTriggerProps = TooltipPrimitive.Trigger.Props &
  RefAttributes<HTMLButtonElement>

export function TooltipTrigger(props: TooltipTriggerProps) {
  return <TooltipPrimitive.Trigger data-slot='tooltip-trigger' {...props} />
}

TooltipTrigger.displayName = 'Tooltip.Trigger'
