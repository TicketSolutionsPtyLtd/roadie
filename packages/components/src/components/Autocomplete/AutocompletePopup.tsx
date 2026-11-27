'use client'

import type { RefAttributes } from 'react'

import { Autocomplete as AutocompletePrimitive } from '@base-ui/react/autocomplete'

import { mergeClassName } from '../../utils/mergeClassName'
import {
  floatingPopupClass,
  listPopupWidthClass,
  scrollingPopupRimClass
} from '../../variants'

export type AutocompletePopupProps = AutocompletePrimitive.Popup.Props &
  RefAttributes<HTMLDivElement>

export function AutocompletePopup({
  className,
  ...props
}: AutocompletePopupProps) {
  return (
    <AutocompletePrimitive.Popup
      data-slot='autocomplete-popup'
      className={mergeClassName(
        [floatingPopupClass, listPopupWidthClass, scrollingPopupRimClass],
        className
      )}
      {...props}
    />
  )
}

AutocompletePopup.displayName = 'Autocomplete.Popup'
