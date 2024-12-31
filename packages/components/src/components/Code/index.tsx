import type { PropsWithChildren } from 'react'

import type { TextProps } from '../Text'
import { Text } from '../Text'

type CodeElement = 'code'

/**
 * Props for the Code component
 * @extends {TextProps}
 */
export interface CodeProps extends TextProps<CodeElement> {
  /**
   * The visual style of the code block
   * @default 'outline'
   */
  appearance?: 'outline' | 'ghost'
}

/**
 * Code component for displaying code in a monospace font.
 */
export const Code = ({
  children,
  appearance = 'outline',
  ...props
}: PropsWithChildren<CodeProps>) => {
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
