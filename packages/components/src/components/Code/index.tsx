import type { ReactNode } from 'react'

import { ark } from '@ark-ui/react/factory'

import type { ColorPalette } from '@oztix/roadie-core'
import { styled } from '@oztix/roadie-core/jsx'
import type { HTMLStyledProps } from '@oztix/roadie-core/jsx'
import { type CodeVariantProps, code } from '@oztix/roadie-core/recipes'

/**
 * A code component that inherits from Text and renders as a code element
 */
export interface CodeProps extends HTMLStyledProps<'code'> {
  /**
   * The appearance of the code block
   * @default 'default'
   */
  emphasis?: CodeVariantProps['emphasis']

  /**
   * The color palette to use for the code
   * @default 'neutral'
   */
  colorPalette?: ColorPalette

  /**
   * The content to display
   */
  children?: ReactNode
}

export const Code = styled(
  ark.code,
  code
) as React.ForwardRefExoticComponent<CodeProps>

Code.displayName = 'Code'
