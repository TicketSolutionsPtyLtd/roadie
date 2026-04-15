'use client'

import type { RefAttributes } from 'react'

import { Select as SelectPrimitive } from '@base-ui/react/select'

import { cn } from '@oztix/roadie-core/utils'

export type SelectGroupLabelProps = SelectPrimitive.GroupLabel.Props &
  RefAttributes<HTMLDivElement>

export function SelectGroupLabel({
  className,
  ...props
}: SelectGroupLabelProps) {
  return (
    <SelectPrimitive.GroupLabel
      data-slot='select-group-label'
      className={cn(
        'px-2 py-1.5 text-xs font-medium text-subtle select-none',
        className
      )}
      {...props}
    />
  )
}

SelectGroupLabel.displayName = 'Select.GroupLabel'
