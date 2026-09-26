'use client'

import type { RefAttributes } from 'react'

import { Menu as MenuPrimitive } from '@base-ui/react/menu'

import { cn } from '@oztix/roadie-core/utils'

import type { RoadieIntent } from '../../variants'
import { RoadieRoutedLink } from '../Link/RoadieRoutedLink'
import { type MenuItemDecorations, itemContent } from './itemContent'
import { menuItemVariants } from './variants'

export type MenuItemProps = Omit<
  MenuPrimitive.Item.Props,
  'render' | 'nativeButton' | 'className'
> &
  RefAttributes<HTMLElement> &
  MenuItemDecorations & {
    /** Makes the row a link. Internal paths route through `RoadieLinkProvider`; external URLs open in a new tab. */
    href?: string
    /** `danger` for a destructive action. */
    intent?: RoadieIntent
    /** A disabled link row can't be followed. */
    disabled?: boolean
    /** @default true */
    closeOnClick?: boolean
    className?: string
  }

export function MenuItem({
  href,
  intent,
  icon,
  shortcut,
  className,
  children,
  disabled,
  closeOnClick = true,
  ref,
  ...props
}: MenuItemProps) {
  const shared = {
    'data-slot': 'menu-item',
    className: cn(menuItemVariants({ intent }), className),
    closeOnClick,
    ...props
  }
  const content = itemContent({ icon, shortcut, children })

  if (href !== undefined && !disabled) {
    return (
      // Client routing keeps the page mounted, so following a link must close the menu.
      <MenuPrimitive.LinkItem
        {...(shared as MenuPrimitive.LinkItem.Props)}
        ref={ref}
        render={<RoadieRoutedLink href={href} />}
      >
        {content}
      </MenuPrimitive.LinkItem>
    )
  }

  return (
    <MenuPrimitive.Item {...shared} ref={ref} disabled={disabled}>
      {content}
    </MenuPrimitive.Item>
  )
}

MenuItem.displayName = 'Menu.Item'
