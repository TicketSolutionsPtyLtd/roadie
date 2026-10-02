import { describe, expect, it } from 'vitest'

import { describeComparison, describeDateRange } from './describe'
import { type DateRangeValue } from './ranges'

// Fri 2 Oct 2026, 10am in Sydney.
const SYDNEY = {
  now: new Date('2026-10-02T00:00:00Z'),
  timeZone: 'Australia/Sydney'
}

describe('describeDateRange', () => {
  it.each<[DateRangeValue, string, string]>([
    ['today', 'Today', '2 Oct 2026'],
    ['tomorrow', 'Tomorrow', '3 Oct 2026'],
    ['yesterday', 'Yesterday', '1 Oct 2026'],
    ['this-week', 'This week', '28 Sept to 4 Oct 2026'],
    ['next-week', 'Next week', '5 to 11 Oct 2026'],
    ['last-week', 'Last week', '21 to 27 Sept 2026'],
    ['this-weekend', 'This weekend', '3 to 4 Oct 2026'],
    ['this-month', 'This month', '1 to 31 Oct 2026'],
    ['next-month', 'Next month', '1 to 30 Nov 2026'],
    ['last-month', 'Last month', '1 to 30 Sept 2026'],
    [
      { direction: 'next', amount: 7, unit: 'day' },
      'Next 7 days',
      '2 to 8 Oct 2026'
    ],
    [
      { direction: 'past', amount: 30, unit: 'day' },
      'Last 30 days',
      '3 Sept to 2 Oct 2026'
    ],
    [
      { direction: 'next', amount: 1, unit: 'week' },
      'Next 1 week',
      '2 to 8 Oct 2026'
    ],
    [
      { direction: 'past', amount: 3, unit: 'month' },
      'Last 3 months',
      '3 Jul to 2 Oct 2026'
    ],
    [
      { direction: 'next', amount: 3, unit: 'hour' },
      'Next 3 hours',
      '2 Oct 2026, 10:00am to 1:00pm'
    ],
    [
      { period: 'month', offset: 0, toDate: true },
      'Month to date',
      '1 to 2 Oct 2026'
    ],
    [
      { period: 'month', offset: -1, toDate: true },
      'Last month to date',
      '1 to 2 Sept 2026'
    ],
    [
      { period: 'week', offset: 0, toDate: true },
      'Week to date',
      '28 Sept to 2 Oct 2026'
    ],
    [{ period: 'day', offset: -1 }, 'Yesterday', '1 Oct 2026'],
    [{ period: 'quarter', offset: 0 }, 'This quarter', '1 Oct to 31 Dec 2026'],
    [
      { period: 'quarter', offset: -1 },
      'Last quarter',
      '1 Jul to 30 Sept 2026'
    ],
    [
      { period: 'quarter', offset: 0, toDate: true },
      'Quarter to date',
      '1 to 2 Oct 2026'
    ],
    [{ period: 'year', offset: 0 }, 'This year', '1 Jan to 31 Dec 2026'],
    [
      { period: 'year', offset: 0, toDate: true },
      'Year to date',
      '1 Jan to 2 Oct 2026'
    ],
    [
      { period: 'year', offset: 0, fiscal: true },
      'This financial year',
      '1 Jul 2026 to 30 Jun 2027'
    ],
    [
      { period: 'year', offset: -1, fiscal: true },
      'Last financial year',
      '1 Jul 2025 to 30 Jun 2026'
    ],
    [
      { period: 'year', offset: 0, fiscal: true, toDate: true },
      'Financial year to date',
      '1 Jul to 2 Oct 2026'
    ],
    [
      { period: 'quarter', offset: 1, fiscal: true },
      'Next financial quarter',
      '1 Jan to 31 Mar 2027'
    ],
    // Further than one period away, the dates say it better than words.
    [{ period: 'month', offset: -3 }, '1 to 31 Jul 2026', '1 to 31 Jul 2026'],
    ['upcoming', 'Upcoming', 'From 2 Oct 2026, 10:00am'],
    ['past', 'Past', 'Until 2 Oct 2026, 10:00am'],
    ['ongoing', 'Happening now', '2 Oct 2026, 10:00am'],
    [
      { start: '2026-10-01', end: '2026-10-14' },
      '1 to 14 Oct 2026',
      '1 to 14 Oct 2026'
    ],
    [
      { start: '2026-12-30', end: '2027-01-02' },
      '30 Dec 2026 to 2 Jan 2027',
      '30 Dec 2026 to 2 Jan 2027'
    ],
    [
      { start: '2026-10-04T18:00', end: '2026-10-04T23:00' },
      '4 Oct 2026, 6:00pm to 11:00pm',
      '4 Oct 2026, 6:00pm to 11:00pm'
    ]
  ])('%j', (value, label, detail) => {
    expect(describeDateRange(value, SYDNEY)).toEqual({ label, detail })
  })

  it('never shifts a plain date into another zone', () => {
    for (const timeZone of [
      'Pacific/Auckland',
      'Australia/Perth',
      'America/Los_Angeles'
    ]) {
      expect(
        describeDateRange(
          { start: '2026-10-01', end: '2026-10-01' },
          { ...SYDNEY, timeZone }
        ).detail
      ).toBe('1 Oct 2026')
    }
  })
})

describe('describeComparison', () => {
  it.each([
    ['previous-period' as const, 'vs previous period'],
    ['previous-year' as const, 'vs previous year'],
    [{ start: '2026-09-01', end: '2026-09-30' }, 'vs 1 to 30 Sept 2026']
  ])('%j', (comparison, expected) => {
    expect(describeComparison(comparison)).toBe(expected)
  })
})
