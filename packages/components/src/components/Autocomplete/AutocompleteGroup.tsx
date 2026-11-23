'use client'

import type { RefAttributes } from 'react'

import { Autocomplete as AutocompletePrimitive } from '@base-ui/react/autocomplete'

import { cn } from '@oztix/roadie-core/utils'

import { useVirtualGroup } from '../../utils/virtualList'

export type AutocompleteGroupProps = AutocompletePrimitive.Group.Props &
  RefAttributes<HTMLDivElement>

export function AutocompleteGroup({
  className,
  ...props
}: AutocompleteGroupProps) {
  return (
    <AutocompletePrimitive.Group
      data-slot='autocomplete-group'
      className={cn('[&+&]:mt-1 data-[virtual-group=rest]:mt-1', className)}
      {...props}
      {...useVirtualGroup()}
    />
  )
}

AutocompleteGroup.displayName = 'Autocomplete.Group'
