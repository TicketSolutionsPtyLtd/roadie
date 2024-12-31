import type { HTMLStyledProps } from '@oztix/roadie-core/jsx'
import { styled } from '@oztix/roadie-core/jsx'
import type { JsxElement, JsxStyleProps } from '@oztix/roadie-core/types'

type TextElements =
  | 'span'
  | 'p'
  | 'a'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'h5'
  | 'h6'
  | 'strong'
  | 'em'
  | 'code'
  | 'pre'
  | 'small'
  | 'mark'
  | 'del'
  | 'ins'
  | 'sub'
  | 'sup'
  | 'li'
  | JsxElement<any, any>

export interface TextProps
  extends HTMLStyledProps<TextElements>,
    JsxStyleProps {
  /**
   * The HTML element to render the Text as
   * @default 'span'
   */
  as?: TextElements
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

/**
 * A foundational text component that is responsive and customizable.
 * Core style props are shown here. But you can pass any style props available in Panda CSS to the Text component.
 */
export const Text = styled('span', {
  base: {
    textStyle: 'ui',
    lineClamp: 'none'
  }
}) as React.ForwardRefExoticComponent<TextProps>

Text.displayName = 'Text'
