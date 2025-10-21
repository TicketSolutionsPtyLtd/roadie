import React from 'react'

import { styled } from '@oztix/roadie-core/jsx'
import type { HTMLStyledProps } from '@oztix/roadie-core/jsx'
import type { JsxStyleProps } from '@oztix/roadie-core/types'

/**
 * A code component that inherits from Text and renders as a code element
 */
export interface CodeProps extends HTMLStyledProps<'code'>, JsxStyleProps {
  /**
   * The appearance of the code block
   * @default 'default'
   */
  emphasis?: 'default' | 'strong' | 'subtle' | 'subtler'
}

export const Code = styled('code', {
  base: {
    color: 'colorPalette.fg',
    backgroundColor: 'colorPalette.surface.subtle',
    textStyle: 'code',
    px: '100',
    borderRadius: 'sm',
    border: '1px solid'
  },
  variants: {
    emphasis: {
      default: {
        borderColor: 'colorPalette.border',
        backgroundColor: 'colorPalette.surface.subtle'
      },
      strong: {
        color: 'colorPalette.fg.inverted',
        borderColor: 'colorPalette.border.strong',
        backgroundColor: 'colorPalette.surface.strong'
      },
      subtle: {
        borderColor: 'colorPalette.border.subtle'
      },
      subtler: {
        borderColor: 'transparent'
      }
    }
  },
  defaultVariants: {
    emphasis: 'default'
  }
}) as React.ForwardRefExoticComponent<CodeProps>

Code.displayName = 'Code'
