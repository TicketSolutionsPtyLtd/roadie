'use client'

import type { RefAttributes } from 'react'

import { Popover as PopoverPrimitive } from '@base-ui/react/popover'

import { cn } from '@oztix/roadie-core/utils'

export type PopoverDescriptionProps = PopoverPrimitive.Description.Props &
  RefAttributes<HTMLParagraphElement>

export function PopoverDescription({
  className,
  ...props
}: PopoverDescriptionProps) {
  return (
    <PopoverPrimitive.Description
      data-slot='popover-description'
      className={cn('text-sm text-subtle', className)}
      {...props}
    />
  )
}

PopoverDescription.displayName = 'Popover.Description'
