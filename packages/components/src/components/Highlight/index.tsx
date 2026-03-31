'use client'

import { Fragment, type ReactElement } from 'react'

import { Mark, type MarkProps } from '../Mark'

export interface HighlightChunk {
  text: string
  match: boolean
}

export interface HighlightProps extends Omit<MarkProps, 'children'> {
  text: string
  query: string | string[]
  ignoreCase?: boolean
  matchAll?: boolean
}

/**
 * Split text into chunks, marking which parts match the query.
 */
function highlight(
  text: string,
  query: string | string[],
  ignoreCase = true,
  matchAll = true
): HighlightChunk[] {
  const queries = Array.isArray(query) ? query : [query]
  const validQueries = queries.filter((q) => q.length > 0)

  if (validQueries.length === 0) {
    return [{ text, match: false }]
  }

  const escaped = validQueries.map((q) =>
    q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  )
  const pattern = escaped.join('|')
  const flags = `${ignoreCase ? 'i' : ''}${matchAll ? 'g' : ''}`
  const regex = new RegExp(`(${pattern})`, flags)

  const parts = text.split(regex)
  return parts
    .filter((part) => part.length > 0)
    .map((part) => ({
      text: part,
      match: regex.test(part),
    }))
}

export function Highlight({
  text,
  query,
  ignoreCase = true,
  matchAll = true,
  ...markProps
}: HighlightProps): ReactElement {
  const isQueryEmpty =
    !query || (Array.isArray(query) && query.length === 0) || query === ''

  if (isQueryEmpty) {
    return <>{text}</>
  }

  const chunks = highlight(text, query, ignoreCase, matchAll)

  return (
    <>
      {chunks.map((chunk, index) =>
        chunk.match ? (
          <Mark key={index} {...markProps}>
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
