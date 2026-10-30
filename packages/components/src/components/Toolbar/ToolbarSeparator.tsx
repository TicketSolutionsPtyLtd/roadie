'use client'

import { type RefAttributes } from 'react'

import { Toolbar as ToolbarPrimitive } from '@base-ui/react/toolbar'

import { cn } from '@oztix/roadie-core/utils'

import { Separator } from '../Separator'

export type ToolbarSeparatorProps = ToolbarPrimitive.Separator.Props &
  RefAttributes<HTMLDivElement>

export function ToolbarSeparator(props: ToolbarSeparatorProps) {
  return (
    <ToolbarPrimitive.Separator
      data-slot='toolbar-separator'
      // Shorter than the controls, so the line sits between them, not past them.
      render={(separatorProps, { orientation }) => (
        <Separator
          {...separatorProps}
          orientation={orientation}
          className={cn(
            orientation === 'vertical' ? 'my-1.5' : 'mx-1.5',
            separatorProps.className
          )}
        />
      )}
      {...props}
    />
  )
}

ToolbarSeparator.displayName = 'Toolbar.Separator'
