'use client'

import type { RefAttributes } from 'react'

import { Menu as MenuPrimitive } from '@base-ui/react/menu'

import { cn } from '@oztix/roadie-core/utils'

import { menuPopupClass } from './variants'

export type MenuPopupProps = MenuPrimitive.Popup.Props &
  RefAttributes<HTMLDivElement>

export function MenuPopup({ className, ...props }: MenuPopupProps) {
  return (
    <MenuPrimitive.Popup
      data-slot='menu-popup'
      className={cn(menuPopupClass, className)}
      {...props}
    />
  )
}

MenuPopup.displayName = 'Menu.Popup'
