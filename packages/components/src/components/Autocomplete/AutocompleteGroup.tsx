'use client'

import type { RefAttributes } from 'react'

import { Autocomplete as AutocompletePrimitive } from '@base-ui/react/autocomplete'

import { cn } from '@oztix/roadie-core/utils'

export type AutocompleteGroupProps = AutocompletePrimitive.Group.Props &
  RefAttributes<HTMLDivElement>

export function AutocompleteGroup({
  className,
  ...props
}: AutocompleteGroupProps) {
  return (
    <AutocompletePrimitive.Group
      data-slot='autocomplete-group'
      className={cn('[&+&]:mt-1', className)}
      {...props}
    />
  )
}

AutocompleteGroup.displayName = 'Autocomplete.Group'
