'use client'

import { type RefAttributes } from 'react'

import { ToggleGroup as ToggleGroupPrimitive } from '@base-ui/react/toggle-group'

import { cn } from '@oztix/roadie-core/utils'

export type ToolbarToggleGroupProps = ToggleGroupPrimitive.Props &
  RefAttributes<HTMLDivElement>

/** Toolbar toggles that share one value: one pressed at a time, or several with `multiple`. */
export function ToolbarToggleGroup({
  className,
  ...props
}: ToolbarToggleGroupProps) {
  return (
    <ToggleGroupPrimitive
      data-slot='toolbar-toggle-group'
      className={cn(
        'flex flex-wrap items-center gap-1',
        'data-[orientation=vertical]:flex-col data-[orientation=vertical]:items-stretch data-[orientation=vertical]:*:w-auto',
        className
      )}
      {...props}
    />
  )
}

ToolbarToggleGroup.displayName = 'Toolbar.ToggleGroup'
