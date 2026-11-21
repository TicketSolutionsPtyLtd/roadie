'use client'

import type { RefAttributes } from 'react'

import { Autocomplete as AutocompletePrimitive } from '@base-ui/react/autocomplete'

import { useListChildren } from '../../utils/virtualList'

export type AutocompleteListProps = AutocompletePrimitive.List.Props &
  RefAttributes<HTMLDivElement>

export function AutocompleteList({
  className,
  children,
  ...props
}: AutocompleteListProps) {
  return (
    <AutocompletePrimitive.List
      data-slot='autocomplete-list'
      className={className}
      {...props}
    >
      {useListChildren(children)}
    </AutocompletePrimitive.List>
  )
}

AutocompleteList.displayName = 'Autocomplete.List'
