'use client'

import { use } from 'react'

import { Toolbar as ToolbarPrimitive } from '@base-ui/react/toolbar'

import { Toggle, type ToggleProps } from '../Toggle'
import { ToolbarContext } from './ToolbarContext'

export type ToolbarToggleProps = Omit<ToggleProps, 'size'>

/** A `Toggle` in the toolbar's arrow order, at its size. In a `Toolbar.ToggleGroup`, give it a `value`. */
export function ToolbarToggle({
  disabled,
  emphasis = 'subtler',
  ...props
}: ToolbarToggleProps) {
  const { size } = use(ToolbarContext)
  return (
    <ToolbarPrimitive.Button
      data-slot='toolbar-toggle'
      disabled={disabled}
      render={<Toggle {...props} size={size} emphasis={emphasis} />}
    />
  )
}

ToolbarToggle.displayName = 'Toolbar.Toggle'
