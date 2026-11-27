'use client'

import { type RefAttributes } from 'react'

import { Toolbar as ToolbarPrimitive } from '@base-ui/react/toolbar'

import { mergeClassName } from '../../utils/mergeClassName'

export type ToolbarGroupProps = ToolbarPrimitive.Group.Props &
  RefAttributes<HTMLDivElement>

export function ToolbarGroup({ className, ...props }: ToolbarGroupProps) {
  return (
    <ToolbarPrimitive.Group
      data-slot='toolbar-group'
      className={mergeClassName(
        [
          'flex flex-wrap items-center gap-1',
          'data-[orientation=vertical]:flex-col data-[orientation=vertical]:items-stretch data-[orientation=vertical]:*:w-auto data-[orientation=vertical]:*:data-icon-only:aspect-square'
        ],
        className
      )}
      {...props}
    />
  )
}

ToolbarGroup.displayName = 'Toolbar.Group'
