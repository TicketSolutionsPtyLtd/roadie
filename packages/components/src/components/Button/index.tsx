import React from 'react'

import { ark } from '@ark-ui/react/factory'

import type { ColorPalette } from '@oztix/roadie-core'
import { styled } from '@oztix/roadie-core/jsx'
import type { HTMLStyledProps } from '@oztix/roadie-core/jsx'
import { type ButtonVariantProps, button } from '@oztix/roadie-core/recipes'

/**
 * A button component with various emphasis levels and sizes
 */
export interface ButtonProps
  extends HTMLStyledProps<'button'>,
    ButtonVariantProps {
  /**
   * The visual emphasis of the button
   * @default 'default'
   */
  emphasis?: ButtonVariantProps['emphasis']

  /**
   * The size of the button
   * @default 'md'
   */
  size?: ButtonVariantProps['size']

  /**
   * The color palette to use for the button
   * @default 'neutral'
   */
  colorPalette?: ColorPalette

  /**
   * When true, the component will pass props to its child component
   */
  asChild?: boolean

  /**
   * The content to display
   */
  children?: React.ReactNode
}

export const Button = styled(
  ark.button,
  button
) as React.ForwardRefExoticComponent<ButtonProps>

Button.displayName = 'Button'
