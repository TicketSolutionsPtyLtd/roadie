'use client'

import type { RefAttributes } from 'react'

import { Menu as MenuPrimitive } from '@base-ui/react/menu'

import { cn } from '@oztix/roadie-core/utils'

export type MenuGroupLabelProps = MenuPrimitive.GroupLabel.Props &
  RefAttributes<HTMLDivElement>

export function MenuGroupLabel({ className, ...props }: MenuGroupLabelProps) {
  return (
    <MenuPrimitive.GroupLabel
      data-slot='menu-group-label'
      className={cn(
        'px-3 pt-2 pb-1 text-xs font-medium text-subtle select-none',
        className
      )}
      {...props}
    />
  )
}

MenuGroupLabel.displayName = 'Menu.GroupLabel'
