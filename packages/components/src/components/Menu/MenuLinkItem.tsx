'use client'

import type { RefAttributes } from 'react'

import { Menu as MenuPrimitive } from '@base-ui/react/menu'

import { cn } from '@oztix/roadie-core/utils'

import type { RoadieIntent } from '../../variants'
import { RoadieRoutedLink } from '../Link/RoadieRoutedLink'
import { type MenuItemDecorations, itemContent } from './itemContent'
import { menuItemVariants } from './variants'

export type MenuLinkItemProps = MenuPrimitive.LinkItem.Props &
  RefAttributes<HTMLAnchorElement> &
  MenuItemDecorations & {
    /** Internal paths route through `RoadieLinkProvider`; external URLs open in a new tab. */
    href: string
    /** Colours the row. */
    intent?: RoadieIntent
  }

// Client routing keeps the page mounted, so following a link must close the menu.
export function MenuLinkItem({
  className,
  href,
  intent,
  icon,
  shortcut,
  children,
  render,
  closeOnClick = true,
  ...props
}: MenuLinkItemProps) {
  return (
    <MenuPrimitive.LinkItem
      data-slot='menu-item'
      className={cn(menuItemVariants({ intent }), className)}
      render={render ?? <RoadieRoutedLink href={href} />}
      {...(render !== undefined && { href })}
      closeOnClick={closeOnClick}
      {...props}
    >
      {itemContent({ icon, shortcut, children })}
    </MenuPrimitive.LinkItem>
  )
}

MenuLinkItem.displayName = 'Menu.LinkItem'
