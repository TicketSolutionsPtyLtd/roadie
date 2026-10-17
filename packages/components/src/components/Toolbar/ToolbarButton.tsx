'use client'

import { type RefAttributes, use } from 'react'

import { Toolbar as ToolbarPrimitive } from '@base-ui/react/toolbar'

import { isIconOnly } from '../../utils/isIconOnly'
import { Button, IconButton, type IconButtonProps } from '../Button'
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
        ((buttonProps, { disabled }) => {
          // A wrapping Menu.Trigger's aria-disabled='false' would otherwise win.
          const shared = {
            ...buttonProps,
            ...(disabled && { 'aria-disabled': true }),
            size,
            emphasis: 'subtler'
          } as const
          return isIconOnly(props.children) ? (
            // Its label comes from the consumer's aria-label or aria-labelledby.
            <IconButton {...(shared as IconButtonProps)} />
          ) : (
            <Button {...shared} />
          )
        })
      }
      {...props}
    />
  )
}

ToolbarButton.displayName = 'Toolbar.Button'
