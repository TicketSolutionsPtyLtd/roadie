'use client'

import { type RefAttributes, use } from 'react'

import { ToggleGroup as ToggleGroupPrimitive } from '@base-ui/react/toggle-group'

import { cn } from '@oztix/roadie-core/utils'

import {
  ToolbarContext,
  ToolbarToggleGroupDisabledContext
} from './ToolbarContext'

export type ToolbarToggleGroupProps = ToggleGroupPrimitive.Props &
  RefAttributes<HTMLDivElement>

/** Toolbar toggles that share one value: one pressed at a time, or several with `multiple`. */
export function ToolbarToggleGroup({
  className,
  disabled = false,
  ...props
}: ToolbarToggleGroupProps) {
  const toolbar = use(ToolbarContext)
  return (
    <ToolbarToggleGroupDisabledContext value={disabled}>
      <ToggleGroupPrimitive
        data-slot='toolbar-toggle-group'
        // Inside a toolbar, Base UI leaves it horizontal whatever the toolbar's orientation.
        orientation={toolbar.orientation}
        className={cn(
          'flex flex-wrap items-center gap-1',
          'data-[orientation=vertical]:flex-col data-[orientation=vertical]:items-stretch data-[orientation=vertical]:*:w-auto',
          className
        )}
        disabled={disabled}
        {...props}
      />
    </ToolbarToggleGroupDisabledContext>
  )
}

ToolbarToggleGroup.displayName = 'Toolbar.ToggleGroup'
