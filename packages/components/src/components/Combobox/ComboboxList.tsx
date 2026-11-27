'use client'

import type { RefAttributes } from 'react'

import { Combobox as ComboboxPrimitive } from '@base-ui/react/combobox'

import { useListChildren } from '../../utils/virtualList'

export type ComboboxListProps = ComboboxPrimitive.List.Props &
  RefAttributes<HTMLDivElement>

export function ComboboxList({
  className,
  children,
  ...props
}: ComboboxListProps) {
  return (
    <ComboboxPrimitive.List
      data-slot='combobox-list'
      className={className}
      {...props}
    >
      {useListChildren(children)}
    </ComboboxPrimitive.List>
  )
}

ComboboxList.displayName = 'Combobox.List'
