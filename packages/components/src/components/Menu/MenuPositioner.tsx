'use client'

import { type RefAttributes, use } from 'react'

import { Menu as MenuPrimitive } from '@base-ui/react/menu'

import { cn } from '@oztix/roadie-core/utils'

import { MenuSubmenuContext } from './MenuSubmenuContext'

export type MenuPositionerProps = MenuPrimitive.Positioner.Props &
  RefAttributes<HTMLDivElement>

// A submenu lifts by the popup's padding so its first row lines up with its trigger.
export function MenuPositioner({
  className,
  align = 'start',
  sideOffset,
  alignOffset,
  ...props
}: MenuPositionerProps) {
  const isSubmenu = use(MenuSubmenuContext)
  return (
    <MenuPrimitive.Positioner
      data-slot='menu-positioner'
      className={cn('z-popover outline-none', className)}
      align={align}
      sideOffset={sideOffset ?? (isSubmenu ? 4 : 8)}
      alignOffset={alignOffset ?? (isSubmenu ? -4 : 0)}
      {...props}
    />
  )
}

MenuPositioner.displayName = 'Menu.Positioner'
