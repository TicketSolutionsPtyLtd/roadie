import type { RootContent, Table } from 'mdast'
import { toString } from 'mdast-util-to-string'
import { readFileSync } from 'node:fs'
import remarkGfm from 'remark-gfm'
import remarkMdx from 'remark-mdx'
import remarkParse from 'remark-parse'
import { unified } from 'unified'
import { describe, expect, it } from 'vitest'

import type { RecordTableNarrow } from '@oztix/roadie-components/record-table'
import type { RecordFieldType } from '@oztix/roadie-core/records'

const FIELD_TYPES: readonly RecordFieldType[] = [
  'text',
  'option',
  'number',
  'money',
  'date',
  'boolean'
]
const NARROW_ROLES: readonly Exclude<RecordTableNarrow, 'hidden'>[] = [
  'title',
  'description',
  'leading',
  'trailing',
  'detail'
]
const CONTEXTS = [
  'In a Pane',
  'On a phone',
  'Dashboard',
  'Detail page',
  'PDF or report'
]

type Column = {
  label: string
  pin: boolean
  type: string
  shows: string
  narrow: string
  priority: string
}

type OztixRecord = {
  name: string
  columns: Column[]
  contexts: Map<string, string>
  links: string[]
}

const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), 'utf8')

const page = read('./page.mdx')

const rowsOf = (table: Table) =>
  table.children
    .slice(1)
    .map((row) => row.children.map((cell) => toString(cell)))

function linksIn(node: RootContent): string[] {
  if (node.type === 'link') return [node.url]
  return 'children' in node
    ? (node.children as RootContent[]).flatMap(linksIn)
    : []
}

function oztixRecords(): OztixRecord[] {
  const tree = unified()
    .use(remarkParse)
    .use(remarkMdx)
    .use(remarkGfm)
    .parse(page)
  const start = tree.children.findIndex(
    (node) =>
      node.type === 'heading' &&
      node.depth === 2 &&
      toString(node) === 'Oztix records by context'
  )
  const records: OztixRecord[] = []
  for (const node of tree.children.slice(start + 1)) {
    if (node.type === 'heading' && node.depth <= 2) break
    if (node.type === 'heading' && node.depth === 3) {
      records.push({
        name: toString(node),
        columns: [],
        contexts: new Map(),
        links: []
      })
      continue
    }
    const record = records.at(-1)
    if (!record || node.type !== 'table') continue
    if (record.columns.length === 0) {
      record.columns = rowsOf(node).map(
        ([label, type, shows, narrow, priority]) => ({
          label: label!.replace(/ \(pinned\)$/, ''),
          pin: label!.endsWith(' (pinned)'),
          type: type!,
          shows: shows!,
          narrow: narrow!,
          priority: priority!
        })
      )
    } else {
      record.contexts = new Map(
        rowsOf(node).map(([context, text]) => [context!, text!])
      )
      record.links = linksIn(node)
    }
  }
  return records
}

const RECORDS = oztixRecords()

describe('Oztix records reference', () => {
  it('covers the records clients work with', () => {
    expect(RECORDS.map((record) => record.name)).toEqual([
      'Event',
      'Order',
      'Attendee',
      'Customer',
      'Ticket type',
      'Payout',
      'Refund',
      'Promo code'
    ])
  })

  it('names a real field type and narrow role for every column', () => {
    for (const record of RECORDS) {
      expect(record.columns.length, record.name).toBeGreaterThan(0)
      for (const column of record.columns) {
        expect(FIELD_TYPES, `${record.name} ${column.label}`).toContain(
          column.type
        )
        if (column.narrow)
          expect(NARROW_ROLES, `${record.name} ${column.label}`).toContain(
            column.narrow
          )
        if (column.priority)
          expect(['1', '2', '3'], `${record.name} ${column.label}`).toContain(
            column.priority
          )
      }
    }
  })

  it('shows every record in each context', () => {
    for (const record of RECORDS)
      expect([...record.contexts.keys()], record.name).toEqual(CONTEXTS)
  })

  it('pins exactly one title column per record, first', () => {
    for (const record of RECORDS) {
      const pinned = record.columns.filter((c) => c.pin)
      expect(pinned, record.name).toHaveLength(1)
      expect(record.columns[0]?.pin, record.name).toBe(true)
    }
  })

  it('titles each record by its pinned column on a phone, one role each', () => {
    for (const record of RECORDS) {
      const titles = record.columns.filter((c) => c.narrow === 'title')
      expect(titles, record.name).toEqual([record.columns[0]])
      for (const role of ['description', 'leading', 'trailing'] as const)
        expect(
          record.columns.filter((c) => c.narrow === role).length,
          `${record.name} ${role}`
        ).toBeLessThanOrEqual(1)
      const cards = record.columns.some((c) => c.narrow === 'detail')
      expect(
        record.contexts
          .get('On a phone')!
          .startsWith(cards ? 'Cards' : 'List rows'),
        record.name
      ).toBe(true)
    }
  })

  it('never gives a pinned column a priority', () => {
    for (const record of RECORDS)
      for (const column of record.columns)
        if (column.pin) expect(column.priority, record.name).toBe('')
  })

  it('has unique column labels within each record', () => {
    for (const record of RECORDS) {
      const labels = record.columns.map((c) => c.label)
      expect(new Set(labels).size, record.name).toBe(labels.length)
    }
  })

  it('shows money, and only money, in a currency format', () => {
    const currency = /^(Compact currency|Currency)$/
    for (const record of RECORDS)
      for (const column of record.columns)
        expect(
          currency.test(column.shows),
          `${record.name} ${column.label}`
        ).toBe(column.type === 'money')
  })

  it('shows every status as a Badge from an option field', () => {
    for (const record of RECORDS)
      for (const column of record.columns)
        if (column.shows === 'Badge')
          expect(column.type, `${record.name} ${column.label}`).toBe('option')
  })

  it('links only to Pane examples that exist on the RecordTable page', () => {
    const recordTable = read('../../components/record-table/page.mdx')
    const anchors = [...recordTable.matchAll(/^#{2,4} (.+)$/gm)].map(
      ([, heading]) =>
        heading!
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
    )
    const examples = RECORDS.flatMap((record) => record.links)
    expect(examples.length).toBeGreaterThan(0)
    for (const href of examples) {
      const [path, anchor] = href.split('#')
      expect(path).toBe('/components/record-table')
      expect(anchors).toContain(anchor)
    }
  })

  it('has no dashes in its copy', () => {
    expect(page).not.toMatch(/[–—]/)
  })
})
