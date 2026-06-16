'use client'

import type { RefAttributes } from 'react'

import { Popover as PopoverPrimitive } from '@base-ui/react/popover'

export type PopoverTriggerProps = PopoverPrimitive.Trigger.Props &
  RefAttributes<HTMLButtonElement>

export function PopoverTrigger({ className, ...props }: PopoverTriggerProps) {
  return (
    <PopoverPrimitive.Trigger
      data-slot='popover-trigger'
      className={className}
      {...props}
    />
  )
}

PopoverTrigger.displayName = 'Popover.Trigger'
