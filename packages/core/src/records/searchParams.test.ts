import { describe, expect, it } from 'vitest'

import {
  recordViewFromSearchParams,
  recordViewToSearchParams
} from './searchParams'
import { eventFields } from './testFields'
import type { RecordView } from './types'

const full: RecordView = {
  id: 'upcoming',
  name: 'Upcoming',
  entity: 'events',
  query: {
    search: 'lampshade disco',
    filters: [
      {
        field: 'venue',
        operator: 'is',
        values: ['quilted-walrus-room', 'antler-kettle-hall']
      },
      { field: 'genres', operator: 'has-all', values: ['jazz', 'folk'] },
      { field: 'city', operator: 'is-not', values: ['perth'] },
      { field: 'starts', operator: 'within', value: 'this-weekend' },
      { field: 'capacity', operator: 'between', value: [100, 500] },
      { field: 'capacity', operator: 'gt', value: -1.5 },
      { field: 'name', operator: 'contains', value: 'a, b: 100% c' },
      { field: 'name', operator: 'not-contains', value: 'test' },
      { field: 'featured', operator: 'is-true' },
      { field: 'gross', operator: 'is-not-set' },
      {
        field: 'created',
        operator: 'within',
        value: { direction: 'next', amount: 7, unit: 'day' }
      },
      {
        field: 'created',
        operator: 'within',
        value: { period: 'month', offset: -2 }
      },
      {
        field: 'created',
        operator: 'within',
        value: { period: 'year', offset: 0, fiscal: true, toDate: true }
      },
      {
        field: 'created',
        operator: 'after',
        value: '2026-10-03T09:30:00+10:00'
      },
      {
        field: 'starts',
        operator: 'between',
        value: ['2026-10-01', '2026-10-31']
      }
    ],
    sort: [
      { field: 'starts', direction: 'ascending' },
      { field: 'gross', direction: 'descending' }
    ]
  },
  layout: {
    type: 'table',
    columns: { order: ['name', 'starts'], hidden: ['gross'] }
  }
}

const FULL_PARAMS = [
  ['v', '1'],
  ['view', 'upcoming'],
  ['entity', 'events'],
  ['q', 'lampshade disco'],
  ['f', 'venue:is:quilted-walrus-room,antler-kettle-hall'],
  ['f', 'genres:has-all:jazz,folk'],
  ['f', 'city:is-not:perth'],
  ['f', 'starts:within:this-weekend'],
  ['f', 'capacity:between:100,500'],
  ['f', 'capacity:gt:-1.5'],
  ['f', 'name:contains:a, b: 100% c'],
  ['f', 'name:not-contains:test'],
  ['f', 'featured:is-true'],
  ['f', 'gross:is-not-set'],
  ['f', 'created:within:next-7-day'],
  ['f', 'created:within:month.-2'],
  ['f', 'created:within:year.0.fiscal.to-date'],
  ['f', 'created:after:2026-10-03T09:30:00+10:00'],
  ['f', 'starts:between:2026-10-01,2026-10-31'],
  ['sort', 'starts,-gross'],
  ['layout', 'table'],
  ['columns', 'name,starts'],
  ['hidden', 'gross'],
  ['page', '3'],
  ['size', '50'],
  ['row', '120']
]

const empty: RecordView = {
  query: { search: '', filters: [], sort: [] },
  layout: { type: 'table' }
}

describe('recordViewToSearchParams', () => {
  it('writes format v1, in a fixed order, leaving out the name', () => {
    expect([
      ...recordViewToSearchParams(full, { page: 2, pageSize: 50, row: 120 })
    ]).toEqual(FULL_PARAMS)
  })

  it('pins the encoded string', () => {
    expect(
      recordViewToSearchParams({
        query: {
          search: 'late show',
          filters: [
            {
              field: 'venue',
              operator: 'is',
              values: ['quilted-walrus-room', 'a,b']
            },
            { field: 'starts', operator: 'within', value: 'today' }
          ],
          sort: [{ field: 'starts', direction: 'descending' }]
        },
        layout: { type: 'grid', fields: ['name', 'starts'] }
      }).toString()
    ).toBe(
      'v=1&q=late+show&f=venue%3Ais%3Aquilted-walrus-room%2Ca%252Cb&f=starts%3Awithin%3Atoday&sort=-starts&layout=grid&fields=name%2Cstarts'
    )
  })

  it('writes only the version for an empty table view', () => {
    expect(recordViewToSearchParams(empty).toString()).toBe('v=1')
  })

  it('escapes commas, colons, percents and a leading dash in keys', () => {
    const params = recordViewToSearchParams({
      query: {
        search: '',
        filters: [{ field: 'a:b', operator: 'is', values: ['x%y', '-z'] }],
        sort: [{ field: '-odd,key', direction: 'ascending' }]
      },
      layout: { type: 'table', columns: { hidden: ['c,d'] } }
    })
    expect([...params]).toEqual([
      ['v', '1'],
      ['f', 'a%3Ab:is:x%25y,-z'],
      ['sort', '%2Dodd%2Ckey'],
      ['layout', 'table'],
      ['hidden', 'c%2Cd']
    ])
  })
})

