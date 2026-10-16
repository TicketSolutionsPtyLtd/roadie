import { describe, expect, it } from 'vitest'

import { recordFields } from './builder'
import { recordsToCsv } from './csv'
import { describeRecordFilter } from './describe'
import { isOptionLike, recordFilterOperators } from './fields'
import { formatRecordValue } from './format'
import { matchesRecordQuery } from './match'
import { parseQuery } from './parse'
import { resolveRecordQuery } from './resolve'
import { fromSearchParams, toSearchParams } from './searchParams'
import { sortRecords } from './sort'
import type { RecordFilter, RecordView } from './types'
import { validateRecordView } from './validate'

const field = recordFields<{ name: string; location?: string }>()
const location = field.location('location', {
  label: 'Location',
  options: [
    { value: 'perth', label: 'Perth' },
    { value: 'brisbane', label: 'Brisbane' },
    { value: 'sa', label: 'Adelaide' }
  ]
})
const fields = [field.text('name', { label: 'Name' }), location]

const options = {
  now: new Date('2026-10-03T02:00:00Z'),
  timeZone: 'Australia/Sydney'
}

const rows = [
  { name: 'One', location: 'perth' },
  { name: 'Two', location: 'brisbane' },
  { name: 'Three' },
  { name: 'Four', location: 'sa' }
]

const view = (filters: RecordFilter[]): RecordView => ({
  query: { search: '', filters, sort: [] },
  layout: { type: 'table' }
})

const matching = (filter: RecordFilter) =>
  rows
    .filter((row) =>
      matchesRecordQuery(
        row,
        resolveRecordQuery(view([filter]).query, fields, options),
        fields
      )
    )
    .map((row) => row.name)

describe('a location field', () => {
  it('is built with its type', () => {
    expect(location.type).toBe('location')
    expect(isOptionLike(location)).toBe(true)
    expect(isOptionLike(fields[0]!)).toBe(false)
  })

  it('filters like a single option', () => {
    expect(recordFilterOperators(location)).toEqual([
      'is',
      'is-not',
      'is-set',
      'is-not-set'
    ])
  })

  it.each<[RecordFilter, string[]]>([
    [{ field: 'location', operator: 'is', values: ['perth'] }, ['One']],
    [
      { field: 'location', operator: 'is-not', values: ['perth'] },
      ['Two', 'Three', 'Four']
    ],
    [{ field: 'location', operator: 'is-not-set' }, ['Three']]
  ])('matches %j', (filter, names) => {
    expect(matching(filter)).toEqual(names)
  })

  it('validates its operators', () => {
    expect(
      validateRecordView(
        view([{ field: 'location', operator: 'is-not', values: ['perth'] }]),
        fields
      ).ok
    ).toBe(true)
    const result = validateRecordView(
      view([{ field: 'location', operator: 'contains', value: 'per' }]),
      fields
    )
    expect(result.problems[0]?.message).toContain('is a location field')
  })

  it('reads as its chip', () => {
    expect(
      describeRecordFilter(
        { field: 'location', operator: 'is', values: ['brisbane', 'perth'] },
        fields,
        options
      ).label
    ).toBe('Location is Brisbane or Perth')
  })

  it.each(['perth', 'location:perth'])('suggests a value for "%s"', (text) => {
    const [first] = parseQuery(text, { fields, ...options })
    expect(first).toMatchObject({
      kind: 'filter',
      label: 'Location is Perth',
      value: { field: 'location', operator: 'is', values: ['perth'] }
    })
  })

  it('round trips through the URL', () => {
    const written = view([
      { field: 'location', operator: 'is-not', values: ['perth', 'sa'] }
    ])
    const read = fromSearchParams(toSearchParams(written), fields)
    expect(read.source).toBe('url')
    expect(read.view.query.filters).toEqual(written.query.filters)
  })

  it('shows, exports and sorts by its labels', () => {
    expect(formatRecordValue(rows[0]!, location, options)).toBe('Perth')
    expect(recordsToCsv(rows.slice(0, 1), fields, options)).toBe(
      'Name,Location\r\nOne,Perth'
    )
    expect(
      sortRecords(
        rows,
        [{ field: 'location', direction: 'ascending' }],
        fields,
        options
      ).map((row) => row.name)
    ).toEqual(['Four', 'Two', 'One', 'Three'])
  })
})
