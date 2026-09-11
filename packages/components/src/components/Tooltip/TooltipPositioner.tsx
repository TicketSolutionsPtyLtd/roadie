'use client'

import type { RefAttributes } from 'react'

import { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip'

import { cn } from '@oztix/roadie-core/utils'

export type TooltipPositionerProps = TooltipPrimitive.Positioner.Props &
  RefAttributes<HTMLDivElement>

export function TooltipPositioner({
  className,
  sideOffset = 6,
  ...props
}: TooltipPositionerProps) {
  return (
    <TooltipPrimitive.Positioner
      data-slot='tooltip-positioner'
      className={cn('z-tooltip', className)}
      sideOffset={sideOffset}
      {...props}
    />
  )
}

TooltipPositioner.displayName = 'Tooltip.Positioner'
