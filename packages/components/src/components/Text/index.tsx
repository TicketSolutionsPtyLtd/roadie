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
   * @default 'neutral'
   */
  colorPalette?:
    | 'neutral'
    | 'accent'
    | 'brand'
    | 'information'
    | 'success'
    | 'warning'
    | 'danger'
  /**
   * The emphasis of the text
   * - default: For standard body text and general content
   * - strong: For text that needs visual emphasis or importance, like headings, key terms or warnings
   * - subtle: For secondary or supplementary text that should be visually de-emphasized
   * - subtler: For text that should be visually subtler, like placeholder text or disabled text
   * @default 'default'
   */
  emphasis?: 'default' | 'strong' | 'subtle' | 'subtler'
  /**
   * Whether the text is interactive. Adds hover, focus, and active styles. Includes group styles.
   * @default false
   */
  interactive?: boolean
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
  <C extends ElementType = 'span'>(
    props: PolymorphicTextProps<C>
  ): React.ReactElement | null
  displayName?: string
}

const StyledText = styled('span', {
  base: {
    textStyle: 'ui',
    color: 'colorPalette.fg'
  },
  variants: {
    emphasis: {
      default: {
        color: 'colorPalette.fg'
      },
      strong: {
        color: 'colorPalette.fg.strong',
        fontWeight: 'semibold'
      },
      subtle: {
        color: 'colorPalette.fg.subtle'
      },
      subtler: {
        color: 'colorPalette.fg.subtler'
      }
    },
    interactive: {
      true: {
        cursor: 'pointer',
        _hover: {
          color: 'colorPalette.fg.hover'
        },
        _focus: {
          color: 'colorPalette.fg.hover'
        },
        _active: {
          color: 'colorPalette.fg.active'
        },
        _groupHover: {
          color: 'colorPalette.fg.hover'
        },
        _groupFocus: {
          color: 'colorPalette.fg.hover'
        },
        _groupActive: {
          color: 'colorPalette.fg.active'
        }
      }
    }
  },
  defaultVariants: {
    emphasis: 'default',
    interactive: false
  }
})

export const Text = StyledText as TextComponent

Text.displayName = 'Text'
