import type { ReactNode } from 'react'

import { ark } from '@ark-ui/react/factory'

import type { ColorPalette } from '@oztix/roadie-core'
import { styled } from '@oztix/roadie-core/jsx'
import type { HTMLStyledProps } from '@oztix/roadie-core/jsx'
import { mark } from '@oztix/roadie-core/recipes'

/**
 * Mark component for highlighting text content
 */
export interface MarkProps extends HTMLStyledProps<'mark'> {
  /**
   * The color palette to use for the mark
   * @default 'information'
   */
  colorPalette?: ColorPalette

  /**
   * When true, the component will pass props to its child component
   */
  asChild?: boolean

  /**
   * The content to mark
   */
  children?: ReactNode
}

export const Mark = styled(ark.mark, mark)

Mark.displayName = 'Mark'
