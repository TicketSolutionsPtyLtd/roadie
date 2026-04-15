'use client'

import type { RefAttributes } from 'react'

import { Select as SelectPrimitive } from '@base-ui/react/select'

import { cn } from '@oztix/roadie-core/utils'

export type SelectValueProps = SelectPrimitive.Value.Props &
  RefAttributes<HTMLSpanElement>

export function SelectValue({ className, ...props }: SelectValueProps) {
  return (
    <SelectPrimitive.Value
      data-slot='select-value'
      className={cn('truncate data-[placeholder]:text-subtle', className)}
      {...props}
    />
  )
}

SelectValue.displayName = 'Select.Value'
