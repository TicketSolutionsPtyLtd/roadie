'use client'

import { Menu as MenuPrimitive } from '@base-ui/react/menu'

import { MenuSubmenuContext } from './MenuSubmenuContext'

export type MenuSubmenuRootProps = MenuPrimitive.SubmenuRoot.Props

export function MenuSubmenuRoot(props: MenuSubmenuRootProps) {
  return (
    <MenuSubmenuContext value>
      <MenuPrimitive.SubmenuRoot {...props} />
    </MenuSubmenuContext>
  )
}

MenuSubmenuRoot.displayName = 'Menu.SubmenuRoot'
