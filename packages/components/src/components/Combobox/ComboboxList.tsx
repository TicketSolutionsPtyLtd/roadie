'use client'

import type { RefAttributes } from 'react'

import { Combobox as ComboboxPrimitive } from '@base-ui/react/combobox'

export type ComboboxListProps = ComboboxPrimitive.List.Props &
  RefAttributes<HTMLDivElement>

export function ComboboxList({ className, ...props }: ComboboxListProps) {
  return (
    <ComboboxPrimitive.List
      data-slot='combobox-list'
      className={className}
      {...props}
    />
  )
}

ComboboxList.displayName = 'Combobox.List'
