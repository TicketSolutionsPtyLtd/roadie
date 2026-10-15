import { describe, expect, it } from 'vitest'

import type { RelativeRange } from '../datetime/ranges'
import { describeRecordFilter, recordOperatorLabel } from './describe'
import { eventFields } from './testFields'
import type { RecordField, RecordFilter } from './types'

const options = {
  // Midday Saturday 3 October 2026 in Sydney.
  now: new Date('2026-10-03T02:00:00Z'),
  timeZone: 'Australia/Sydney'
}

const describeFilter = (filter: RecordFilter, fields = eventFields) =>
  describeRecordFilter(filter, fields, options)

describe('describeRecordFilter', () => {
  it.each<[RecordFilter, string, string]>([
    [
      { field: 'venue', operator: 'is', values: ['antler-kettle-hall'] },
      'Venue is Antler Kettle Hall',
      'Antler Kettle Hall'
    ],
    [
      {
        field: 'city',
        operator: 'is',
        values: ['melbourne', 'sydney']
      },
      'City is Melbourne or Sydney',
      'Melbourne or Sydney'
    ],
    [
      {
        field: 'city',
        operator: 'is-not',
        values: ['melbourne', 'sydney', 'perth', 'darwin']
      },
      'City is not Melbourne, Sydney or 2 more',
      'Melbourne, Sydney or 2 more'
    ],
    [
      { field: 'genres', operator: 'has-all', values: ['jazz', 'folk'] },
      'Genres has Jazz and Folk',
      'Jazz and Folk'
    ],
    [
      { field: 'status', operator: 'is', values: ['selling_fast'] },
      'Status is Selling fast',
      'Selling fast'
    ],
    [
      { field: 'name', operator: 'contains', value: 'disco' },
      'Name contains “disco”',
      '“disco”'
    ],
    [
      { field: 'name', operator: 'not-contains', value: 'disco' },
      'Name doesn’t contain “disco”',
      '“disco”'
    ],
    [
      { field: 'orderNumber', operator: 'is', values: ['OZ-12345'] },
      'Order number is OZ-12345',
      'OZ-12345'
    ],
    [
      { field: 'capacity', operator: 'gt', value: 1500 },
      'Capacity is more than 1,500',
      'more than 1,500'
    ],
    [
      { field: 'capacity', operator: 'lt', value: 10 },
      'Capacity is less than 10',
      'less than 10'
    ],
    [
      { field: 'capacity', operator: 'neq', value: 0 },
      'Capacity is not 0',
      'not 0'
    ],
    [
      { field: 'gross', operator: 'between', value: [100, 2500.5] },
      'Gross is $100 to $2,500.50',
      '$100 to $2,500.50'
    ],
    [{ field: 'gross', operator: 'eq', value: 50 }, 'Gross is $50', '$50'],
    [{ field: 'featured', operator: 'is-true' }, 'Featured is Yes', 'Yes'],
    [{ field: 'featured', operator: 'is-false' }, 'Featured is No', 'No'],
    [{ field: 'venue', operator: 'is-not-set' }, 'Venue is empty', 'empty'],
    [{ field: 'venue', operator: 'is-set' }, 'Venue is not empty', 'not empty'],
    [
      { field: 'starts', operator: 'on', value: '2026-11-14' },
      'Starts is on Sat 14 Nov',
      'Sat 14 Nov'
    ],
    [
      { field: 'starts', operator: 'before', value: '2027-03-01' },
      'Starts is before 1 Mar 2027',
      'Before 1 Mar 2027'
    ],
    [
      { field: 'starts', operator: 'after', value: '2026-12-01' },
      'Starts is after 1 Dec',
      'After 1 Dec'
    ],
    [
      {
        field: 'starts',
        operator: 'between',
        value: ['2026-10-09', '2026-10-11']
      },
      'Starts is 9 to 11 Oct',
      '9 to 11 Oct'
    ],
    [
      {
        field: 'created',
        operator: 'after',
        value: '2026-10-01T09:30:00+10:00'
      },
      'Created is after 1 Oct, 9:30am',
      'After 1 Oct, 9:30am'
    ]
  ])('describes %j', (filter, label, value) => {
    expect(describeFilter(filter)).toMatchObject({ label, value })
  })

  it('reads a one-day range as on that day', () => {
    expect(
      describeFilter({
        field: 'starts',
        operator: 'between',
        value: ['2026-10-22', '2026-10-22']
      })
    ).toEqual({ label: 'Starts is on Thu 22 Oct', value: 'Thu 22 Oct' })
  })

  it('keeps the dates a relative range stands for', () => {
    expect(
      describeFilter({
        field: 'starts',
        operator: 'within',
        value: 'this-weekend'
      })
    ).toEqual({
      label: 'Starts is this weekend',
      value: 'This weekend',
      detail: '3 to 4 Oct 2026'
    })
    expect(
      describeFilter({
        field: 'starts',
        operator: 'within',
        value: { direction: 'next', amount: 7, unit: 'day' }
      })
    ).toMatchObject({ label: 'Starts is in the next 7 days' })
  })

  it.each<[RelativeRange, string]>([
    ['today', 'Starts is today'],
    ['tomorrow', 'Starts is tomorrow'],
    ['yesterday', 'Starts is yesterday'],
    ['this-week', 'Starts is this week'],
    ['next-week', 'Starts is next week'],
    ['last-week', 'Starts is last week'],
    ['this-month', 'Starts is this month'],
    ['next-month', 'Starts is next month'],
    ['last-month', 'Starts is last month'],
    ['upcoming', 'Starts is upcoming'],
    ['past', 'Starts is in the past'],
    ['ongoing', 'Starts is happening now'],
    [
      { direction: 'past', amount: 30, unit: 'day' },
      'Starts is in the last 30 days'
    ],
    [
      { direction: 'next', amount: 1, unit: 'week' },
      'Starts is in the next week'
    ],
    [{ period: 'day', offset: 1 }, 'Starts is tomorrow'],
    [
      { period: 'month', offset: 0, toDate: true },
      'Starts is this month to date'
    ],
    [
      { period: 'quarter', offset: -1, fiscal: true },
      'Starts is last financial quarter'
    ],
    [{ period: 'week', offset: 2 }, 'Starts is 12 to 18 Oct 2026'],
    [{ period: 'day', offset: -2 }, 'Starts is 1 Oct 2026']
  ])('reads %j as a chip does', (value, label) => {
    expect(
      describeFilter({ field: 'starts', operator: 'within', value }).label
    ).toBe(label)
  })

  it.each<[string, RelativeRange, string]>([
    ['birthday', 'upcoming', 'From 3 Oct 2026'],
    ['birthday', 'past', 'Until 2 Oct 2026'],
    ['birthday', 'ongoing', '3 Oct 2026'],
    ['starts', 'upcoming', 'From 3 Oct 2026, unless already over'],
    ['starts', 'past', 'Until 3 Oct 2026, if already started'],
    ['onSale', 'upcoming', 'From 3 Oct 2026, unless already started'],
    ['onSale', 'past', 'Until 3 Oct 2026, if already started'],
    ['onSale', 'ongoing', '3 Oct 2026']
  ])('gives %s %s its days, with no clock', (field, value, detail) => {
    expect(describeFilter({ field, operator: 'within', value }).detail).toBe(
      detail
    )
  })

  it('gives a timestamp’s open range its time', () => {
    expect(
      describeFilter({
        field: 'created',
        operator: 'within',
        value: 'upcoming'
      }).detail
    ).toMatch(/^From 3 Oct 2026, 12:00/)
  })

  it('names every value in detail once some are left out', () => {
    expect(
      describeFilter({
        field: 'city',
        operator: 'is',
        values: ['melbourne', 'sydney', 'perth']
      }).detail
    ).toBe('Melbourne, Sydney or Perth')
    expect(
      describeFilter({ field: 'city', operator: 'is', values: ['perth'] })
    ).not.toHaveProperty('detail')
  })

  it('names a fixed currency other than dollars', () => {
    const fields: RecordField[] = [
      { key: 'gross', label: 'Gross', type: 'money', currency: 'NZD' }
    ]
    expect(
      describeFilter({ field: 'gross', operator: 'gt', value: 100 }, fields)
        .label
    ).toBe('Gross is more than NZD\u00a0100')
  })

  it('names an unknown field by its key and shows values as given', () => {
    expect(
      describeFilter({ field: 'promoter', operator: 'is', values: ['ab-1'] })
    ).toEqual({ label: 'promoter is ab-1', value: 'ab-1' })
  })

  it('reads child options as their path', () => {
    const fields: RecordField[] = [
      {
        key: 'session',
        label: 'Session',
        type: 'option',
        options: [
          { value: 'ochre-kite', label: 'Ochre Kite Weekender 2027' },
          { value: 'opening', label: 'Opening Night', parent: 'ochre-kite' }
        ]
      }
    ]
    expect(
      describeFilter(
        { field: 'session', operator: 'is', values: ['opening'] },
        fields
      ).label
    ).toBe('Session is Ochre Kite Weekender 2027 › Opening Night')
  })

  it('judges a plain date’s year by the viewer’s today', () => {
    expect(
      describeRecordFilter(
        { field: 'starts', operator: 'on', value: '2027-01-05' },
        eventFields,
        // 1 January 2027 in Sydney, still 2026 in UTC.
        { now: new Date('2026-12-31T14:00:00Z'), timeZone: 'Australia/Sydney' }
      ).value
    ).toBe('Tue 5 Jan')
  })

  it('stays readable for a value its field cannot read', () => {
    expect(
      describeFilter({
        field: 'starts',
        operator: 'on',
        value: 'next blue moon'
      }).label
    ).toBe('Starts is on next blue moon')
  })
})

describe('recordOperatorLabel', () => {
  it.each([
    ['is', 'is'],
    ['has-all', 'has all of'],
    ['not-contains', 'doesn’t contain'],
    ['gt', 'is more than'],
    ['between', 'is between'],
    ['within', 'is within'],
    ['on', 'is on'],
    ['is-true', 'is Yes'],
    ['is-not-set', 'is empty']
  ] as const)('names %s as "%s"', (operator, label) => {
    expect(recordOperatorLabel(operator)).toBe(label)
  })
})
