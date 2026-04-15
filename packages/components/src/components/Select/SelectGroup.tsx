'use client'

import type { RefAttributes } from 'react'

import { Select as SelectPrimitive } from '@base-ui/react/select'

import { cn } from '@oztix/roadie-core/utils'

export type SelectGroupProps = SelectPrimitive.Group.Props &
  RefAttributes<HTMLDivElement>

export function SelectGroup({ className, ...props }: SelectGroupProps) {
  return (
    <SelectPrimitive.Group
      data-slot='select-group'
      className={cn('[&+&]:mt-1', className)}
      {...props}
    />
  )
}

SelectGroup.displayName = 'Select.Group'
