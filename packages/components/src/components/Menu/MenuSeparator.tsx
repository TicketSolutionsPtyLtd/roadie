'use client'

import type { RefAttributes } from 'react'

import { Menu as MenuPrimitive } from '@base-ui/react/menu'

import { cn } from '@oztix/roadie-core/utils'

export type MenuSeparatorProps = MenuPrimitive.Separator.Props &
  RefAttributes<HTMLDivElement>

export function MenuSeparator({ className, ...props }: MenuSeparatorProps) {
  return (
    <MenuPrimitive.Separator
      data-slot='menu-separator'
      className={cn('mx-2 my-1 border-t border-subtle', className)}
      {...props}
    />
  )
}

MenuSeparator.displayName = 'Menu.Separator'
