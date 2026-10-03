import { describe, expect, it } from 'vitest'

import { eventFields } from './testFields'
import type { RecordFilter, RecordView } from './types'
import { validateRecordView } from './validate'

const view = (
  filters: unknown[] = [],
  extra: Partial<Record<keyof RecordView, unknown>> = {}
) => ({
  query: { search: '', filters, sort: [] },
  layout: { type: 'table' },
  ...extra
})

const errors = (input: unknown) => {
  const result = validateRecordView(input, eventFields)
  return result.problems.filter((p) => p.severity === 'error')
}

describe('validateRecordView', () => {
  it('accepts a view using every operator where it fits', () => {
    const filters: RecordFilter[] = [
      { field: 'name', operator: 'contains', value: 'night' },
      { field: 'name', operator: 'not-contains', value: 'test' },
      { field: 'orderNumber', operator: 'is', values: ['OZ-12345'] },
      { field: 'venue', operator: 'is', values: ['velvet-room'] },
      { field: 'venue', operator: 'is-not', values: ['harbourside-hall'] },
      { field: 'genres', operator: 'has-all', values: ['jazz', 'folk'] },
      { field: 'capacity', operator: 'gt', value: 200 },
      { field: 'capacity', operator: 'between', value: [100, 500] },
      { field: 'gross', operator: 'eq', value: 0 },
      { field: 'starts', operator: 'on', value: '2026-10-03' },
      {
        field: 'starts',
        operator: 'between',
        value: ['2026-10-01', '2026-10-31']
      },
      { field: 'starts', operator: 'within', value: 'this-weekend' },
      {
        field: 'starts',
        operator: 'within',
        value: { direction: 'next', amount: 6, unit: 'hour' }
      },
      {
        field: 'created',
        operator: 'after',
        value: '2026-10-03T09:30:00+10:00'
      },
      {
        field: 'created',
        operator: 'within',
        value: { period: 'month', offset: 0, toDate: true }
      },
      { field: 'birthday', operator: 'before', value: '2000-01-01' },
      { field: 'featured', operator: 'is-true' },
      { field: 'capacity', operator: 'is-not-set' },
      { field: 'venue', operator: 'is-set' }
    ]
    const result = validateRecordView(
      view(filters, {
        id: 'upcoming',
        name: 'Upcoming',
        entity: 'events',
        query: {
          search: 'neon',
          filters,
          sort: [{ field: 'starts', direction: 'ascending' }]
        },
        layout: {
          type: 'table',
          columns: { order: ['name', 'starts'], hidden: ['gross'] }
        }
      }),
      eventFields
    )
    expect(result.problems).toEqual([])
    expect(result.ok).toBe(true)
  })

  it('rejects something that is not a view', () => {
    expect(validateRecordView(null, eventFields).ok).toBe(false)
    expect(errors({ query: { search: '' } })[0]!.path).toBe('query.filters')
  })

  it('names an unknown field and lists the ones it knows', () => {
    const [problem] = errors(
      view([{ field: 'venu', operator: 'is', values: ['x'] }])
    )
    expect(problem).toMatchObject({
      path: 'query.filters[0].field',
      message: expect.stringContaining('Unknown field "venu"')
    })
    expect(problem!.message).toContain('venue')
  })

  it('rejects a field that is not filterable', () => {
    expect(
      errors(view([{ field: 'notes', operator: 'contains', value: 'x' }]))[0]!
        .message
    ).toBe('"Notes" is not filterable')
  })

  it.each<[RecordFilter, string]>([
    [
      { field: 'venue', operator: 'contains', value: 'x' },
      '"Venue" is an option field, so "contains" does not fit. Use is, is-not, is-set or is-not-set'
    ],
    [
      { field: 'venue', operator: 'has-all', values: ['x'] },
      '"Venue" is an option field, so "has-all" does not fit. Use is, is-not, is-set or is-not-set'
    ],
    [
      { field: 'featured', operator: 'eq', value: 1 },
      '"Featured" is a boolean field, so "eq" does not fit. Use is-true, is-false, is-set or is-not-set'
    ],
    [
      { field: 'starts', operator: 'gt', value: 1 },
      '"Starts" is a date field, so "gt" does not fit. Use on, before, after, between, within, is-set or is-not-set'
    ]
  ])('rejects an operator that does not fit: %j', (filter, message) => {
    expect(errors(view([filter]))[0]).toMatchObject({
      path: 'query.filters[0].operator',
      message
    })
  })

  it.each<[unknown, string, string]>([
    [
      { field: 'venue', operator: 'is', values: [] },
      'query.filters[0].values',
      'Pick at least one value'
    ],
    [
      { field: 'capacity', operator: 'between', value: [500, 100] },
      'query.filters[0].value',
      'The range starts after it ends'
    ],
    [
      {
        field: 'capacity',
        operator: 'between',
        value: ['2026-01-01', '2026-02-01']
      },
      'query.filters[0].value',
      '"Capacity" is a number field, so between takes two numbers'
    ],
    [
      { field: 'starts', operator: 'between', value: [1, 2] },
      'query.filters[0].value',
      '"Starts" is a date field, so between takes two dates'
    ],
    [
      { field: 'starts', operator: 'on', value: '3 Oct' },
      'query.filters[0].value',
      'Use an ISO date, like 2026-10-03'
    ],
    [
      { field: 'starts', operator: 'on', value: '2026-02-30' },
      'query.filters[0].value',
      'Use an ISO date, like 2026-10-03'
    ],
    [
      { field: 'starts', operator: 'after', value: '2026-10-03T19:00' },
      'query.filters[0].value',
      '"Starts" compares venue-local dates, so use a date with no time, like 2026-10-03'
    ],
    [
      { field: 'created', operator: 'on', value: '2026-10-03T19:00:00Z' },
      'query.filters[0].value',
      'On takes a date with no time; use between for a span of time'
    ],
    [
      {
        field: 'birthday',
        operator: 'within',
        value: { direction: 'next', amount: 2, unit: 'hour' }
      },
      'query.filters[0].value',
      '"Birthday" holds plain dates, so it has no hours to count'
    ],
    [
      {
        field: 'starts',
        operator: 'between',
        value: ['2026-10-05', '2026-10-01']
      },
      'query.filters[0].value',
      'The range starts after it ends'
    ]
  ])('rejects a value that does not fit: %j', (filter, path, message) => {
    expect(errors(view([filter]))[0]).toMatchObject({ path, message })
  })

  it.each([
    [['2026-10-03T20:00Z', '2026-10-03']],
    [['2026-10-03', '2026-10-03T05:00Z']]
  ])(
    'rejects mixed ends that could run backwards in some zone: %j',
    (value) => {
      expect(
        errors(view([{ field: 'created', operator: 'between', value }]))[0]
      ).toMatchObject({
        path: 'query.filters[0].value',
        message: expect.stringContaining('both ends')
      })
    }
  )

  it('rejects a malformed relative range', () => {
    expect(
      errors(
        view([
          {
            field: 'starts',
            operator: 'within',
            value: { direction: 'next', amount: 0, unit: 'day' }
          }
        ])
      )[0]!.path
    ).toBe('query.filters[0].value.amount')
  })

  it.each([
    [
      { field: 'name', operator: 'contains', value: '' },
      'query.filters[0].value'
    ],
    [
      { field: 'venue', operator: 'is', values: ['velvet-room', ''] },
      'query.filters[0].values[1]'
    ]
  ])('rejects empty text where a value is needed: %j', (filter, path) => {
    expect(errors(view([filter]))[0]!.path).toBe(path)
  })

  it('rejects a filter missing its value', () => {
    expect(errors(view([{ field: 'capacity', operator: 'eq' }]))[0]!.path).toBe(
      'query.filters[0].value'
    )
  })

  it('rejects sorting by an unknown or unsortable field', () => {
    const fields = [
      ...eventFields,
      { key: 'id', label: 'ID', type: 'text' as const, sortable: false }
    ]
    const result = validateRecordView(
      {
        query: {
          search: '',
          filters: [],
          sort: [
            { field: 'nope', direction: 'ascending' },
            { field: 'id', direction: 'descending' }
          ]
        },
        layout: { type: 'table' }
      },
      fields
    )
    expect(result.problems.map((p) => [p.path, p.message])).toEqual([
      ['query.sort[0].field', expect.stringContaining('Unknown field "nope"')],
      ['query.sort[1].field', '"ID" is not sortable']
    ])
  })

  it('warns, without failing, about layout keys it does not know', () => {
    const result = validateRecordView(
      view([], {
        layout: { type: 'table', columns: { order: ['name', 'actions'] } }
      }),
      eventFields
    )
    expect(result.ok).toBe(true)
    expect(result.problems).toEqual([
      {
        path: 'layout.columns.order[1]',
        message: 'Unknown field "actions"',
        severity: 'warning'
      }
    ])
    const grid = validateRecordView(
      view([], { layout: { type: 'grid', fields: ['poster'] } }),
      eventFields
    )
    expect(grid.problems[0]!.path).toBe('layout.fields[0]')
  })

  it('rejects unknown keys on the view', () => {
    expect(errors(view([], { page: 2 } as never))[0]!.message).toMatch(
      /Unrecognized key/
    )
  })
})
