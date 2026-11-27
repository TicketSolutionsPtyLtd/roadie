'use client'

import type { RefAttributes } from 'react'

import { Menu as MenuPrimitive } from '@base-ui/react/menu'

import { mergeClassName } from '../../utils/mergeClassName'

export type MenuSeparatorProps = MenuPrimitive.Separator.Props &
  RefAttributes<HTMLDivElement>

export function MenuSeparator({ className, ...props }: MenuSeparatorProps) {
  return (
    <MenuPrimitive.Separator
      data-slot='menu-separator'
      className={mergeClassName(
        'px-2 py-1 before:block before:border-t before:border-subtle',
        className
      )}
      {...props}
    />
  )
}

MenuSeparator.displayName = 'Menu.Separator'
