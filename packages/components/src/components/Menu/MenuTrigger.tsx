'use client'

import type { RefAttributes } from 'react'

import { Menu as MenuPrimitive } from '@base-ui/react/menu'

export type MenuTriggerProps = MenuPrimitive.Trigger.Props &
  RefAttributes<HTMLButtonElement>

export function MenuTrigger(props: MenuTriggerProps) {
  return <MenuPrimitive.Trigger data-slot='menu-trigger' {...props} />
}

MenuTrigger.displayName = 'Menu.Trigger'
