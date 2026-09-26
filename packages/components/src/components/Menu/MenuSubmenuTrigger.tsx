'use client'

import type { RefAttributes } from 'react'

import { Menu as MenuPrimitive } from '@base-ui/react/menu'
import { CaretRightIcon } from '@phosphor-icons/react/ssr'

import { cn } from '@oztix/roadie-core/utils'

import { type MenuItemDecorations, itemContent } from './itemContent'
import { menuItemVariants } from './variants'

export type MenuSubmenuTriggerProps = MenuPrimitive.SubmenuTrigger.Props &
  RefAttributes<HTMLElement> &
  Pick<MenuItemDecorations, 'icon'>

export function MenuSubmenuTrigger({
  className,
  icon,
  children,
  ...props
}: MenuSubmenuTriggerProps) {
  return (
    <MenuPrimitive.SubmenuTrigger
      data-slot='menu-submenu-trigger'
      className={cn(
        menuItemVariants(),
        'data-[popup-open]:bg-subtle',
        className
      )}
      {...props}
    >
      {itemContent({
        icon,
        children,
        trailing: (
          <CaretRightIcon
            data-slot='menu-submenu-icon'
            aria-hidden='true'
            weight='bold'
            className='size-4 shrink-0 text-subtle rtl:-scale-x-100'
          />
        )
      })}
    </MenuPrimitive.SubmenuTrigger>
  )
}

MenuSubmenuTrigger.displayName = 'Menu.SubmenuTrigger'
