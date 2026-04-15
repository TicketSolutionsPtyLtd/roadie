'use client'

import type { RefAttributes } from 'react'

import { Select as SelectPrimitive } from '@base-ui/react/select'
import { CheckIcon } from '@phosphor-icons/react/ssr'

import { cn } from '@oztix/roadie-core/utils'

export type SelectItemIndicatorProps = SelectPrimitive.ItemIndicator.Props &
  RefAttributes<HTMLSpanElement>

export function SelectItemIndicator({
  className,
  children,
  ...props
}: SelectItemIndicatorProps) {
  return (
    <SelectPrimitive.ItemIndicator
      data-slot='select-item-indicator'
      className={cn('shrink-0 text-subtle', className)}
      {...props}
    >
      {children ?? <CheckIcon weight='bold' className='size-4' />}
    </SelectPrimitive.ItemIndicator>
  )
}

SelectItemIndicator.displayName = 'Select.ItemIndicator'
