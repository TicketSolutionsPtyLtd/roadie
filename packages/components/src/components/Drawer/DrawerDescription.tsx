'use client'

import type { RefAttributes } from 'react'

import { Drawer as DrawerPrimitive } from '@base-ui/react/drawer'

import { mergeClassName } from '../../utils/mergeClassName'

export type DrawerDescriptionProps = DrawerPrimitive.Description.Props &
  RefAttributes<HTMLParagraphElement>

export function DrawerDescription({
  className,
  ...props
}: DrawerDescriptionProps) {
  return (
    <DrawerPrimitive.Description
      data-slot='drawer-description'
      className={mergeClassName('text-subtle', className)}
      {...props}
    />
  )
}

DrawerDescription.displayName = 'Drawer.Description'
