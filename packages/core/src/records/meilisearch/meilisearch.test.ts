import { describe, expect, it } from 'vitest'

import { eventFields } from '../testFields'
import type { RecordField, RecordFilter, RecordView } from '../types'
import { toMeilisearch } from './index'

const SYDNEY = 'Australia/Sydney'
// Midday Saturday 3 October 2026 in Sydney.
const options = { now: new Date('2026-10-03T02:00:00Z'), timeZone: SYDNEY }
const seconds = (iso: string) => Date.parse(iso) / 1000

const view = (filters: RecordFilter[], search = ''): RecordView => ({
  query: { search, filters, sort: [] },
  layout: { type: 'table' }
})

const filterFor = (filter: RecordFilter, fields = eventFields) =>
  toMeilisearch(view([filter]), fields, options).filter

describe('toMeilisearch', () => {
  it('passes search as q and sort as attribute:direction', () => {
    expect(
      toMeilisearch(
        {
          query: {
            search: '  lampshade disco ',
            filters: [],
            sort: [
              { field: 'starts', direction: 'ascending' },
              { field: 'gross', direction: 'descending' }
            ]
          },
          layout: { type: 'grid' }
        },
        eventFields,
        options
      )
    ).toEqual({
      q: 'lampshade disco',
      filter: [],
      sort: ['starts:asc', 'gross:desc']
    })
  })

  it.each<[RecordFilter, string]>([
    [
      { field: 'venue', operator: 'is', values: ['quilted-walrus-room'] },
      'venue = "quilted-walrus-room"'
    ],
    [
      {
        field: 'venue',
        operator: 'is',
        values: ['quilted-walrus-room', 'antler-kettle-hall']
      },
      'venue IN ["quilted-walrus-room", "antler-kettle-hall"]'
    ],
    [
      { field: 'venue', operator: 'is-not', values: ['quilted-walrus-room'] },
      'venue != "quilted-walrus-room"'
    ],
    [
      { field: 'genres', operator: 'is-not', values: ['jazz', 'folk'] },
      'genres NOT IN ["jazz", "folk"]'
    ],
    [
      { field: 'genres', operator: 'has-all', values: ['jazz', 'folk'] },
      '(genres = "jazz" AND genres = "folk")'
    ],
    [
      { field: 'name', operator: 'contains', value: 'lampshade' },
      'name CONTAINS "lampshade"'
    ],
    [
      { field: 'name', operator: 'not-contains', value: 'lampshade' },
      'NOT name CONTAINS "lampshade"'
    ],
    [
      { field: 'name', operator: 'is', values: ['Say "hi" \\ bye'] },
      'name = "Say \\"hi\\" \\ bye"'
    ],
    [{ field: 'capacity', operator: 'eq', value: 400 }, 'capacity = 400'],
    [{ field: 'capacity', operator: 'neq', value: 400 }, 'capacity != 400'],
    [{ field: 'capacity', operator: 'lt', value: 400 }, 'capacity < 400'],
    [{ field: 'gross', operator: 'gt', value: -2.5 }, 'gross > -2.5'],
    [
      { field: 'capacity', operator: 'between', value: [100, 500] },
      'capacity 100 TO 500'
    ],
    [{ field: 'featured', operator: 'is-true' }, 'featured = true'],
    [{ field: 'featured', operator: 'is-false' }, 'featured = false'],
    [
      { field: 'venue', operator: 'is-set' },
      '(venue EXISTS AND venue IS NOT NULL AND venue IS NOT EMPTY)'
    ],
    [
      { field: 'venue', operator: 'is-not-set' },
      '(venue NOT EXISTS OR venue IS NULL OR venue IS EMPTY)'
    ]
  ])('writes %j', (filter, expected) => {
    expect(filterFor(filter)).toEqual([expected])
  })

  it('escapes quotes and leaves backslashes as Meilisearch reads them', () => {
    expect(
      filterFor({ field: 'name', operator: 'contains', value: 'say "hi" a\\b' })
    ).toEqual(['name CONTAINS "say \\"hi\\" a\\b"'])
  })

  it.each([
    ['a\\\\', '"a\\\\"'],
    ['a\\\\"b', '"a\\\\\\"b"']
  ])('keeps an even run of backslashes: %s', (value, quoted) => {
    expect(filterFor({ field: 'name', operator: 'contains', value })).toEqual([
      `name CONTAINS ${quoted}`
    ])
  })

  it.each(['ends in \\', 'holds \\" here', 'three \\\\\\" here'])(
    'refuses a value Meilisearch cannot read back: %s',
    (value) => {
      expect(() =>
        filterFor({ field: 'name', operator: 'contains', value })
      ).toThrow('cannot hold a backslash')
    }
  )

  it.each([NaN, Infinity])('refuses %d, which has no literal', (value) => {
    expect(() =>
      filterFor({ field: 'capacity', operator: 'eq', value })
    ).toThrow('finite')
  })

  it('throws on an unknown sort field', () => {
    expect(() =>
      toMeilisearch(
        {
          query: {
            search: '',
            filters: [],
            sort: [{ field: 'nope', direction: 'ascending' }]
          },
          layout: { type: 'table' }
        },
        eventFields,
        options
      )
    ).toThrow('Unknown field "nope"')
  })

  it.each<[number, string]>([
    [1e21, 'capacity = 1000000000000000000000'],
    [1e-7, 'capacity = 0.0000001'],
    [-0.5, 'capacity = -0.5'],
    [1.23456789e-15, 'capacity = 0.00000000000000123456789'],
    [-1e-21, 'capacity = -0.000000000000000000001'],
    [-0, 'capacity = 0']
  ])('writes %d without an exponent', (value, expected) => {
    expect(filterFor({ field: 'capacity', operator: 'eq', value })).toEqual([
      expected
    ])
  })

  describe('dates', () => {
    it.each<[RecordFilter, string]>([
      // Event moments compare the stored venue-local dates, and test overlap.
      [
        { field: 'starts', operator: 'within', value: 'this-weekend' },
        '(startsLocal <= "2026-10-04" AND endsLocal >= "2026-10-03")'
      ],
      [
        { field: 'starts', operator: 'on', value: '2026-10-03' },
        '(startsLocal <= "2026-10-03" AND endsLocal >= "2026-10-03")'
      ],
      [
        { field: 'starts', operator: 'before', value: '2026-10-03' },
        'startsLocal <= "2026-10-02"'
      ],
      [
        { field: 'starts', operator: 'after', value: '2026-10-03' },
        'endsLocal >= "2026-10-04"'
      ],
      [
        { field: 'onSale', operator: 'within', value: 'next-week' },
        '(onSaleLocal >= "2026-10-05" AND onSaleLocal <= "2026-10-11")'
      ],
      // Hour windows and open ranges compare the instant.
      [
        {
          field: 'starts',
          operator: 'within',
          value: { direction: 'next', amount: 6, unit: 'hour' }
        },
        `("starts" <= ${seconds('2026-10-03T08:00:00Z')} AND ends >= ${seconds('2026-10-03T02:00:00Z')})`
      ],
      [
        { field: 'onSale', operator: 'within', value: 'upcoming' },
        `onSale >= ${seconds('2026-10-03T02:00:00Z')}`
      ],
      [
        { field: 'onSale', operator: 'within', value: 'past' },
        `onSale <= ${seconds('2026-10-03T02:00:00Z')}`
      ],
      // Timestamps compare instants across the viewer's day.
      [
        { field: 'created', operator: 'within', value: 'today' },
        `created ${seconds('2026-10-02T14:00:00Z')} TO ${seconds('2026-10-03T14:00:00Z') - 1}`
      ],
      // Plain dates compare as themselves.
      [
        {
          field: 'birthday',
          operator: 'between',
          value: ['1990-01-01', '1990-12-31']
        },
        '(birthday >= "1990-01-01" AND birthday <= "1990-12-31")'
      ],
      [
        { field: 'birthday', operator: 'within', value: 'upcoming' },
        'birthday >= "2026-10-03"'
      ]
    ])('writes %j', (filter, expected) => {
      expect(filterFor(filter)).toEqual([expected])
    })

    it('rounds instants inward when the index holds milliseconds or seconds', () => {
      const filter: RecordFilter = {
        field: 'created',
        operator: 'after',
        value: '2026-10-03T09:30:00.500+10:00'
      }
      expect(
        toMeilisearch(view([filter]), eventFields, {
          ...options,
          epoch: 'milliseconds'
        }).filter
      ).toEqual([`created >= ${Date.parse('2026-10-02T23:30:00.501Z')}`])
      expect(filterFor(filter)).toEqual([
        `created >= ${seconds('2026-10-02T23:30:01Z')}`
      ])
    })

    it('needs a local date key to compare venue-local dates', () => {
      const fields: RecordField[] = [
        { key: 'doors', label: 'Doors', type: 'date', moment: 'event' }
      ]
      expect(() =>
        filterFor(
          { field: 'doors', operator: 'within', value: 'today' },
          fields
        )
      ).toThrow('"Doors" needs a localDateKey')
      expect(
        filterFor(
          { field: 'doors', operator: 'within', value: 'upcoming' },
          fields
        )
      ).toEqual([`doors >= ${seconds('2026-10-03T02:00:00Z')}`])
    })
  })

  // Keywords are quoted in any case: "starts" could read as STARTS WITH.
  it('quotes attribute names that are not plain identifiers', () => {
    const fields: RecordField[] = [
      { key: 'ticket type', label: 'Ticket type', type: 'option' },
      { key: 'NOT', label: 'Not', type: 'number' },
      { key: 'venue.name', label: 'Venue name', type: 'text' }
    ]
    expect(
      toMeilisearch(
        view([
          { field: 'ticket type', operator: 'is', values: ['vip'] },
          { field: 'NOT', operator: 'eq', value: 1 },
          { field: 'venue.name', operator: 'contains', value: 'hall' }
        ]),
        fields,
        options
      ).filter
    ).toEqual([
      '"ticket type" = "vip"',
      '"NOT" = 1',
      'venue.name CONTAINS "hall"'
    ])
  })

  it('pins a full view', () => {
    expect(
      toMeilisearch(
        {
          query: {
            search: 'jazz',
            filters: [
              {
                field: 'city',
                operator: 'is',
                values: ['melbourne', 'sydney']
              },
              { field: 'starts', operator: 'within', value: 'this-weekend' },
              { field: 'status', operator: 'is-not', values: ['sold_out'] },
              { field: 'capacity', operator: 'is-set' },
              { field: 'gross', operator: 'between', value: [1000, 50000] }
            ],
            sort: [{ field: 'starts', direction: 'ascending' }]
          },
          layout: { type: 'table' }
        },
        eventFields,
        options
      )
    ).toMatchSnapshot()
  })
})
