'use client'

import type { RefAttributes } from 'react'

import { Popover as PopoverPrimitive } from '@base-ui/react/popover'

export type PopoverCloseProps = PopoverPrimitive.Close.Props &
  RefAttributes<HTMLButtonElement>

export function PopoverClose({ className, ...props }: PopoverCloseProps) {
  return (
    <PopoverPrimitive.Close
      data-slot='popover-close'
      className={className}
      {...props}
    />
  )
}

PopoverClose.displayName = 'Popover.Close'
