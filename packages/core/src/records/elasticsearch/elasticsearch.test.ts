import { describe, expect, it } from 'vitest'

import { toRecordsRequest } from '../request'
import { eventFields } from '../testFields'
import type { RecordField, RecordFilter, RecordQuery } from '../types'
import { toElasticsearch } from './index'

const SYDNEY = 'Australia/Sydney'
// Midday Saturday 3 October 2026 in Sydney.
const options = { now: new Date('2026-10-03T02:00:00Z'), timeZone: SYDNEY }

const request = (
  query: Partial<RecordQuery>,
  fields: readonly RecordField[] = eventFields
) =>
  toRecordsRequest(
    { search: '', filters: [], sort: [], ...query },
    fields,
    options
  )

const venueIs: RecordFilter = {
  field: 'venue',
  operator: 'is',
  values: ['quilted-walrus-room']
}
const venueTerm = {
  term: {
    venue: { value: 'quilted-walrus-room', case_insensitive: true }
  }
}

describe('toElasticsearch', () => {
  it('matches everything with an empty query', () => {
    expect(toElasticsearch(request({}), eventFields)).toEqual({
      query: { bool: {} },
      sort: []
    })
  })

  it('searches every word over the searchable fields', () => {
    const { query } = toElasticsearch(
      request({ search: '  lampshade disco ' }),
      eventFields
    )
    expect(query.bool.must).toEqual([
      {
        simple_query_string: {
          query: 'lampshade disco',
          fields: ['name', 'notes'],
          default_operator: 'and'
        }
      }
    ])
  })

  it('searches the fields it is given, with their boosts', () => {
    const { query } = toElasticsearch(
      request({ search: 'disco' }),
      eventFields,
      { searchFields: ['name^5', 'venueName'] }
    )
    expect(query.bool.must).toEqual([
      {
        simple_query_string: {
          query: 'disco',
          fields: ['name^5', 'venueName'],
          default_operator: 'and'
        }
      }
    ])
  })

  it('puts one clause per chip in the filter, in order', () => {
    const { query } = toElasticsearch(
      request({
        filters: [venueIs, { field: 'capacity', operator: 'gt', value: 400 }]
      }),
      eventFields
    )
    expect(query.bool.filter).toEqual([
      venueTerm,
      { range: { capacity: { gt: 400 } } }
    ])
  })

  it('reads filters and sort at the paths it is given', () => {
    const result = toElasticsearch(
      request({
        filters: [venueIs],
        sort: [{ field: 'venue', direction: 'ascending' }]
      }),
      eventFields,
      { paths: { venue: 'venue.raw' } }
    )
    expect(result.query.bool.filter).toEqual([
      {
        term: {
          'venue.raw': { value: 'quilted-walrus-room', case_insensitive: true }
        }
      }
    ])
    expect(result.sort).toEqual([
      { 'venue.raw': { order: 'asc', missing: '_last' } }
    ])
  })

  it('leaves out the excepted field, to count its values', () => {
    const { query } = toElasticsearch(
      request({
        filters: [
          venueIs,
          { field: 'featured', operator: 'is-true' },
          { field: 'venue', operator: 'is-not', values: ['antler-kettle-hall'] }
        ]
      }),
      eventFields,
      { except: 'venue' }
    )
    expect(query.bool.filter).toEqual([{ term: { featured: { value: true } } }])
  })

  it('sorts in order with empty values last', () => {
    expect(
      toElasticsearch(
        request({
          sort: [
            { field: 'starts', direction: 'ascending' },
            { field: 'gross', direction: 'descending' }
          ]
        }),
        eventFields
      ).sort
    ).toEqual([
      { starts: { order: 'asc', missing: '_last' } },
      { gross: { order: 'desc', missing: '_last' } }
    ])
  })

  it('escapes wildcard operators in contains', () => {
    const { query } = toElasticsearch(
      request({
        filters: [{ field: 'name', operator: 'contains', value: 'a*b?c\\' }]
      }),
      eventFields
    )
    expect(query.bool.filter).toEqual([
      {
        wildcard: {
          name: { value: '*a\\*b\\?c\\\\*', case_insensitive: true }
        }
      }
    ])
  })

  it('compares venue-local dates by day and instants in milliseconds', () => {
    const { query } = toElasticsearch(
      request({
        filters: [
          { field: 'starts', operator: 'on', value: '2026-10-03' },
          { field: 'created', operator: 'within', value: 'today' }
        ]
      }),
      eventFields
    )
    expect(query.bool.filter).toEqual([
      {
        bool: {
          filter: [
            {
              range: {
                startsLocal: { lte: '2026-10-03||/d', format: 'yyyy-MM-dd' }
              }
            },
            {
              range: { endsLocal: { gte: '2026-10-03', format: 'yyyy-MM-dd' } }
            }
          ]
        }
      },
      {
        range: {
          created: {
            gte: Date.parse('2026-10-02T14:00:00Z'),
            lte: Date.parse('2026-10-03T13:59:59.999Z'),
            format: 'epoch_millis'
          }
        }
      }
    ])
  })

  it.each([
    [
      { page: 0, pageSize: 50 },
      { from: 0, size: 50 }
    ],
    [
      { page: 2, pageSize: 25 },
      { from: 50, size: 25 }
    ],
    [
      { start: 30, end: 75 },
      { from: 30, size: 45 }
    ]
  ])('reads %j as %j', (paging, expected) => {
    const { from, size } = toElasticsearch(
      toRecordsRequest(
        { search: '', filters: [], sort: [] },
        eventFields,
        options,
        paging
      ),
      eventFields
    )
    expect({ from, size }).toEqual(expected)
  })

  it('leaves size to the app with no paging', () => {
    expect(toElasticsearch(request({}), eventFields)).not.toHaveProperty('size')
  })

  it('throws on what it cannot read', () => {
    const base = request({})
    expect(() =>
      toElasticsearch({ ...base, version: 2 as 1 }, eventFields)
    ).toThrow('Unsupported records request version 2')
    expect(() =>
      toElasticsearch(
        request({ sort: [{ field: 'nope', direction: 'ascending' }] }, [
          ...eventFields,
          { key: 'nope', label: 'Nope', type: 'text' }
        ]),
        eventFields
      )
    ).toThrow('Unknown field "nope"')
    expect(() =>
      toElasticsearch(base, eventFields, { except: 'nope' })
    ).toThrow('Unknown field "nope"')
    expect(() =>
      toElasticsearch({ ...base, page: 0, pageSize: 0 }, eventFields)
    ).toThrow(RangeError)
    const noLocal = eventFields.map((field) =>
      field.key === 'onSale' ? { ...field, localDateKey: undefined } : field
    )
    expect(() =>
      toElasticsearch(
        request(
          {
            filters: [{ field: 'onSale', operator: 'on', value: '2026-10-03' }]
          },
          noLocal
        ),
        noLocal
      )
    ).toThrow('"On sale" needs a localDateKey')
  })
})
