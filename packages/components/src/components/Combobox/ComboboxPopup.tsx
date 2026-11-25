'use client'

import type { RefAttributes } from 'react'

import { Combobox as ComboboxPrimitive } from '@base-ui/react/combobox'

import { cn } from '@oztix/roadie-core/utils'

import { floatingPopupClass, listPopupWidthClass } from '../../variants'

export type ComboboxPopupProps = ComboboxPrimitive.Popup.Props &
  RefAttributes<HTMLDivElement>

export function ComboboxPopup({ className, ...props }: ComboboxPopupProps) {
  return (
    <ComboboxPrimitive.Popup
      data-slot='combobox-popup'
      className={cn(floatingPopupClass, listPopupWidthClass, className)}
      {...props}
    />
  )
}

ComboboxPopup.displayName = 'Combobox.Popup'
