'use client'

import { use } from 'react'

import { Toggle as TogglePrimitive } from '@base-ui/react/toggle'
import { Toolbar as ToolbarPrimitive } from '@base-ui/react/toolbar'

import { cn } from '@oztix/roadie-core/utils'

import { isIconOnly } from '../../utils/isIconOnly'
import { Toggle, type ToggleProps, toggleVariants } from '../Toggle'
import { ToolbarContext, ToolbarToggleGroupContext } from './ToolbarContext'

export type ToolbarToggleProps = Omit<ToggleProps, 'size'>

// Under a sliding indicator, pressed shows in the label alone.
const SLIDING = cn(
  'relative z-1',
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
        group.sliding ? (
          <TogglePrimitive
            {...props}
            nativeButton={nativeButton ?? !props.render}
            data-icon-only={isIconOnly(props.children) ? '' : undefined}
            className={cn(
              toggleVariants({ intent, emphasis: null, size }),
              SLIDING,
              className
            )}
          />
        ) : (
          <Toggle
            {...props}
            intent={intent}
            className={className}
            nativeButton={nativeButton}
            size={size}
            emphasis={emphasis}
          />
        )
      }
    />
  )
}

ToolbarToggle.displayName = 'Toolbar.Toggle'
