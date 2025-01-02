import type { ElementType } from 'react'
import React from 'react'

import { styled } from '@oztix/roadie-core/jsx'
import type { JsxStyleProps } from '@oztix/roadie-core/types'

type AsProp<C extends ElementType> = {
  as?: C
}

type PropsToOmit<C extends ElementType, P> = keyof (AsProp<C> & P)

/**
 * A foundational text component that is responsive and customizable.
 */
export interface TextProps<C extends ElementType = 'span'> {
  /**
   * The HTML element or React component to render the Text as
   * @default 'span'
   */
  as?: C
  /**
   * Controls the font family, line height, and letter spacing of the text.
   * @default 'ui'
   */
  textStyle?: JsxStyleProps['textStyle']
  /**
   * The color of the text
   * @default 'fg'
   */
  color?: Extract<JsxStyleProps['color'], `fg${string}` | 'fg'>
  /**
   * The line clamp of the text. Useful for limiting the number of lines of text in a component.
   * @default 'none'
   */
  lineClamp?: JsxStyleProps['lineClamp']
}

export type PolymorphicTextProps<C extends ElementType> = TextProps<C> &
  Omit<React.ComponentPropsWithRef<C>, PropsToOmit<C, TextProps>> &
  JsxStyleProps

type TextComponent = {
  <C extends ElementType = 'span'>(props: PolymorphicTextProps<C>): React.ReactElement | null
  displayName?: string
}

const StyledText = styled('span', {
  base: {
    textStyle: 'ui'
  }
})

export const Text = StyledText as TextComponent

Text.displayName = 'Text'
