import { describe, expect, it } from 'vitest'

import { resolveRecordQuery } from './resolve'
import { eventFields } from './testFields'
import type { RecordFilter } from './types'

const at = (iso: string) => new Date(iso)
const ms = (iso: string) => Date.parse(iso)

function resolveOne(filter: RecordFilter, now: string, timeZone: string) {
  return resolveRecordQuery(
    { search: '', filters: [filter], sort: [] },
    eventFields,
    { now: at(now), timeZone }
  ).filters[0]
}

describe('resolveRecordQuery', () => {
  it('keeps search, sort, the viewer zone and non-date filters as they are', () => {
    const query = {
      search: ' neon ',
      filters: [
        { field: 'venue', operator: 'is', values: ['velvet-room'] },
        { field: 'capacity', operator: 'between', value: [1, 9] }
      ] satisfies RecordFilter[],
      sort: [{ field: 'starts', direction: 'descending' as const }]
    }
    expect(
      resolveRecordQuery(query, eventFields, {
        now: at('2026-10-03T00:00:00Z'),
        timeZone: 'Australia/Sydney'
      })
    ).toEqual({ ...query, timeZone: 'Australia/Sydney' })
  })

  describe.each([
    // Late on a Friday, "this weekend" is the coming Saturday and Sunday.
    ['Australia/Perth', '2026-10-02T15:30:00Z', '2026-10-03', '2026-10-04'],
    ['Australia/Sydney', '2026-10-02T13:30:00Z', '2026-10-03', '2026-10-04'],
    // Sunday evening in Perth is already Monday in Auckland.
    ['Australia/Perth', '2026-10-04T11:30:00Z', '2026-10-03', '2026-10-04'],
    ['Pacific/Auckland', '2026-10-04T11:30:00Z', '2026-10-10', '2026-10-11']
  ])('this weekend in %s at %s', (timeZone, now, start, end) => {
    it('is venue-local dates on an event moment', () => {
      expect(
        resolveOne(
          { field: 'starts', operator: 'within', value: 'this-weekend' },
          now,
          timeZone
        )
      ).toEqual({
        field: 'starts',
        operator: 'overlaps',
        range: { kind: 'dates', start, end }
      })
    })

    it('is plain dates on a date moment', () => {
      expect(
        resolveOne(
          { field: 'birthday', operator: 'within', value: 'this-weekend' },
          now,
          timeZone
        )
      ).toMatchObject({ range: { kind: 'dates', start, end } })
    })
  })

  it.each([
    // Perth has no daylight saving: a day is 24 hours.
    [
      'Australia/Perth',
      '2026-10-04T03:00:00Z',
      '2026-10-03T16:00:00Z',
      '2026-10-04T16:00:00Z'
    ],
    // Sydney springs forward on 4 October 2026: a 23-hour day.
    [
      'Australia/Sydney',
      '2026-10-04T03:00:00Z',
      '2026-10-03T14:00:00Z',
      '2026-10-04T13:00:00Z'
    ],
    // Lord Howe moves half an hour the same night: a 23.5-hour day.
    [
      'Australia/Lord_Howe',
      '2026-10-04T03:00:00Z',
      '2026-10-03T13:30:00Z',
      '2026-10-04T13:00:00Z'
    ],
    // Auckland sprang forward a week earlier, on 27 September.
    [
      'Pacific/Auckland',
      '2026-09-27T03:00:00Z',
      '2026-09-26T12:00:00Z',
      '2026-09-27T11:00:00Z'
    ]
  ])(
    'today on a timestamp in %s is the viewer day in instants',
    (timeZone, now, start, nextStart) => {
      expect(
        resolveOne(
          { field: 'created', operator: 'within', value: 'today' },
          now,
          timeZone
        )
      ).toEqual({
        field: 'created',
        operator: 'overlaps',
        range: { kind: 'instants', start: ms(start), end: ms(nextStart) - 1 }
      })
    }
  )

  it.each<[RecordFilter, unknown]>([
    [
      { field: 'starts', operator: 'on', value: '2026-10-03' },
      { kind: 'dates', start: '2026-10-03', end: '2026-10-03' }
    ],
    [
      { field: 'starts', operator: 'before', value: '2026-10-03' },
      { kind: 'dates', start: null, end: '2026-10-02' }
    ],
    [
      { field: 'starts', operator: 'after', value: '2026-10-03' },
      { kind: 'dates', start: '2026-10-04', end: null }
    ],
    [
      {
        field: 'onSale',
        operator: 'between',
        value: ['2026-10-01', '2026-10-07']
      },
      { kind: 'dates', start: '2026-10-01', end: '2026-10-07' }
    ],
    [
      {
        field: 'starts',
        operator: 'within',
        value: { direction: 'next', amount: 6, unit: 'hour' }
      },
      {
        kind: 'instants',
        start: ms('2026-10-03T02:00:00Z'),
        end: ms('2026-10-03T08:00:00Z')
      }
    ],
    [
      { field: 'starts', operator: 'within', value: 'upcoming' },
      { kind: 'instants', start: ms('2026-10-03T02:00:00Z'), end: null }
    ],
    [
      { field: 'starts', operator: 'within', value: 'ongoing' },
      {
        kind: 'instants',
        start: ms('2026-10-03T02:00:00Z'),
        end: ms('2026-10-03T02:00:00Z')
      }
    ],
    [
      { field: 'birthday', operator: 'within', value: 'upcoming' },
      { kind: 'dates', start: '2026-10-03', end: null }
    ],
    [
      { field: 'birthday', operator: 'within', value: 'past' },
      { kind: 'dates', start: null, end: '2026-10-02' }
    ],
    [
      { field: 'birthday', operator: 'within', value: 'ongoing' },
      { kind: 'dates', start: '2026-10-03', end: '2026-10-03' }
    ],
    [
      {
        field: 'created',
        operator: 'after',
        value: '2026-10-03T09:30:00+10:00'
      },
      { kind: 'instants', start: ms('2026-10-02T23:30:00Z') + 1, end: null }
    ],
    [
      { field: 'created', operator: 'before', value: '2026-10-03' },
      { kind: 'instants', start: null, end: ms('2026-10-02T14:00:00Z') - 1 }
    ],
    [
      {
        field: 'created',
        operator: 'between',
        value: ['2026-10-03T09:00', '2026-10-03T17:00']
      },
      {
        kind: 'instants',
        start: ms('2026-10-02T23:00:00Z'),
        end: ms('2026-10-03T07:00:00Z')
      }
    ],
    [
      {
        field: 'created',
        operator: 'within',
        value: { period: 'month', offset: 0, toDate: true }
      },
      {
        kind: 'instants',
        start: ms('2026-09-30T14:00:00Z'),
        end: ms('2026-10-03T14:00:00Z') - 1
      }
    ]
  ])('resolves %j in Sydney', (filter, range) => {
    expect(
      resolveOne(filter, '2026-10-03T02:00:00Z', 'Australia/Sydney')
    ).toEqual({ field: filter.field, operator: 'overlaps', range })
  })

  it('throws on an unknown field', () => {
    expect(() =>
      resolveOne(
        { field: 'nope', operator: 'is-set' },
        '2026-10-03T02:00:00Z',
        'Australia/Sydney'
      )
    ).toThrow('Unknown field "nope"')
  })

  it.each<[RecordFilter]>([
    [
      {
        field: 'birthday',
        operator: 'within',
        value: { direction: 'past', amount: 3, unit: 'hour' }
      }
    ],
    [
      {
        field: 'birthday',
        operator: 'between',
        value: ['2026-10-01T00:00', '2026-10-03T12:00']
      }
    ]
  ])('refuses times on a plain date field, even unvalidated: %j', (filter) => {
    expect(() =>
      resolveOne(filter, '2026-10-03T02:00:00Z', 'Australia/Sydney')
    ).toThrow('"Birthday" holds plain dates')
  })

  it('throws on an unknown sort field', () => {
    expect(() =>
      resolveRecordQuery(
        {
          search: '',
          filters: [],
          sort: [{ field: 'nope', direction: 'ascending' }]
        },
        eventFields,
        { now: new Date(), timeZone: 'Australia/Sydney' }
      )
    ).toThrow('Unknown field "nope"')
  })
})
