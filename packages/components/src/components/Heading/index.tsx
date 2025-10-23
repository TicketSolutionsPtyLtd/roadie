import type { ReactNode } from 'react'

import { ark } from '@ark-ui/react/factory'

import type { ColorPalette } from '@oztix/roadie-core'
import { type HTMLStyledProps, styled } from '@oztix/roadie-core/jsx'
import { type HeadingVariantProps, heading } from '@oztix/roadie-core/recipes'
import type { JsxStyleProps } from '@oztix/roadie-core/types'

type HeadingElement = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'label'

/**
 * A heading component that uses display styles for titles and section headers
 */
export interface HeadingProps
  extends HTMLStyledProps<'h2'>,
    HeadingVariantProps {
  /**
   * The heading element to render
   * @default 'h2'
   */
  as?: HeadingElement

  /**
   * The text style to use for the heading
   * @default 'display.ui'
   */
  textStyle?: JsxStyleProps['textStyle']

  /**
   * The color palette to use for the heading
   * @default 'neutral'
   */
  colorPalette?: ColorPalette

  /**
   * Set a sepecific empahasis level for differen fonts like subtitles
   * @default 'default'
   */
  emphasis?: HeadingVariantProps['emphasis']

  /**
   * The content to display
   */
  children?: ReactNode
}

export const Heading = styled(
  ark.h2,
  heading
) as React.ForwardRefExoticComponent<HeadingProps>

Heading.displayName = 'Heading'
