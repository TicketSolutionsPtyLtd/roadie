import { Fragment, type ReactElement } from 'react'

import { useHighlight } from '@ark-ui/react/highlight'

import type { ColorPalette } from '@oztix/roadie-core'
import type { HTMLStyledProps } from '@oztix/roadie-core/jsx'

import { Mark } from '../Mark'

// Re-export Ark UI types and hook for advanced use cases
export { useHighlight } from '@ark-ui/react/highlight'
export type { HighlightChunk, UseHighlightProps } from '@ark-ui/react/highlight'

/**
 * Highlight component for highlighting substrings within text
 */
export interface HighlightProps
  extends Omit<HTMLStyledProps<'mark'>, 'children'> {
  /**
   * The text content to display and potentially highlight
   */
  text: string

  /**
   * The query string(s) to highlight within the text
   */
  query: string | string[]

  /**
   * Whether to match whole words only
   * @default false
   */
  exactMatch?: boolean

  /**
   * Whether to ignore case while matching
   * @default true
   */
  ignoreCase?: boolean

  /**
   * Whether to match multiple instances of the query
   * @default true
   */
  matchAll?: boolean

  /**
   * The color palette to use for the highlight
   * @default 'information'
   */
  colorPalette?: ColorPalette
}

export const Highlight = ({
  text,
  query,
  exactMatch = false,
  ignoreCase = true,
  matchAll = true,
  colorPalette = 'information',
  ...props
}: HighlightProps): ReactElement => {
  const chunks = useHighlight({
    query,
    text,
    exactMatch,
    ignoreCase,
    matchAll
  })

  return (
    <>
      {chunks.map((chunk, index) =>
        chunk.match ? (
          <Mark key={index} colorPalette={colorPalette} {...props}>
            {chunk.text}
          </Mark>
        ) : (
          <Fragment key={index}>{chunk.text}</Fragment>
        )
      )}
    </>
  )
}

Highlight.displayName = 'Highlight'
