'use client'

import type { RefAttributes } from 'react'

import { Menu as MenuPrimitive } from '@base-ui/react/menu'

import { cn } from '@oztix/roadie-core/utils'

export type MenuRadioGroupProps = MenuPrimitive.RadioGroup.Props &
  RefAttributes<HTMLDivElement>

export function MenuRadioGroup({ className, ...props }: MenuRadioGroupProps) {
  return (
    <MenuPrimitive.RadioGroup
      data-slot='menu-radio-group'
      className={cn('grid gap-0.5', className)}
      {...props}
    />
  )
}

MenuRadioGroup.displayName = 'Menu.RadioGroup'
