'use client'

import { use } from 'react'

import { Toggle as TogglePrimitive } from '@base-ui/react/toggle'
import { Toolbar as ToolbarPrimitive } from '@base-ui/react/toolbar'

import { cn } from '@oztix/roadie-core/utils'

import { isIconOnly } from '../../utils/isIconOnly'
import { type ToggleProps, toggleVariants } from '../Toggle'
import { ToolbarContext, ToolbarToggleGroupContext } from './ToolbarContext'

export type ToolbarToggleProps = Omit<ToggleProps, 'size'>

// Under a sliding indicator, pressed shows in the label alone. It keeps the
// unpressed toggle's border, so a press never resizes its neighbours.
const SLIDING = cn(
  'relative z-1 data-[pressed]:border data-[pressed]:border-transparent',
  'not-data-[pressed]:emphasis-subtler not-data-[pressed]:is-unselected data-[pressed]:is-selected-label'
)

/** A `Toggle` in the toolbar's arrow order, at its size. In a `Toolbar.ToggleGroup`, give it a `value`. */
export function ToolbarToggle({
  disabled,
  emphasis = 'subtler',
  intent,
  className,
  nativeButton,
  ...props
}: ToolbarToggleProps) {
  const { size } = use(ToolbarContext)
  const group = use(ToolbarToggleGroupContext)
  return (
    <ToolbarPrimitive.Button
      data-slot='toolbar-toggle'
      disabled={disabled || group.disabled}
      render={
        // One element type in both modes, so the swap never remounts the
        // button and drops its focus.
        <TogglePrimitive
          {...props}
          nativeButton={nativeButton ?? !props.render}
          data-icon-only={isIconOnly(props.children) ? '' : undefined}
          className={cn(
            group.sliding
              ? [toggleVariants({ intent, emphasis: null, size }), SLIDING]
              : toggleVariants({ intent, emphasis, size }),
            className
          )}
        />
      }
    />
  )
}

ToolbarToggle.displayName = 'Toolbar.Toggle'
