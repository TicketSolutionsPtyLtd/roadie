'use client'

import type { RefAttributes } from 'react'

import { Menu as MenuPrimitive } from '@base-ui/react/menu'

import { cn } from '@oztix/roadie-core/utils'

import type { RoadieIntent } from '../../variants'
import { type MenuItemDecorations, itemContent } from './itemContent'
import { menuItemVariants } from './variants'

export type MenuItemProps = MenuPrimitive.Item.Props &
  RefAttributes<HTMLElement> &
  MenuItemDecorations & {
    /** Colours the row, e.g. `danger` for a destructive action. */
    intent?: RoadieIntent
  }

export function MenuItem({
  className,
  intent,
  icon,
  shortcut,
  children,
  ...props
}: MenuItemProps) {
  return (
    <MenuPrimitive.Item
      data-slot='menu-item'
      className={cn(menuItemVariants({ intent }), className)}
      {...props}
    >
      {itemContent({ icon, shortcut, children })}
    </MenuPrimitive.Item>
  )
}

MenuItem.displayName = 'Menu.Item'
