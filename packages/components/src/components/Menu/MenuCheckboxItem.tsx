'use client'

import type { RefAttributes } from 'react'

import { Menu as MenuPrimitive } from '@base-ui/react/menu'
import { CheckIcon } from '@phosphor-icons/react/ssr'

import { cn } from '@oztix/roadie-core/utils'

import { type MenuItemDecorations, itemContent } from './itemContent'
import { menuItemVariants } from './variants'

export type MenuCheckboxItemProps = MenuPrimitive.CheckboxItem.Props &
  RefAttributes<HTMLElement> &
  MenuItemDecorations

export function MenuCheckboxItem({
  className,
  icon,
  shortcut,
  children,
  ...props
}: MenuCheckboxItemProps) {
  return (
    <MenuPrimitive.CheckboxItem
      data-slot='menu-checkbox-item'
      className={cn(menuItemVariants(), className)}
      {...props}
    >
      {itemContent({
        icon,
        shortcut,
        children,
        trailing: (
          <MenuPrimitive.CheckboxItemIndicator
            data-slot='menu-item-indicator'
            className='grid shrink-0 text-subtle'
          >
            <CheckIcon weight='bold' className='size-4' />
          </MenuPrimitive.CheckboxItemIndicator>
        )
      })}
    </MenuPrimitive.CheckboxItem>
  )
}

MenuCheckboxItem.displayName = 'Menu.CheckboxItem'
