import { describe, expect, it } from 'vitest'

import { toRecordsRequest } from './request'
import { eventFields } from './testFields'
import type { RecordQuery } from './types'

const query: RecordQuery = {
  search: 'lampshade',
  filters: [
    { field: 'starts', operator: 'on', value: '2026-10-03' },
    { field: 'capacity', operator: 'gt', value: 200 }
  ],
  sort: [{ field: 'starts', direction: 'ascending' }]
}
const options = {
  now: new Date('2026-10-02T13:30:00Z'),
  timeZone: 'Australia/Melbourne'
}

describe('toRecordsRequest', () => {
  it('sends the query with its dates fixed, under version 1', () => {
    expect(toRecordsRequest(query, eventFields, options)).toEqual({
      version: 1,
      query: {
        search: 'lampshade',
        filters: [
          {
            field: 'starts',
            operator: 'overlaps',
            range: { kind: 'dates', start: '2026-10-03', end: '2026-10-03' }
          },
          { field: 'capacity', operator: 'gt', value: 200 }
        ],
        sort: [{ field: 'starts', direction: 'ascending' }],
        timeZone: 'Australia/Melbourne'
      }
    })
  })

  it('puts the page scope before the view filters', () => {
    const request = toRecordsRequest(query, eventFields, {
      ...options,
      scope: [
        { field: 'venue', operator: 'is', values: ['antler-kettle-hall'] }
      ]
    })
    expect(request.query.filters.map((filter) => filter.field)).toEqual([
      'venue',
      'starts',
      'capacity'
    ])
  })

  it('asks for a page, or for rows by range', () => {
    expect(
      toRecordsRequest(query, eventFields, options, { page: 2, pageSize: 50 })
    ).toMatchObject({ page: 2, pageSize: 50 })
    expect(
      toRecordsRequest(query, eventFields, options, { start: 100, end: 150 })
    ).toMatchObject({ start: 100, end: 150 })
  })

  it('takes a position as paging, leaving its row out', () => {
    const position = { page: 1, pageSize: 25, row: 40 }
    const request = toRecordsRequest(query, eventFields, options, position)
    expect(request).not.toHaveProperty('row')
    expect(request).toMatchObject({ page: 1, pageSize: 25 })
  })

  it.each([
    [{ page: -1, pageSize: 50 }],
    [{ page: 0, pageSize: 0 }],
    [{ page: 1.5, pageSize: 50 }],
    [{ start: 50, end: 50 }],
    [{ start: -1, end: 50 }]
  ])('rejects paging that reads no rows: %o', (paging) => {
    expect(() => toRecordsRequest(query, eventFields, options, paging)).toThrow(
      RangeError
    )
  })
})
