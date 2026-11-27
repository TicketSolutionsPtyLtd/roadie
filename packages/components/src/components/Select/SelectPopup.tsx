'use client'

import type { RefAttributes } from 'react'

import { Select as SelectPrimitive } from '@base-ui/react/select'

import { mergeClassName } from '../../utils/mergeClassName'
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
      className={mergeClassName(
        [floatingPopupClass, listPopupWidthClass, scrollingPopupRimClass],
        className
      )}
      {...props}
    />
  )
}

SelectPopup.displayName = 'Select.Popup'
