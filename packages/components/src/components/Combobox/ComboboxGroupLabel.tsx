'use client'

import type { RefAttributes } from 'react'

import { Combobox as ComboboxPrimitive } from '@base-ui/react/combobox'

import { cn } from '@oztix/roadie-core/utils'

export type ComboboxGroupLabelProps = ComboboxPrimitive.GroupLabel.Props &
  RefAttributes<HTMLDivElement>

export function ComboboxGroupLabel({
  className,
  ...props
}: ComboboxGroupLabelProps) {
  return (
    <ComboboxPrimitive.GroupLabel
      data-slot='combobox-group-label'
      className={cn(
        'px-2 py-1.5 text-xs font-medium text-subtle select-none',
        className
      )}
      {...props}
    />
  )
}

ComboboxGroupLabel.displayName = 'Combobox.GroupLabel'
