'use client'

import { type RefAttributes, use } from 'react'

import { Toolbar as ToolbarPrimitive } from '@base-ui/react/toolbar'

import { Button } from '../Button'
import { ToolbarContext } from './ToolbarContext'

export type ToolbarButtonProps = ToolbarPrimitive.Button.Props &
  RefAttributes<HTMLButtonElement>

export function ToolbarButton({ render, ...props }: ToolbarButtonProps) {
  const { size } = use(ToolbarContext)
  return (
    <ToolbarPrimitive.Button
      data-slot='toolbar-button'
      render={
        render ??
        ((buttonProps, { disabled }) => (
          <Button
            {...buttonProps}
            // A wrapping Menu.Trigger's aria-disabled='false' would otherwise win.
            {...(disabled && { 'aria-disabled': true })}
            size={size}
            emphasis='subtler'
          />
        ))
      }
      {...props}
    />
  )
}

ToolbarButton.displayName = 'Toolbar.Button'
