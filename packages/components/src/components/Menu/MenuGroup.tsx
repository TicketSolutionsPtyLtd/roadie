'use client'

import type { RefAttributes } from 'react'

import { Menu as MenuPrimitive } from '@base-ui/react/menu'

import { cn } from '@oztix/roadie-core/utils'

export type MenuGroupProps = MenuPrimitive.Group.Props &
  RefAttributes<HTMLDivElement>

export function MenuGroup({ className, ...props }: MenuGroupProps) {
  return (
    <MenuPrimitive.Group
      data-slot='menu-group'
      className={cn('grid gap-0.5', className)}
      {...props}
    />
  )
}

MenuGroup.displayName = 'Menu.Group'
