'use client'

import type { RefAttributes } from 'react'

import { Popover as PopoverPrimitive } from '@base-ui/react/popover'

import { cn } from '@oztix/roadie-core/utils'

export type PopoverPositionerProps = PopoverPrimitive.Positioner.Props &
  RefAttributes<HTMLDivElement>

export function PopoverPositioner({
  className,
  sideOffset = 8,
  ...props
}: PopoverPositionerProps) {
  return (
    <PopoverPrimitive.Positioner
      data-slot='popover-positioner'
      className={cn('z-popover', className)}
      sideOffset={sideOffset}
      {...props}
    />
  )
}

PopoverPositioner.displayName = 'Popover.Positioner'
