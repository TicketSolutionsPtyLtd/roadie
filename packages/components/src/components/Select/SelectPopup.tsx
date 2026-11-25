'use client'

import type { RefAttributes } from 'react'

import { Select as SelectPrimitive } from '@base-ui/react/select'

import { cn } from '@oztix/roadie-core/utils'

import {
  floatingPopupClass,
  listPopupWidthClass,
  scrollingPopupRimClass
} from '../../variants'

export type SelectPopupProps = SelectPrimitive.Popup.Props &
  RefAttributes<HTMLDivElement>

export function SelectPopup({ className, ...props }: SelectPopupProps) {
  return (
    <SelectPrimitive.Popup
      data-slot='select-popup'
      className={cn(
        floatingPopupClass,
        listPopupWidthClass,
        scrollingPopupRimClass,
        className
      )}
      {...props}
    />
  )
}

SelectPopup.displayName = 'Select.Popup'
