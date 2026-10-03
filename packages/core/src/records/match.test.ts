import { describe, expect, it } from 'vitest'

import { matchesRecordQuery } from './match'
import { resolveRecordQuery } from './resolve'
import { eventFields, eventRows } from './testFields'
import type { RecordFilter } from './types'

const SYDNEY = 'Australia/Sydney'
const PERTH = 'Australia/Perth'
const rows = eventRows

const all = Object.values(rows)

function ids(
  filters: RecordFilter[],
  { search = '', now = '2026-10-03T02:00:00Z', timeZone = SYDNEY } = {}
) {
  const resolved = resolveRecordQuery(
    { search, filters, sort: [] },
    eventFields,
    { now: new Date(now), timeZone }
  )
  return all
    .filter((row) => matchesRecordQuery(row, resolved, eventFields))
    .map((row) => row.id)
}

describe('matchesRecordQuery', () => {
  it('matches everything with no search or filters', () => {
    expect(ids([])).toEqual(['velvet', 'swan', 'festival', 'tba'])
  })

  it.each<[string, RecordFilter[], string[]]>([
    [
      'is: one of',
      [
        {
          field: 'venue',
          operator: 'is',
          values: ['velvet-room', 'swan-lane-social']
        }
      ],
      ['velvet', 'swan']
    ],
    [
      'is: ignores case like Meilisearch',
      [{ field: 'venue', operator: 'is', values: ['VELVET-ROOM'] }],
      ['velvet']
    ],
    [
      'is-not: keeps empty rows',
      [{ field: 'venue', operator: 'is-not', values: ['velvet-room'] }],
      ['swan', 'festival', 'tba']
    ],
    [
      'multiple is: has any of',
      [{ field: 'genres', operator: 'is', values: ['folk', 'comedy'] }],
      ['velvet', 'swan']
    ],
    [
      'multiple is-not: has none of',
      [{ field: 'genres', operator: 'is-not', values: ['jazz'] }],
      ['swan', 'festival', 'tba']
    ],
    [
      'multiple has-all',
      [{ field: 'genres', operator: 'has-all', values: ['jazz', 'folk'] }],
      ['velvet']
    ],
    [
      'chips AND',
      [
        { field: 'city', operator: 'is', values: ['sydney'] },
        { field: 'status', operator: 'is-not', values: ['sold_out'] }
      ],
      ['velvet']
    ],
    [
      'contains: any case',
      [{ field: 'name', operator: 'contains', value: 'LAUGH' }],
      ['swan']
    ],
    [
      'not-contains',
      [{ field: 'name', operator: 'not-contains', value: 'nights' }],
      ['swan', 'festival', 'tba']
    ],
    [
      'text is: exact',
      [{ field: 'name', operator: 'is', values: ['neon nights'] }],
      ['velvet']
    ],
    ['eq', [{ field: 'capacity', operator: 'eq', value: 400 }], ['velvet']],
    [
      'neq: keeps empty rows',
      [{ field: 'capacity', operator: 'neq', value: 400 }],
      ['swan', 'festival', 'tba']
    ],
    ['lt', [{ field: 'capacity', operator: 'lt', value: 5000 }], ['velvet']],
    ['gt', [{ field: 'capacity', operator: 'gt', value: 400 }], ['festival']],
    [
      'between: inclusive',
      [{ field: 'capacity', operator: 'between', value: [400, 5000] }],
      ['velvet', 'festival']
    ],
    [
      'money eq 0 is set',
      [{ field: 'gross', operator: 'eq', value: 0 }],
      ['swan']
    ],
    ['is-true', [{ field: 'featured', operator: 'is-true' }], ['velvet']],
    ['is-false', [{ field: 'featured', operator: 'is-false' }], ['swan']],
    [
      'is-set: zero counts',
      [{ field: 'gross', operator: 'is-set' }],
      ['velvet', 'swan']
    ],
    [
      'is-not-set: null, undefined, empty text and lists',
      [{ field: 'venue', operator: 'is-not-set' }],
      ['tba']
    ],
    [
      'is-not-set on a list',
      [{ field: 'genres', operator: 'is-not-set' }],
      ['festival', 'tba']
    ],
    [
      'is-set on a range reads its start',
      [{ field: 'starts', operator: 'is-set' }],
      ['velvet', 'swan', 'festival']
    ]
  ])('%s', (_, filters, expected) => {
    expect(ids(filters)).toEqual(expected)
  })

  it.each<[string, object, RecordFilter, boolean]>([
    [
      'is-true on a list',
      { featured: [false, true] },
      { field: 'featured', operator: 'is-true' },
      true
    ],
    [
      'is-false on a list',
      { featured: [false] },
      { field: 'featured', operator: 'is-false' },
      true
    ],
    [
      'contains reads text only',
      { name: 400 },
      { field: 'name', operator: 'contains', value: '40' },
      false
    ],
    [
      'NaN is not set',
      { capacity: NaN },
      { field: 'capacity', operator: 'is-set' },
      false
    ],
    [
      'an invalid date is not set',
      { created: new Date('nope') },
      { field: 'created', operator: 'is-set' },
      false
    ],
    [
      'a Date with no own keys is set',
      { created: new Date('2026-10-03') },
      { field: 'created', operator: 'is-set' },
      true
    ],
    [
      'an empty null-prototype object is not set',
      { venue: Object.create(null) as object },
      { field: 'venue', operator: 'is-set' },
      false
    ],
    [
      'a class instance with no own keys is set',
      { venue: new (class Venue {})() },
      { field: 'venue', operator: 'is-set' },
      true
    ]
  ])('%s', (_, row, filter, expected) => {
    const resolved = resolveRecordQuery(
      { search: '', filters: [filter], sort: [] },
      eventFields,
      { now: new Date('2026-10-03T02:00:00Z'), timeZone: SYDNEY }
    )
    expect(matchesRecordQuery(row, resolved, eventFields)).toBe(expected)
  })

  it.each<[RecordFilter, boolean]>([
    [
      {
        field: 'created',
        operator: 'between',
        value: ['2026-10-04T02:00', '2026-10-04T02:59']
      },
      true
    ],
    [
      {
        field: 'created',
        operator: 'between',
        value: ['2026-10-04T03:15', '2026-10-04T03:45']
      },
      false
    ],
    [{ field: 'created', operator: 'after', value: '2026-10-04T03:15' }, false],
    [{ field: 'created', operator: 'before', value: '2026-10-04T03:15' }, true],
    [{ field: 'created', operator: 'on', value: '2026-10-04T02:30' }, true],
    // Every skipped time reads as the jump, so they are all the same moment.
    [{ field: 'created', operator: 'after', value: '2026-10-04T02:10' }, false]
  ])(
    'reads a row time skipped by daylight saving as the jump, like a filter: %j',
    (filter, expected) => {
      const resolved = resolveRecordQuery(
        { search: '', filters: [filter], sort: [] },
        eventFields,
        { now: new Date('2026-10-03T02:00:00Z'), timeZone: SYDNEY }
      )
      expect(
        matchesRecordQuery(
          { created: '2026-10-04T02:30' },
          resolved,
          eventFields
        )
      ).toBe(expected)
    }
  )

  it('reads a repeated row time as its first pass, after an earlier first pass', () => {
    const resolved = resolveRecordQuery(
      {
        search: '',
        filters: [
          { field: 'created', operator: 'after', value: '2026-04-05T02:15' }
        ],
        sort: []
      },
      eventFields,
      { now: new Date('2026-10-03T02:00:00Z'), timeZone: SYDNEY }
    )
    expect(
      matchesRecordQuery({ created: '2026-04-05T02:30' }, resolved, eventFields)
    ).toBe(true)
  })

  it.each(['2026-10-03T24:00', '2026-10-03T10:00:00.123456'])(
    'treats an impossible venue time %s as no date',
    (starts) => {
      const resolved = resolveRecordQuery(
        {
          search: '',
          filters: [{ field: 'starts', operator: 'on', value: '2026-10-03' }],
          sort: []
        },
        eventFields,
        { now: new Date('2026-10-03T02:00:00Z'), timeZone: SYDNEY }
      )
      expect(
        matchesRecordQuery({ starts, zone: SYDNEY }, resolved, eventFields)
      ).toBe(false)
    }
  )

  it.each<[RecordFilter, boolean]>([
    [{ field: 'created', operator: 'before', value: '2026-10-03T10:00' }, true],
    [{ field: 'created', operator: 'on', value: '2026-10-03T10:00' }, false],
    [{ field: 'created', operator: 'after', value: '2026-10-03T10:00' }, false],
    [{ field: 'created', operator: 'on', value: '2026-10-03' }, true]
  ])(
    'reads a plain date row on a timestamp as the start of its day: %j',
    (filter, expected) => {
      const resolved = resolveRecordQuery(
        { search: '', filters: [filter], sort: [] },
        eventFields,
        { now: new Date('2026-10-03T02:00:00Z'), timeZone: SYDNEY }
      )
      expect(
        matchesRecordQuery({ created: '2026-10-03' }, resolved, eventFields)
      ).toBe(expected)
    }
  )

  it.each<[string, string, string, [string, string]]>([
    [
      'Australia/Sydney',
      'a gap end',
      '2026-10-04T02:30',
      ['2026-10-04T01:00', '2026-10-04T02:30']
    ],
    [
      'Australia/Lord_Howe',
      'a half-hour gap end',
      '2026-10-04T02:15',
      ['2026-10-04T01:00', '2026-10-04T02:15']
    ],
    [
      'America/Santiago',
      'a midnight gap end',
      '2026-09-06T00:00',
      ['2026-09-05T22:00', '2026-09-06T00:00']
    ]
  ])('includes a row on %s (%s) in between', (timeZone, _, created, value) => {
    const resolved = resolveRecordQuery(
      {
        search: '',
        filters: [{ field: 'created', operator: 'between', value }],
        sort: []
      },
      eventFields,
      { now: new Date('2026-10-03T02:00:00Z'), timeZone }
    )
    expect(matchesRecordQuery({ created }, resolved, eventFields)).toBe(true)
  })

  it.each<[string, string, string]>([
    ['Australia/Lord_Howe', '2026-04-05T01:45', '2026-04-05T01:30'],
    ['America/Santiago', '2026-04-04T23:50', '2026-04-04T23:00']
  ])('keeps on a repeated time to that time in %s', (timeZone, created, on) => {
    const resolved = resolveRecordQuery(
      {
        search: '',
        filters: [{ field: 'created', operator: 'on', value: on }],
        sort: []
      },
      eventFields,
      { now: new Date('2026-10-03T02:00:00Z'), timeZone }
    )
    expect(matchesRecordQuery({ created }, resolved, eventFields)).toBe(false)
  })

  it('skips a number outside the dates JavaScript can hold, without throwing', () => {
    const resolved = resolveRecordQuery(
      {
        search: '',
        filters: [{ field: 'starts', operator: 'on', value: '2026-10-03' }],
        sort: []
      },
      eventFields,
      { now: new Date('2026-10-03T02:00:00Z'), timeZone: SYDNEY }
    )
    expect(
      matchesRecordQuery({ starts: 1e20, zone: SYDNEY }, resolved, eventFields)
    ).toBe(false)
  })

  it('reads a venue time skipped with a whole day as the date it lands on', () => {
    // Samoa skipped 30 December 2011 when it crossed the date line.
    const on = (value: string) =>
      matchesRecordQuery(
        { starts: '2011-12-30T12:00', zone: 'Pacific/Apia' },
        resolveRecordQuery(
          {
            search: '',
            filters: [{ field: 'starts', operator: 'on', value }],
            sort: []
          },
          eventFields,
          { now: new Date('2026-10-03T02:00:00Z'), timeZone: SYDNEY }
        ),
        eventFields
      )
    expect(on('2011-12-31')).toBe(true)
    expect(on('2011-12-30')).toBe(false)
  })

  describe('event dates compare the venue-local date', () => {
    it.each<[string, RecordFilter, string[]]>([
      // Swan starts at 1:30am Sunday Sydney time, but it is a Saturday gig in Perth.
      [
        'on',
        { field: 'starts', operator: 'on', value: '2026-10-03' },
        ['velvet', 'swan', 'festival']
      ],
      [
        'on a festival day only',
        { field: 'starts', operator: 'on', value: '2026-10-05' },
        ['festival']
      ],
      [
        'before overlaps the start',
        { field: 'starts', operator: 'before', value: '2026-10-02' },
        ['festival']
      ],
      [
        'after overlaps the end',
        { field: 'starts', operator: 'after', value: '2026-10-04' },
        ['festival']
      ],
      [
        'after the festival ends',
        { field: 'starts', operator: 'after', value: '2026-10-05' },
        []
      ],
      [
        'today',
        { field: 'starts', operator: 'within', value: 'today' },
        ['velvet', 'swan', 'festival']
      ],
      [
        'this weekend',
        { field: 'starts', operator: 'within', value: 'this-weekend' },
        ['velvet', 'swan', 'festival']
      ],
      [
        'next week',
        { field: 'starts', operator: 'within', value: 'next-week' },
        ['festival']
      ],
      [
        'between',
        {
          field: 'starts',
          operator: 'between',
          value: ['2026-10-04', '2026-10-10']
        },
        ['festival']
      ]
    ])('%s', (_, filter, expected) => {
      expect(ids([filter])).toEqual(expected)
    })

    it('skips a row whose venue zone is not a real zone, without throwing', () => {
      const resolved = resolveRecordQuery(
        {
          search: '',
          filters: [{ field: 'starts', operator: 'on', value: '2026-10-03' }],
          sort: []
        },
        eventFields,
        { now: new Date('2026-10-03T02:00:00Z'), timeZone: SYDNEY }
      )
      const row = { starts: '2026-10-03T19:30:00+10:00', zone: 'Mars/Base' }
      expect(matchesRecordQuery(row, resolved, eventFields)).toBe(true)
      expect(
        matchesRecordQuery({ ...row, zone: 42 }, resolved, eventFields)
      ).toBe(true)
    })

    it('uses the stored local date when the row has one', () => {
      const resolved = resolveRecordQuery(
        {
          search: '',
          filters: [{ field: 'starts', operator: 'on', value: '2026-10-04' }],
          sort: []
        },
        eventFields,
        { now: new Date('2026-10-03T02:00:00Z'), timeZone: SYDNEY }
      )
      expect(
        matchesRecordQuery(
          { ...rows.velvet, startsLocal: '2026-10-04' },
          resolved,
          eventFields
        )
      ).toBe(true)
    })

    it('reads a time with no offset as the venue wall clock', () => {
      const row = { starts: '2026-10-03T23:30', zone: PERTH }
      const on = (value: string) =>
        matchesRecordQuery(
          row,
          resolveRecordQuery(
            {
              search: '',
              filters: [{ field: 'starts', operator: 'on', value }],
              sort: []
            },
            eventFields,
            { now: new Date('2026-10-03T02:00:00Z'), timeZone: SYDNEY }
          ),
          eventFields
        )
      expect(on('2026-10-03')).toBe(true)
      expect(on('2026-10-04')).toBe(false)
    })
  })

  describe('hour windows and open ranges compare instants', () => {
    it.each<[string, string, RecordFilter, string[]]>([
      // 6pm Saturday in Sydney: the Velvet Room show starts in 90 minutes.
      [
        'next 2 hours',
        '2026-10-03T08:00:00Z',
        {
          field: 'starts',
          operator: 'within',
          value: { direction: 'next', amount: 2, unit: 'hour' }
        },
        ['velvet', 'festival']
      ],
      [
        'upcoming keeps what has not finished',
        '2026-10-03T08:00:00Z',
        { field: 'starts', operator: 'within', value: 'upcoming' },
        ['velvet', 'swan', 'festival']
      ],
      [
        'past keeps what has started',
        '2026-10-03T08:00:00Z',
        { field: 'starts', operator: 'within', value: 'past' },
        ['festival']
      ],
      [
        'ongoing keeps what holds now',
        '2026-10-03T10:00:00Z',
        { field: 'starts', operator: 'within', value: 'ongoing' },
        ['festival']
      ]
    ])('%s', (_, now, filter, expected) => {
      expect(ids([filter], { now })).toEqual(expected)
    })
  })

  it('compares timestamps across the viewer day, in any stored form', () => {
    expect(
      ids([{ field: 'created', operator: 'on', value: '2026-09-01' }])
    ).toEqual(['velvet'])
    // 1_788_000_000_000 is 29 August 2026, 10:40am UTC.
    expect(
      ids([{ field: 'created', operator: 'on', value: '2026-08-29' }])
    ).toEqual(['swan'])
    expect(
      ids([{ field: 'created', operator: 'before', value: '2026-08-16' }])
    ).toEqual(['festival'])
  })

  it('compares a plain date as itself', () => {
    expect(
      ids([{ field: 'birthday', operator: 'on', value: '1990-10-03' }])
    ).toEqual(['tba'])
  })

  describe('search', () => {
    it.each<[string, string[]]>([
      ['neon', ['velvet']],
      ['  LATE   laughs ', ['swan']],
      ['harbour festival', ['festival']],
      ['nights laughs', []],
      // Venue is an option field: not searched unless marked searchable.
      ['velvet', []]
    ])('"%s"', (search, expected) => {
      expect(ids([], { search })).toEqual(expected)
    })

    it('reads option labels and lists on searchable fields', () => {
      const fields = eventFields.map((f) =>
        f.key === 'venue' || f.key === 'genres' ? { ...f, searchable: true } : f
      )
      const resolved = resolveRecordQuery(
        { search: 'velvet room jazz', filters: [], sort: [] },
        fields,
        { now: new Date(), timeZone: SYDNEY }
      )
      expect(
        all.filter((r) => matchesRecordQuery(r, resolved, fields))
      ).toEqual([rows.velvet])
    })
  })
})
