import React from 'react'

import type { HTMLStyledProps } from '@oztix/roadie-core/jsx'
import { styled } from '@oztix/roadie-core/jsx'
import type { JsxStyleProps } from '@oztix/roadie-core/types'

type HeadingLevel = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'

/**
 * A heading component that uses display styles for titles and section headers
 */
export interface HeadingProps extends HTMLStyledProps<'h2'>, JsxStyleProps {
  /**
   * The heading level to render
   * @default 'h2'
   */
  as?: HeadingLevel
  /**
   * The text style to use for the heading
   * @default 'display.ui'
   */
  textStyle?: Extract<JsxStyleProps['textStyle'], 'display' | `display${string}`>
}

export const Heading = styled('h2', {
  base: {
    textStyle: 'display.ui'
  }
}) as React.ForwardRefExoticComponent<HeadingProps>

Heading.displayName = 'Heading'
