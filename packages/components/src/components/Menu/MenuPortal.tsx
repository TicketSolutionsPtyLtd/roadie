'use client'

import { Menu as MenuPrimitive } from '@base-ui/react/menu'

import { useAccentScopeProps } from '../../providers/AccentScopeContext'

export type MenuPortalProps = MenuPrimitive.Portal.Props

export function MenuPortal(props: MenuPortalProps) {
  const scope = useAccentScopeProps(props.style)
  return <MenuPrimitive.Portal {...props} {...scope} />
}

MenuPortal.displayName = 'Menu.Portal'
