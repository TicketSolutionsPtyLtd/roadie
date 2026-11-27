'use client'

import type { RefAttributes } from 'react'

import { Drawer as DrawerPrimitive } from '@base-ui/react/drawer'

import { mergeClassName } from '../../utils/mergeClassName'
import { surfaceTitleClass } from '../../variants'

export type DrawerTitleProps = DrawerPrimitive.Title.Props &
  RefAttributes<HTMLHeadingElement>

export function DrawerTitle({ className, ...props }: DrawerTitleProps) {
  return (
    <DrawerPrimitive.Title
      data-slot='drawer-title'
      className={mergeClassName(surfaceTitleClass, className)}
      {...props}
    />
  )
}

DrawerTitle.displayName = 'Drawer.Title'
