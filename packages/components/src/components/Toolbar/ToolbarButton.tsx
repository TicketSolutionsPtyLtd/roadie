'use client'

import { type ReactElement, type RefAttributes, use } from 'react'

import { Toolbar as ToolbarPrimitive } from '@base-ui/react/toolbar'

import { isIconOnly } from '../../utils/isIconOnly'
import { Button, IconButton, type IconButtonProps } from '../Button'
import type { ButtonHrefProps } from '../Button/Button'
import { ToolbarContext } from './ToolbarContext'

export type ToolbarButtonProps = ToolbarPrimitive.Button.Props &
  RefAttributes<HTMLButtonElement> &
  ButtonHrefProps

export function ToolbarButton({
  render,
  href,
  external,
  target,
  rel,
  download,
  ...props
}: ToolbarButtonProps) {
  const { size } = use(ToolbarContext)
  const look = (extra: object) => {
    const shared = { ...extra, size, emphasis: 'subtler' } as const
    return isIconOnly(props.children) ? (
      // Its label comes from the consumer's aria-label or aria-labelledby.
      <IconButton {...(shared as IconButtonProps)} />
    ) : (
      <Button {...shared} />
    )
  }

  if (href !== undefined) {
    const { disabled, focusableWhenDisabled, ...rest } = props
    const linkProps = { disabled, external, target, rel, download }
    // Base UI's button part would put type='button' on the link.
    return (
      <ToolbarPrimitive.Link
        data-slot='toolbar-button'
        // With an href, render is an element; a function would get the link's state.
        render={
          (render as ToolbarPrimitive.Link.Props['render']) ??
          look({
            ...linkProps,
            focusableWhenDisabled: focusableWhenDisabled ?? true
          })
        }
        href={href}
        {...(render && definedOnly({ ...linkProps, focusableWhenDisabled }))}
        {...(rest as ToolbarPrimitive.Link.Props)}
      />
    )
  }

  return (
    <ToolbarPrimitive.Button
      data-slot='toolbar-button'
      render={
        render ??
        ((buttonProps, { disabled }): ReactElement =>
          // A wrapping Menu.Trigger's aria-disabled='false' would otherwise win.
          look({ ...buttonProps, ...(disabled && { 'aria-disabled': true }) }))
      }
      {...props}
    />
  )
}

ToolbarButton.displayName = 'Toolbar.Button'

// React warns about an unknown prop on a DOM render element even when undefined.
function definedOnly(props: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(props).filter(([, value]) => value !== undefined)
  )
}
