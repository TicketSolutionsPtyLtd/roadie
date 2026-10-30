import { describe, expect, it } from 'vitest'

import { addDays, dayNumber } from '../datetime/plainDate'
import { type AlignComparisonOptions, alignComparison } from './comparison'

const timeZone = 'Australia/Melbourne'
const now = new Date(Date.UTC(2026, 10, 15))

const daysFrom = (start: string, count: number, value = (i: number) => i + 1) =>
  Array.from({ length: count }, (_, i) => ({
    day: addDays(start, i),
    sold: value(i)
  }))

const aligned = (
  rows: Record<string, unknown>[],
  previous: Record<string, unknown>[],
  options: Partial<AlignComparisonOptions> &
    Pick<AlignComparisonOptions, 'period'>
) =>
  alignComparison(rows as never, previous as never, {
    now,
    timeZone,
    x: 'day',
    y: 'sold',
    as: 'lastPeriod',
    ...options
  }).map((row) => [row.day, row.lastPeriod])

const dayCount = (start: string, end: string) =>
  dayNumber(end) - dayNumber(start) + 1

const week = { start: '2026-10-08', end: '2026-10-14' }

describe('alignComparison', () => {
  it.each([
    [
      'previous period',
      { range: week, compare: 'previous-period' as const },
      {},
      '2026-10-01'
    ],
    [
      'previous year, same dates',
      { range: week, compare: 'previous-year' as const },
      {},
      '2025-10-08'
    ],
    [
      'previous year, same weekday',
      { range: week, compare: 'previous-year' as const },
      { alignWeekday: true },
      '2025-10-09'
    ]
  ])(
    'lines %s up day by day from each start',
    (_, period, extra, comparisonStart) => {
      const previous = daysFrom(comparisonStart, 7, (i) => 100 + i)
      expect(
        aligned(daysFrom(week.start, 7), previous, { period, ...extra })
      ).toEqual(daysFrom(week.start, 7).map((r, i) => [r.day, 100 + i]))
    }
  )

  it('leaves the days a shorter month lacks without a value', () => {
    const october = daysFrom('2026-10-01', 31)
    const september = daysFrom('2026-09-01', 30, (i) => 100 + i)
    const rows = aligned(october, september, {
      period: {
        range: { period: 'month', offset: -1 },
        compare: 'previous-period'
      }
    })
    expect(rows[0]).toEqual(['2026-10-01', 100])
    expect(rows[29]).toEqual(['2026-10-30', 129])
    expect(rows[30]).toEqual(['2026-10-31', null])
  })

  it('gives no value before the data starts, for partial history', () => {
    const rows = aligned(
      daysFrom(week.start, 7),
      daysFrom('2026-10-01', 7, () => 0),
      {
        period: { range: week, compare: 'previous-period' },
        dataStart: '2026-10-04'
      }
    )
    expect(rows.map(([, value]) => value)).toEqual([
      null,
      null,
      null,
      0,
      0,
      0,
      0
    ])
  })

  it.each([
    [
      'unavailable history',
      { range: week, compare: 'previous-period' as const },
      { dataStart: '2026-10-08' }
    ],
    [
      "a period the data hasn't reached",
      { range: week, compare: 'previous-period' as const },
      { dataEnd: '2026-10-07' }
    ],
    ['no comparison', { range: week }, {}],
    ["an app's own comparison", { range: week, compare: 'similar' }, {}]
  ])('gives every row an empty comparison for %s', (_, period, extra) => {
    const rows = aligned(daysFrom(week.start, 3), daysFrom('2026-10-01', 7), {
      period,
      ...extra
    })
    expect(rows.map(([, value]) => value)).toEqual([null, null, null])
  })

  it('matches times of day on hourly rows', () => {
    const hours = (day: string, values: number[]) =>
      values.map((sold, i) => ({ day: `${day}T${10 + i}:00`, sold }))
    expect(
      aligned(hours('2026-10-08', [1, 2]), hours('2026-10-01', [5, 6]), {
        period: { range: week, compare: 'previous-period' }
      })
    ).toEqual([
      ['2026-10-08T10:00', 5],
      ['2026-10-08T11:00', 6]
    ])
  })

  it('keeps every field of this period and leaves the rows given alone', () => {
    const rows = [{ day: '2026-10-08', sold: 3, channel: 'Email' }]
    const result = alignComparison(rows, [{ day: '2026-10-01', sold: 2 }], {
      now,
      timeZone,
      period: { range: week, compare: 'previous-period' },
      x: 'day',
      y: 'sold',
      as: 'lastPeriod'
    })
    expect(result).toEqual([{ ...rows[0], lastPeriod: 2 }])
    expect(rows[0]).not.toHaveProperty('lastPeriod')
  })

  it('skips rows outside the period and keeps their place', () => {
    expect(
      aligned(
        [{ day: '2026-09-30', sold: 1 }, ...daysFrom(week.start, 1)],
        daysFrom('2026-09-23', 14),
        { period: { range: week, compare: 'previous-period' } }
      )
    ).toEqual([
      ['2026-09-30', null],
      ['2026-10-08', 9]
    ])
  })

  it.each([
    [
      'a year after a leap year',
      { start: '2025-02-27', end: '2025-03-02' },
      [
        ['2025-02-27', '2024-02-27'],
        ['2025-02-28', '2024-02-28'],
        ['2025-03-01', '2024-03-01'],
        ['2025-03-02', '2024-03-02']
      ]
    ],
    [
      'a leap year',
      { start: '2028-02-28', end: '2028-03-01' },
      [
        ['2028-02-28', '2027-02-28'],
        ['2028-02-29', null],
        ['2028-03-01', '2027-03-01']
      ]
    ]
  ])('keeps the same dates last year in %s', (_, range, expected) => {
    const lastYear = (start: string, end: string) =>
      Array.from({ length: dayCount(start, end) }, (_, i) => ({
        day: addDays(start, i),
        sold: addDays(start, i)
      }))
    const rows = expected.map(([day]) => ({ day: day!, sold: 0 }))
    expect(
      aligned(rows, lastYear(addDays(range.start, -400), range.end), {
        period: { range, compare: 'previous-year' }
      })
    ).toEqual(expected)
  })

  it.each([
    ['an offset that changes with daylight saving', '+11:00', '+10:00'],
    ['UTC written as Z', 'Z', 'Z']
  ])('ignores %s, as charts do', (_, now, then) => {
    expect(
      aligned(
        [{ day: `2026-10-08T10:00${now}`, sold: 1 }],
        [{ day: `2026-10-01T10:00${then}`, sold: 5 }],
        { period: { range: week, compare: 'previous-period' } }
      )
    ).toEqual([[`2026-10-08T10:00${now}`, 5]])
  })

  it('matches times written in different forms', () => {
    expect(
      aligned(
        [
          { day: '2026-10-08 10:00', sold: 1 },
          { day: Date.UTC(2026, 9, 8, 11), sold: 2 }
        ],
        [
          { day: '2026-10-01T10:00:00.000', sold: 5 },
          { day: '2026-10-01T11:00', sold: 6 }
        ],
        { period: { range: week, compare: 'previous-period' } }
      )
    ).toEqual([
      ['2026-10-08 10:00', 5],
      [Date.UTC(2026, 9, 8, 11), 6]
    ])
  })

  it('lines each series up with its own', () => {
    const result = alignComparison(
      [
        { day: '2026-10-08', channel: 'Email', sold: 3 },
        { day: '2026-10-08', channel: 'Web', sold: 5 }
      ],
      [
        { day: '2026-10-01', channel: 'Web', sold: 7 },
        { day: '2026-10-01', channel: 'Email', sold: 2 }
      ],
      {
        now,
        timeZone,
        period: { range: week, compare: 'previous-period' },
        x: 'day',
        y: 'sold',
        series: 'channel',
        as: 'lastPeriod'
      }
    )
    expect(result.map((row) => [row.channel, row.lastPeriod])).toEqual([
      ['Email', 2],
      ['Web', 7]
    ])
  })
})
