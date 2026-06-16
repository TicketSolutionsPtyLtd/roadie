'use client'

import type { RefAttributes } from 'react'

import { Popover as PopoverPrimitive } from '@base-ui/react/popover'

import { cn } from '@oztix/roadie-core/utils'

export type PopoverTitleProps = PopoverPrimitive.Title.Props &
  RefAttributes<HTMLHeadingElement>

export function PopoverTitle({ className, ...props }: PopoverTitleProps) {
  return (
    <PopoverPrimitive.Title
      data-slot='popover-title'
      className={cn('text-display-ui-6 text-strong', className)}
      {...props}
    />
  )
}

PopoverTitle.displayName = 'Popover.Title'
