'use client'

import type { RefAttributes } from 'react'

import { Autocomplete as AutocompletePrimitive } from '@base-ui/react/autocomplete'

import { mergeClassName } from '../../utils/mergeClassName'
import { useVirtualGroup } from '../../utils/virtualList'

export type AutocompleteGroupProps = AutocompletePrimitive.Group.Props &
  RefAttributes<HTMLDivElement>

export function AutocompleteGroup({
  className,
  ref,
  ...props
}: AutocompleteGroupProps) {
  return (
    <AutocompletePrimitive.Group
      data-slot='autocomplete-group'
      className={mergeClassName(
        '[&+&]:mt-1 data-[virtual-group=rest]:mt-1',
        className
      )}
      {...props}
      {...useVirtualGroup(ref)}
    />
  )
}

AutocompleteGroup.displayName = 'Autocomplete.Group'
