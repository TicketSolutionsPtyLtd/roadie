'use client'

import { type RefAttributes } from 'react'

import { Toolbar as ToolbarPrimitive } from '@base-ui/react/toolbar'

import { Separator } from '../Separator'

export type ToolbarSeparatorProps = ToolbarPrimitive.Separator.Props &
  RefAttributes<HTMLDivElement>

export function ToolbarSeparator(props: ToolbarSeparatorProps) {
  return (
    <ToolbarPrimitive.Separator
      data-slot='toolbar-separator'
      render={(separatorProps, { orientation }) => (
        <Separator {...separatorProps} orientation={orientation} />
      )}
      {...props}
    />
  )
}

ToolbarSeparator.displayName = 'Toolbar.Separator'
