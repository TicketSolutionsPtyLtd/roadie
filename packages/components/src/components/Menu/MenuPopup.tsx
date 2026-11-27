'use client'

import type { RefAttributes } from 'react'

import { Menu as MenuPrimitive } from '@base-ui/react/menu'

import { mergeClassName } from '../../utils/mergeClassName'
import { menuPopupClass } from './variants'

export type MenuPopupProps = MenuPrimitive.Popup.Props &
  RefAttributes<HTMLDivElement>

export function MenuPopup({ className, ...props }: MenuPopupProps) {
  return (
    <MenuPrimitive.Popup
      data-slot='menu-popup'
      className={mergeClassName(menuPopupClass, className)}
      {...props}
    />
  )
}

MenuPopup.displayName = 'Menu.Popup'
