import type { Code } from 'mdast'
import { readFileSync } from 'node:fs'
import remarkMdx from 'remark-mdx'
import remarkParse from 'remark-parse'
import { unified } from 'unified'
import { visit } from 'unist-util-visit'
import { describe, expect, it } from 'vitest'

import { EVENT_FIELDS, WEEKEND_VIEW } from './example'

const page = readFileSync(
  new URL('../../app/foundations/records/page.mdx', import.meta.url),
  'utf8'
)

function fences() {
  const found: Code[] = []
  visit(unified().use(remarkParse).use(remarkMdx).parse(page), 'code', (node) =>
    found.push(node)
  )
  return found
}

const FIELDS_DECLARATION = 'export const eventFields: RecordField[] = '

// The docs components run the APIs on this module, and the page shows it as
// fences, so the outputs on the page belong to the inputs beside them.
describe('Records model example', () => {
  it('shows the fields the outputs are worked out from', () => {
    const fence = fences().find(({ value }) =>
      value.includes(FIELDS_DECLARATION)
    )
    const literal = fence!.value.split(FIELDS_DECLARATION)[1]!
    expect(new Function(`return ${literal}`)()).toEqual(EVENT_FIELDS)
  })

  it('shows the view the outputs are worked out from', () => {
    const fence = fences().find(({ lang }) => lang === 'json')
    expect(JSON.parse(fence!.value)).toEqual(WEEKEND_VIEW)
  })
})
