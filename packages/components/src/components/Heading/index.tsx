import type { JsxStyleProps } from '@oztix/roadie-core/types'

import type { TextProps } from '../Text'
import { Text } from '../Text'

type HeadingLevel = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'

export interface HeadingProps extends TextProps {
  /**
   * The heading level to render
   * @default 'h2'
   */
  as?: HeadingLevel
  /**
   * The text style to use for the heading
   * @default 'display'
   */
  textStyle?: Extract<
    JsxStyleProps['textStyle'],
    'display' | `display${string}`
  >
}

/**
 * A heading component that uses display styles for titles and section headers
 */
export const Heading = ({
  as = 'h2',
  textStyle = 'display.ui',
  ...props
}: HeadingProps) => {
  return <Text as={as} textStyle={textStyle} {...props} />
}

Heading.displayName = 'Heading'
