import type { ReactNode } from 'react'

import { ark } from '@ark-ui/react/factory'

import type { ColorPalette } from '@oztix/roadie-core'
import { styled } from '@oztix/roadie-core/jsx'
import type { HTMLStyledProps } from '@oztix/roadie-core/jsx'
import { type TextVariantProps, text } from '@oztix/roadie-core/recipes'

/**
 * Text component for displaying content with various styling options
 */
export interface TextProps extends HTMLStyledProps<'span'>, TextVariantProps {
  /**
   * The visual emphasis of the text
   * @default 'default'
   */
  emphasis?: TextVariantProps['emphasis']

  /**
   * Whether the text is interactive
   * @default false
   */
  interactive?: TextVariantProps['interactive']

  /**
   * The HTML element to render the text as
   * @default 'span'
   */
  as?: HTMLStyledProps<'span'>['as']

  /**
   * The color palette to use for the text
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
  children?: ReactNode
}

export const Text = styled(
  ark.span,
  text
) as React.ForwardRefExoticComponent<TextProps>

Text.displayName = 'Text'
