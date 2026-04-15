'use client'

import type { RefAttributes } from 'react'

import { Combobox as ComboboxPrimitive } from '@base-ui/react/combobox'

import { cn } from '@oztix/roadie-core/utils'

export type ComboboxGroupProps = ComboboxPrimitive.Group.Props &
  RefAttributes<HTMLDivElement>

export function ComboboxGroup({ className, ...props }: ComboboxGroupProps) {
  return (
    <ComboboxPrimitive.Group
      data-slot='combobox-group'
      className={cn('[&+&]:mt-1', className)}
      {...props}
    />
  )
}

ComboboxGroup.displayName = 'Combobox.Group'
