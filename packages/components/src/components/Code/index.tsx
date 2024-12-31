import type { ElementType, PropsWithChildren } from 'react'

import type { TextProps } from '../Text'
import { Text } from '../Text'

/**
 * Props for the Code component
 * @extends {TextProps}
 */
export interface CodeProps<C extends ElementType = 'code'> extends TextProps<C> {
  /**
   * The visual style of the code block
   * @default 'outline'
   */
  appearance?: 'outline' | 'ghost'
}

/**
 * Code component for displaying code in a monospace font.
 */
export const Code = <C extends ElementType = 'code'>({
  children,
  appearance = 'outline',
  ...props
}: PropsWithChildren<CodeProps<C>>) => {
  return (
    <Text
      as='code'
      fontSize='sm'
      backgroundColor='bg.subtle'
      textStyle='code'
      px='050'
      borderRadius='050'
      border='1px solid'
      borderColor={appearance === 'outline' ? 'border.subtlest' : 'transparent'}
      {...props}
    >
      {children}
    </Text>
  )
}

Code.displayName = 'Code'
