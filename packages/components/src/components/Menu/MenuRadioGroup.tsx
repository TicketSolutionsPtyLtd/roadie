'use client'

import type { RefAttributes } from 'react'

import { Menu as MenuPrimitive } from '@base-ui/react/menu'

import { mergeClassName } from '../../utils/mergeClassName'

export type MenuRadioGroupProps = MenuPrimitive.RadioGroup.Props &
  RefAttributes<HTMLDivElement>

export function MenuRadioGroup({ className, ...props }: MenuRadioGroupProps) {
  return (
    <MenuPrimitive.RadioGroup
      data-slot='menu-radio-group'
      className={mergeClassName('grid gap-0.5', className)}
      {...props}
    />
  )
}

MenuRadioGroup.displayName = 'Menu.RadioGroup'
