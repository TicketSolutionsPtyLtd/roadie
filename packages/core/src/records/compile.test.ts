import { describe, expect, it } from 'vitest'

import { compileRecordQuery, matchesRecordQuery } from './match'
import { resolveRecordQuery } from './resolve'
import { eventFields, eventRows } from './testFields'
import type { RecordField, RecordFilter } from './types'

const rows = Object.values(eventRows)
const options = { now: new Date('2026-10-03T02:00:00Z'), timeZone: 'UTC' }

const resolve = (
  search: string,
  filters: RecordFilter[],
  fields: readonly RecordField[] = eventFields
) => resolveRecordQuery({ search, filters, sort: [] }, fields, options)

describe('compileRecordQuery', () => {
  it.each<[string, RecordFilter[]]>([
    ['', []],
    ['velvet', []],
    ['comedy', []],
    ['', [{ field: 'venue', operator: 'is-not', values: ['velvet-room'] }]],
    ['', [{ field: 'capacity', operator: 'gt', value: 100 }]],
    ['', [{ field: 'starts', operator: 'within', value: 'this-weekend' }]],
    ['nights', [{ field: 'featured', operator: 'is-true' }]]
  ])('agrees with matchesRecordQuery (%j, %j)', (search, filters) => {
    const query = resolve(search, filters)
    const matches = compileRecordQuery(query, eventFields)
    expect(rows.map(matches)).toEqual(
      rows.map((row) => matchesRecordQuery(row, query, eventFields))
    )
  })

  it('searches the label of an option held as a number', () => {
    const fields: RecordField[] = [
      {
        key: 'venue',
        label: 'Venue',
        type: 'option',
        searchable: true,
        options: [{ value: '1', label: 'Zinc Hall' }]
      }
    ]
    const matches = compileRecordQuery(resolve('zinc', [], fields), fields)
    expect(matches({ venue: 1 })).toBe(true)
  })

  it('matches nothing on a filter for a field it does not know', () => {
    const matches = compileRecordQuery(
      {
        search: '',
        filters: [{ field: 'missing', operator: 'is-set' }],
        sort: [],
        timeZone: 'UTC'
      },
      eventFields
    )
    expect(rows.some(matches)).toBe(false)
  })

  it('reads the field list once, however many rows it tests', () => {
    let reads = 0
    const counted = eventFields.map((field) =>
      field.options
        ? {
            ...field,
            get options() {
              reads += 1
              return field.options
            }
          }
        : field
    )
    const many = Array.from({ length: 500 }, (_, i) => rows[i % rows.length]!)
    const matches = compileRecordQuery(resolve('folk', [], counted), counted)
    const before = reads
    many.forEach(matches)
    expect(reads - before).toBe(0)
  })
})
