'use client'

import { Drawer as DrawerPrimitive } from '@base-ui/react/drawer'

import { useAccentScopeProps } from '../../providers/AccentScopeContext'

export type DrawerPortalProps = DrawerPrimitive.Portal.Props

export function DrawerPortal(props: DrawerPortalProps) {
  const scope = useAccentScopeProps(props.style)
  return <DrawerPrimitive.Portal {...props} {...scope} />
}

DrawerPortal.displayName = 'Drawer.Portal'
