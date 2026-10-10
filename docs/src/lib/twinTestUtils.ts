import type { ReactElement } from 'react'

import { renderToStaticMarkup } from 'react-dom/server'
import { expect } from 'vitest'

import { type TwinTable, cellText } from './twin-table'

const ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#x27;': "'",
  '&#39;': "'",
  '&nbsp;': ' '
}

/** The text a browser shows for some static HTML. */
export const textOf = (html: string) =>
  html
    .replace(/<[^>]+>/g, '')
    .replace(/&[#\w]+;/g, (entity) => ENTITIES[entity] ?? entity)

/** Each row's cell text, header row first, as the element renders it. */
export function renderedTable(element: ReactElement) {
  const html = renderToStaticMarkup(element)
  return [...html.matchAll(/<tr[^>]*>(.*?)<\/tr>/gs)].map(([, row]) =>
    [...row!.matchAll(/<t[hd][^>]*>(.*?)<\/t[hd]>/gs)].map(([, cell]) =>
      textOf(cell!)
    )
  )
}

/** The page draws exactly the rows its markdown twin writes. */
export function expectRendersTable(element: ReactElement, table: TwinTable) {
  expect(renderedTable(element)).toEqual([
    table.head,
    ...table.rows.map((row) => row.map(cellText))
  ])
}

/** The page shows exactly the code its markdown twin writes. Mock `CodePreview` as a `<pre>` first, since it renders long code collapsed. */
export function expectRendersCode(element: ReactElement, code: string) {
  expect(textOf(renderToStaticMarkup(element))).toBe(code)
}
