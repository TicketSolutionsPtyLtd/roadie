'use client'

import { Menu as MenuPrimitive } from '@base-ui/react/menu'

export type MenuRootProps = MenuPrimitive.Root.Props

export function MenuRoot(props: MenuRootProps) {
  return <MenuPrimitive.Root {...props} />
}

MenuRoot.displayName = 'Menu.Root'
