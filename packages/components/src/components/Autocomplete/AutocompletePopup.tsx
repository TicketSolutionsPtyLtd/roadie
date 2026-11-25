'use client'

import type { RefAttributes } from 'react'

import { Autocomplete as AutocompletePrimitive } from '@base-ui/react/autocomplete'

import { cn } from '@oztix/roadie-core/utils'

import { floatingPopupClass, listPopupWidthClass } from '../../variants'

export type AutocompletePopupProps = AutocompletePrimitive.Popup.Props &
  RefAttributes<HTMLDivElement>

export function AutocompletePopup({
  className,
  ...props
}: AutocompletePopupProps) {
  return (
    <AutocompletePrimitive.Popup
      data-slot='autocomplete-popup'
      className={cn(floatingPopupClass, listPopupWidthClass, className)}
      {...props}
    />
  )
}

AutocompletePopup.displayName = 'Autocomplete.Popup'
