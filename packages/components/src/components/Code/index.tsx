import React from 'react'

import type { HTMLStyledProps } from '@oztix/roadie-core/jsx'
import { styled } from '@oztix/roadie-core/jsx'
import type { JsxStyleProps } from '@oztix/roadie-core/types'

/**
 * A code component that inherits from Text and renders as a code element
 */
export interface CodeProps extends HTMLStyledProps<'code'>, JsxStyleProps {
  /**
   * The appearance of the code block
   * @default 'outline'
   */
  appearance?: 'outline' | 'ghost'
}

const StyledCode = styled('code', {
  base: {
    backgroundColor: 'bg.subtle',
    textStyle: 'code',
    px: '050',
    borderRadius: '050',
    border: '1px solid'
  },
  variants: {
    appearance: {
      outline: {
        borderColor: 'border.subtlest'
      },
      ghost: {
        borderColor: 'transparent'
      }
    }
  },
  defaultVariants: {
    appearance: 'outline'
  }
})

export const Code = StyledCode as React.ForwardRefExoticComponent<CodeProps>

Code.displayName = 'Code'
