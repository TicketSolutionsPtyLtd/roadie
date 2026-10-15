'use client'

import { type RefAttributes, use } from 'react'

import { Toolbar as ToolbarPrimitive } from '@base-ui/react/toolbar'

import { Button } from '../Button'
import { ToolbarContext } from './ToolbarContext'

export type ToolbarLinkProps = ToolbarPrimitive.Link.Props &
  RefAttributes<HTMLAnchorElement>

export function ToolbarLink({ render, ...props }: ToolbarLinkProps) {
  const { size } = use(ToolbarContext)
  return (
    <ToolbarPrimitive.Link
      data-slot='toolbar-link'
      render={render ?? <Button size={size} emphasis='subtler' />}
      {...props}
    />
  )
}

ToolbarLink.displayName = 'Toolbar.Link'
