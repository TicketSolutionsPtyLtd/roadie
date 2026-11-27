'use client'

import type { RefAttributes } from 'react'

import { Combobox as ComboboxPrimitive } from '@base-ui/react/combobox'

import { mergeClassName } from '../../utils/mergeClassName'
import {
  floatingPopupClass,
  listPopupWidthClass,
  scrollingPopupRimClass
} from '../../variants'

export type ComboboxPopupProps = ComboboxPrimitive.Popup.Props &
  RefAttributes<HTMLDivElement>

export function ComboboxPopup({ className, ...props }: ComboboxPopupProps) {
  return (
    <ComboboxPrimitive.Popup
      data-slot='combobox-popup'
      className={mergeClassName(
        [floatingPopupClass, listPopupWidthClass, scrollingPopupRimClass],
        className
      )}
      {...props}
    />
  )
}

ComboboxPopup.displayName = 'Combobox.Popup'
