'use client'

import type { RefAttributes } from 'react'

import { Autocomplete as AutocompletePrimitive } from '@base-ui/react/autocomplete'

import { cn } from '@oztix/roadie-core/utils'

import { useVirtualGroupLabel } from '../../utils/virtualList'
import { optionGroupLabelClass } from '../../variants'

export type AutocompleteGroupLabelProps =
  AutocompletePrimitive.GroupLabel.Props & RefAttributes<HTMLDivElement>

export function AutocompleteGroupLabel({
  className,
  ref,
  ...props
}: AutocompleteGroupLabelProps) {
  return (
    <AutocompletePrimitive.GroupLabel
      data-slot='autocomplete-group-label'
      className={cn(
        optionGroupLabelClass,
        // In a windowed list, the label of the group in view stays at the top.
        'data-virtual-label:sticky data-virtual-label:top-(--virtual-label-top) data-virtual-label:surface-floating',
        className
      )}
      {...props}
      {...useVirtualGroupLabel(ref)}
    />
  )
}

AutocompleteGroupLabel.displayName = 'Autocomplete.GroupLabel'
