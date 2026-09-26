'use client'

import type { RefAttributes } from 'react'

import { Menu as MenuPrimitive } from '@base-ui/react/menu'
import { CheckIcon } from '@phosphor-icons/react/ssr'

import { cn } from '@oztix/roadie-core/utils'

import { type MenuItemDecorations, itemContent } from './itemContent'
import { menuItemVariants } from './variants'

export type MenuRadioItemProps = MenuPrimitive.RadioItem.Props &
  RefAttributes<HTMLElement> &
  MenuItemDecorations

export function MenuRadioItem({
  className,
  icon,
  shortcut,
  children,
  ...props
}: MenuRadioItemProps) {
  return (
    <MenuPrimitive.RadioItem
      data-slot='menu-radio-item'
      className={cn(menuItemVariants(), className)}
      {...props}
    >
      {itemContent({
        icon,
        shortcut,
        children,
        trailing: (
          <MenuPrimitive.RadioItemIndicator
            data-slot='menu-item-indicator'
            className='grid shrink-0 text-subtle'
          >
            <CheckIcon weight='bold' className='size-4' />
          </MenuPrimitive.RadioItemIndicator>
        )
      })}
    </MenuPrimitive.RadioItem>
  )
}

MenuRadioItem.displayName = 'Menu.RadioItem'
