'use client'

import { type ReactElement, use } from 'react'

import { Menu } from '@base-ui/react/menu'

import { cn } from '@oztix/roadie-core/utils'

import { NavigatorContext } from './NavigatorContext'
import type { NavigatorMenuProps } from './NavigatorMenu'
import { navigatorMenuPopupVariants } from './variants'

export type NavigatorMenuSurface = 'vertical' | 'horizontal' | 'overflow'

export const menuId = (surface: NavigatorMenuSurface, value: string) =>
  `${surface}:${value}`

const PLACEMENT = {
  vertical: { side: 'inline-end', align: 'start' },
  horizontal: { side: 'top', align: 'center' },
  overflow: { side: 'bottom', align: 'start' }
} as const

export type NavigatorMenuHostProps = {
  surface: NavigatorMenuSurface
  value: string
  menu: ReactElement<NavigatorMenuProps>
  /** The item's label as text, naming the menu when it declares none. */
  label?: string
  trigger: ReactElement
}

// Open state lives on context so route destinations can yield the pill while a menu is open.
export function NavigatorMenuHost({
  surface,
  value,
  menu,
  label,
  trigger
}: NavigatorMenuHostProps) {
  const { openMenu, setOpenMenu } = use(NavigatorContext)
  const id = menuId(surface, value)
  const { side, align } = PLACEMENT[surface]

  return (
    <Menu.Root
      open={openMenu === id}
      onOpenChange={(open) => setOpenMenu(open ? id : null)}
    >
      <Menu.Trigger render={trigger} />
      <Menu.Portal>
        <Menu.Positioner
          data-slot='navigator-menu-positioner'
          side={side}
          align={align}
          sideOffset={8}
          className='z-popover'
        >
          <Menu.Popup
            data-slot='navigator-menu'
            aria-label={menu.props['aria-label'] ?? label}
            className={cn(navigatorMenuPopupVariants(), menu.props.className)}
          >
            {menu.props.children}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )
}
