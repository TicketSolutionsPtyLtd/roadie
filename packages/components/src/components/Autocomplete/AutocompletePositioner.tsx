'use client'

import type { RefAttributes } from 'react'

import { Autocomplete as AutocompletePrimitive } from '@base-ui/react/autocomplete'

import { cn } from '@oztix/roadie-core/utils'

export type AutocompletePositionerProps =
  AutocompletePrimitive.Positioner.Props & RefAttributes<HTMLDivElement>

export function AutocompletePositioner({
  className,
  ...props
}: AutocompletePositionerProps) {
  return (
    <AutocompletePrimitive.Positioner
      data-slot='autocomplete-positioner'
      className={cn('z-50', className)}
      sideOffset={4}
      {...props}
    />
  )
}

AutocompletePositioner.displayName = 'Autocomplete.Positioner'
