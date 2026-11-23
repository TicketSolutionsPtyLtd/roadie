'use client'

import type { RefAttributes } from 'react'

import { Combobox as ComboboxPrimitive } from '@base-ui/react/combobox'

import { cn } from '@oztix/roadie-core/utils'

import { useVirtualGroup } from '../../utils/virtualList'

export type ComboboxGroupProps = ComboboxPrimitive.Group.Props &
  RefAttributes<HTMLDivElement>

export function ComboboxGroup({
  className,
  ref,
  ...props
}: ComboboxGroupProps) {
  return (
    <ComboboxPrimitive.Group
      data-slot='combobox-group'
      className={cn('[&+&]:mt-1 data-[virtual-group=rest]:mt-1', className)}
      {...props}
      {...useVirtualGroup(ref)}
    />
  )
}

ComboboxGroup.displayName = 'Combobox.Group'
