import type { Table } from 'mdast'
import { toString } from 'mdast-util-to-string'
import { readFileSync } from 'node:fs'
import remarkGfm from 'remark-gfm'
import remarkMdx from 'remark-mdx'
import remarkParse from 'remark-parse'
import { unified } from 'unified'
import { visit } from 'unist-util-visit'
import { describe, expect, it } from 'vitest'

import { TICKETING_REFERENCE } from '@/app/charts/ticketing-reference'

import { ACTIONS_LABEL_LIMITS } from '@oztix/roadie-core/dashboard-layout'

const page = readFileSync(
  new URL('../../../app/charts/dashboards/page.mdx', import.meta.url),
  'utf8'
)

function tableHeaded(first: string) {
  let found: Table | undefined
  visit(
    unified().use(remarkParse).use(remarkMdx).use(remarkGfm).parse(page),
    'table',
    (node) => {
      if (toString(node.children[0]!.children[0]!) === first) found = node
    }
  )
  return found!.children
    .slice(1)
    .map((row) => row.children.map((cell) => toString(cell)))
}

// The page writes these out so the markdown copy keeps them; they must not
// drift from the data they come from.
describe('Dashboard design page', () => {
  it('lists every ticketing question with its chart', () => {
    expect(tableHeaded('Question').slice(4)).toEqual(
      TICKETING_REFERENCE.map((row) => [
        row.question.replace(/\?$/, ''),
        row.chart.startsWith('Annotations')
          ? 'Annotations on a time chart'
          : `Chart card showing ${row.chart}`,
        row.term
      ])
    )
  })

  it('gives the label room beside More from ACTIONS_LABEL_LIMITS', () => {
    expect(ACTIONS_LABEL_LIMITS.md).toBe(ACTIONS_LABEL_LIMITS.sm)
    expect(ACTIONS_LABEL_LIMITS.full).toBe(ACTIONS_LABEL_LIMITS.lg)
    expect(page.replace(/\s+/g, ' ')).toContain(
      `keep chart labels to ${ACTIONS_LABEL_LIMITS.sm} characters at \`sm\` and \`md\` and ${ACTIONS_LABEL_LIMITS.lg} at \`lg\` and \`full\`, and stat labels to ${ACTIONS_LABEL_LIMITS.stat}.`
    )
  })
})
