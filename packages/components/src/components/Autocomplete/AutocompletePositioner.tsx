'use client'

import type { RefAttributes } from 'react'

import { Autocomplete as AutocompletePrimitive } from '@base-ui/react/autocomplete'

import { mergeClassName } from '../../utils/mergeClassName'

export type AutocompletePositionerProps =
  AutocompletePrimitive.Positioner.Props & RefAttributes<HTMLDivElement>

export function AutocompletePositioner({
  className,
  ...props
}: AutocompletePositionerProps) {
  return (
    <AutocompletePrimitive.Positioner
      data-slot='autocomplete-positioner'
      className={mergeClassName('z-popover', className)}
      sideOffset={4}
      {...props}
    />
  )
}

AutocompletePositioner.displayName = 'Autocomplete.Positioner'
