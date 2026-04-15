'use client'

import type { RefAttributes } from 'react'

import { Autocomplete as AutocompletePrimitive } from '@base-ui/react/autocomplete'

export type AutocompleteListProps = AutocompletePrimitive.List.Props &
  RefAttributes<HTMLDivElement>

export function AutocompleteList({
  className,
  ...props
}: AutocompleteListProps) {
  return (
    <AutocompletePrimitive.List
      data-slot='autocomplete-list'
      className={className}
      {...props}
    />
  )
}

AutocompleteList.displayName = 'Autocomplete.List'
