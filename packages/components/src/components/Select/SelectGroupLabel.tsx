'use client'

import type { RefAttributes } from 'react'

import { Select as SelectPrimitive } from '@base-ui/react/select'

import { cn } from '@oztix/roadie-core/utils'

import { optionGroupLabelClass } from '../../variants'

export type SelectGroupLabelProps = SelectPrimitive.GroupLabel.Props &
  RefAttributes<HTMLDivElement>

export function SelectGroupLabel({
  className,
  ...props
}: SelectGroupLabelProps) {
  return (
    <SelectPrimitive.GroupLabel
      data-slot='select-group-label'
      className={cn(optionGroupLabelClass, className)}
      {...props}
    />
  )
}

SelectGroupLabel.displayName = 'Select.GroupLabel'