describe('recordViewFromSearchParams', () => {
  it('reads every part back', () => {
    const params = new URLSearchParams(FULL_PARAMS)
    const { view, position, source, problems } = recordViewFromSearchParams(
      params,
      eventFields
    )
    expect(view).toEqual({ ...full, version: 1, name: undefined })
    expect(view).not.toHaveProperty('name')
    expect(position).toEqual({ page: 2, pageSize: 50, row: 120 })
    expect(source).toBe('url')
    expect(problems).toEqual([])
  })

  it('round-trips to the same string', () => {
    const text = new URLSearchParams(FULL_PARAMS).toString()
    const { view, position } = recordViewFromSearchParams(text, eventFields)
    expect(recordViewToSearchParams(view, position).toString()).toBe(text)
  })

  it('reads a relative range in its one form', () => {
    const { view } = recordViewFromSearchParams(
      'v=1&f=starts:within:week.0&f=created:within:quarter.1.to-date',
      eventFields
    )
    expect(view.query.filters).toEqual([
      { field: 'starts', operator: 'within', value: 'this-week' },
      {
        field: 'created',
        operator: 'within',
        value: { period: 'quarter', offset: 1, toDate: true }
      }
    ])
    expect(recordViewToSearchParams(view).toString()).toBe(
      'v=1&f=starts%3Awithin%3Athis-week&f=created%3Awithin%3Aquarter.1.to-date'
    )
  })

  it('writes a relative range in its one form', () => {
    const view: RecordView = {
      query: {
        search: '',
        filters: [
          {
            field: 'starts',
            operator: 'within',
            value: { period: 'week', offset: 0 }
          },
          {
            field: 'created',
            operator: 'within',
            value: { period: 'month', offset: -2, fiscal: true }
          }
        ],
        sort: []
      },
      layout: { type: 'table' }
    }
    expect(recordViewToSearchParams(view).toString()).toBe(
      'v=1&f=starts%3Awithin%3Athis-week&f=created%3Awithin%3Amonth.-2'
    )
  })

  it('takes a framework search params object', () => {
    expect(
      recordViewFromSearchParams(
        {
          v: '1',
          q: 'lampshade',
          f: ['venue:is:quilted-walrus-room', 'featured:is-true']
        },
        eventFields
      ).view.query
    ).toEqual({
      search: 'lampshade',
      filters: [
        { field: 'venue', operator: 'is', values: ['quilted-walrus-room'] },
        { field: 'featured', operator: 'is-true' }
      ],
      sort: []
    })
  })

  it('gives a fresh default view on each call', () => {
    const first = recordViewFromSearchParams('', eventFields).view
    first.query.filters.push({ field: 'featured', operator: 'is-true' })
    expect(
      recordViewFromSearchParams('', eventFields).view.query.filters
    ).toEqual([])
  })

  it('ignores keys it does not know', () => {
    const result = recordViewFromSearchParams(
      'utm_source=newsletter&v=1&q=jazz&tab=2',
      eventFields
    )
    expect(result.source).toBe('url')
    expect(result.view.query.search).toBe('jazz')
  })

  it('keeps grid fields in order', () => {
    expect(
      recordViewFromSearchParams(
        'v=1&layout=grid&fields=starts%2Cname',
        eventFields
      ).view.layout
    ).toEqual({ type: 'grid', fields: ['starts', 'name'] })
  })

  it('falls back with no view in the URL, quietly', () => {
    const fallback = { ...empty, id: 'all' }
    expect(
      recordViewFromSearchParams('page=2', eventFields, { fallback })
    ).toEqual({
      view: fallback,
      position: { page: 1 },
      source: 'fallback',
      problems: []
    })
  })

  it.each([
    ['v=2&q=x', 'v', 'Unsupported view format "2"'],
    ['v=1&f=nope:is:x', 'query.filters[0].field', 'Unknown field "nope"'],
    ['v=1&f=venue:contains:x', 'query.filters[0].operator', 'does not fit'],
    ['v=1&f=capacity:gt:many', 'query.filters[0].value', 'number'],
    ['v=1&f=capacity:gt:', 'query.filters[0].value', 'number'],
    ['v=1&f=capacity:between:9', 'query.filters[0].value', 'two'],
    ['v=1&f=starts:within:someday', 'query.filters[0].value', ''],
    ['v=1&f=venue', 'query.filters[0]', 'field:operator'],
    ['v=1&f=venue:is:', 'query.filters[0].values', 'Pick at least one value'],
    [
      'v=1&f=featured:is-true:garbage',
      'query.filters[0].value',
      'takes no value'
    ],
    ['v=1&layout=board', 'layout', 'Unknown layout "board"']
  ])('rejects %s and falls back', (text, path, message) => {
    const result = recordViewFromSearchParams(text, eventFields, {
      fallback: { ...empty, id: 'all' }
    })
    expect(result.source).toBe('fallback')
    expect(result.view.id).toBe('all')
    expect(result.problems[0]).toMatchObject({
      path,
      message: expect.stringContaining(message)
    })
  })

  it.each([
    ['page=0', {}],
    ['page=x', {}],
    ['page=1', { page: 0 }],
    ['size=0', {}],
    ['size=25', { pageSize: 25 }],
    ['row=0', { row: 0 }],
    ['row=-1', {}],
    ['page=99999999999999999999', {}]
  ])('reads position %s', (text, position) => {
    expect(
      recordViewFromSearchParams(`v=1&${text}`, eventFields).position
    ).toEqual(position)
  })

  it('reads the first of a repeated key', () => {
    const result = recordViewFromSearchParams(
      'v=1&q=Perth&q=Hobart&page=5&page=9',
      eventFields
    )
    expect(result.view.query.search).toBe('Perth')
    expect(result.position).toEqual({ page: 4 })
  })

  it.each([
    'v=1&f=__proto__:is:x&f=constructor:is:y',
    'v=1&f=%25&sort=%&q=%E0%A4%A',
    'v=1&page=%25&size=abc&row=',
    'v=1&sort=__proto__,-constructor&columns=__proto__&hidden=toString',
    'v=1&layout=__proto__'
  ])(
    'never throws or touches Object.prototype on hostile input: %s',
    (text) => {
      const before = Object.getOwnPropertyNames(Object.prototype)
      expect(() => recordViewFromSearchParams(text, eventFields)).not.toThrow()
      expect(Object.getOwnPropertyNames(Object.prototype)).toEqual(before)
    }
  )

  it('rejects filters on inherited names rather than reading them as fields', () => {
    const result = recordViewFromSearchParams(
      'v=1&f=constructor:is:y',
      eventFields,
      {
        fallback: { ...empty, id: 'all' }
      }
    )
    expect(result.source).toBe('fallback')
    expect(result.problems[0]?.message).toContain('Unknown field')
  })

  it('round-trips values holding literal escapes', () => {
    const literal: RecordView = {
      version: 1,
      ...empty,
      query: {
        search: '%2D %2C%25',
        filters: [{ field: 'name', operator: 'contains', value: 'a%2Cb:%25' }],
        sort: []
      }
    }
    const text = recordViewToSearchParams(literal).toString()
    expect(recordViewFromSearchParams(text, eventFields).view).toEqual(literal)
  })

  it('keeps a view whose value Meilisearch can’t hold, such as a Windows path', () => {
    const view: RecordView = {
      query: {
        search: '',
        filters: [
          { field: 'name', operator: 'contains', value: 'C:\\' },
          { field: 'city', operator: 'is', values: ['melbourne'] }
        ],
        sort: []
      },
      layout: { type: 'table' }
    }
    const read = recordViewFromSearchParams(
      recordViewToSearchParams(view),
      eventFields
    )
    expect(read.source).toBe('url')
    expect(read.view.query.filters).toEqual(view.query.filters)
    expect(read.problems).toEqual([
      expect.objectContaining({
        severity: 'warning',
        path: 'query.filters[0].value'
      })
    ])
  })
})
