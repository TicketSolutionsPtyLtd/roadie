import type { ReactNode } from 'react'

import { ark } from '@ark-ui/react/factory'

import type { ColorPalette } from '@oztix/roadie-core'
import { styled } from '@oztix/roadie-core/jsx'
import type { HTMLStyledProps } from '@oztix/roadie-core/jsx'
import { type HeadingVariantProps, heading } from '@oztix/roadie-core/recipes'

// Create a type alias for the heading level from the recipe
type HeadingLevel = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'

/**
 * A heading component that uses display styles for titles and section headers
 */
export interface HeadingProps
  extends HTMLStyledProps<'h2'>,
    HeadingVariantProps {
  /**
   * The heading level to render
   * @default 'h2'
   */
  as?: HeadingLevel

  /**
   * The color palette to use for the heading
   * @default 'neutral'
   */
  colorPalette?: ColorPalette

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
