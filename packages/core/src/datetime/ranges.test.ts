import { describe, expect, it } from 'vitest'

import {
  type Comparison,
  type DateRangeValue,
  isBuiltInComparison,
  resolveComparison,
  resolveDateRange
} from './ranges'

const HOUR = 3_600_000
const at = (iso: string) => new Date(iso)

// Fri 2 Oct 2026, 10am in Sydney (AEST), 8am in Perth.
const FRIDAY = at('2026-10-02T00:00:00Z')
const SYDNEY = { now: FRIDAY, timeZone: 'Australia/Sydney' }

const dates = (start: string | null, end: string | null) => ({
  kind: 'dates' as const,
  start,
  end
})
const instants = (start: string | null, end: string | null) => ({
  kind: 'instants' as const,
  start: start === null ? null : Date.parse(start),
  end: end === null ? null : Date.parse(end)
})

describe('resolveDateRange: calendar ranges', () => {
  it.each<[DateRangeValue, string, string]>([
    ['today', '2026-10-02', '2026-10-02'],
    ['tomorrow', '2026-10-03', '2026-10-03'],
    ['yesterday', '2026-10-01', '2026-10-01'],
    ['this-week', '2026-09-28', '2026-10-04'],
    ['next-week', '2026-10-05', '2026-10-11'],
    ['last-week', '2026-09-21', '2026-09-27'],
    ['this-weekend', '2026-10-03', '2026-10-04'],
    ['this-month', '2026-10-01', '2026-10-31'],
    ['next-month', '2026-11-01', '2026-11-30'],
    ['last-month', '2026-09-01', '2026-09-30'],
    [{ direction: 'next', amount: 7, unit: 'day' }, '2026-10-02', '2026-10-08'],
    [{ direction: 'past', amount: 7, unit: 'day' }, '2026-09-26', '2026-10-02'],
    [
      { direction: 'next', amount: 2, unit: 'week' },
      '2026-10-02',
      '2026-10-15'
    ],
    [
      { direction: 'past', amount: 1, unit: 'week' },
      '2026-09-26',
      '2026-10-02'
    ],
    [
      { direction: 'next', amount: 1, unit: 'month' },
      '2026-10-02',
      '2026-11-01'
    ],
    [
      { direction: 'past', amount: 3, unit: 'month' },
      '2026-07-03',
      '2026-10-02'
    ],
    [{ period: 'day', offset: 0 }, '2026-10-02', '2026-10-02'],
    [{ period: 'day', offset: -1 }, '2026-10-01', '2026-10-01'],
    [{ period: 'week', offset: 0, toDate: true }, '2026-09-28', '2026-10-02'],
    [{ period: 'week', offset: 1 }, '2026-10-05', '2026-10-11'],
    [{ period: 'month', offset: 0, toDate: true }, '2026-10-01', '2026-10-02'],
    [{ period: 'month', offset: -1 }, '2026-09-01', '2026-09-30'],
    [{ period: 'month', offset: -1, toDate: true }, '2026-09-01', '2026-09-02'],
    [{ period: 'quarter', offset: 0 }, '2026-10-01', '2026-12-31'],
    [{ period: 'quarter', offset: -1 }, '2026-07-01', '2026-09-30'],
    [{ period: 'quarter', offset: -4 }, '2025-10-01', '2025-12-31'],
    [
      { period: 'quarter', offset: 0, toDate: true },
      '2026-10-01',
      '2026-10-02'
    ],
    [{ period: 'year', offset: 0 }, '2026-01-01', '2026-12-31'],
    [{ period: 'year', offset: -1, toDate: true }, '2025-01-01', '2025-10-02'],
    [{ period: 'year', offset: 0, fiscal: true }, '2026-07-01', '2027-06-30'],
    [{ period: 'year', offset: -1, fiscal: true }, '2025-07-01', '2026-06-30'],
    [
      { period: 'year', offset: 0, fiscal: true, toDate: true },
      '2026-07-01',
      '2026-10-02'
    ],
    [
      { period: 'quarter', offset: 0, fiscal: true },
      '2026-10-01',
      '2026-12-31'
    ],
    [{ start: '2026-10-01', end: '2026-10-14' }, '2026-10-01', '2026-10-14']
  ])('%j in Sydney', (value, start, end) => {
    expect(resolveDateRange(value, SYDNEY)).toEqual(dates(start, end))
  })

  it('honours weekStart for weeks but never for the weekend', () => {
    const sunday = { ...SYDNEY, weekStart: 7 }
    expect(resolveDateRange('this-week', sunday)).toEqual(
      dates('2026-09-27', '2026-10-03')
    )
    expect(resolveDateRange('this-weekend', sunday)).toEqual(
      dates('2026-10-03', '2026-10-04')
    )
  })

  it('aligns fiscal quarters to fiscalYearStart', () => {
    expect(
      resolveDateRange(
        { period: 'quarter', offset: 0, fiscal: true },
        { ...SYDNEY, fiscalYearStart: 2 }
      )
    ).toEqual(dates('2026-08-01', '2026-10-31'))
    expect(
      resolveDateRange(
        { period: 'year', offset: 0, fiscal: true },
        { ...SYDNEY, fiscalYearStart: 1 }
      )
    ).toEqual(dates('2026-01-01', '2026-12-31'))
  })

  it('rejects a fiscal year start outside 1 to 12', () => {
    expect(() =>
      resolveDateRange(
        { period: 'year', offset: 0, fiscal: true },
        { ...SYDNEY, fiscalYearStart: 13 }
      )
    ).toThrow(RangeError)
  })

  it('crosses the financial year at midnight in the given zone', () => {
    // 1:30am on 1 Jul in Sydney, still 11:30pm on 30 Jun in Perth.
    const now = at('2027-06-30T15:30:00Z')
    const fy: DateRangeValue = { period: 'year', offset: 0, fiscal: true }
    const quarter: DateRangeValue = { period: 'quarter', offset: 0 }
    const sydney = { now, timeZone: 'Australia/Sydney' }
    const perth = { now, timeZone: 'Australia/Perth' }
    expect(resolveDateRange(fy, sydney)).toEqual(
      dates('2027-07-01', '2028-06-30')
    )
    expect(resolveDateRange(fy, perth)).toEqual(
      dates('2026-07-01', '2027-06-30')
    )
    expect(resolveDateRange(quarter, sydney)).toEqual(
      dates('2027-07-01', '2027-09-30')
    )
    expect(resolveDateRange(quarter, perth)).toEqual(
      dates('2027-04-01', '2027-06-30')
    )
  })

  it('clamps a to-date end at a short month', () => {
    const now = at('2026-10-31T01:00:00Z')
    expect(
      resolveDateRange(
        { period: 'month', offset: -1, toDate: true },
        { now, timeZone: 'Australia/Sydney' }
      )
    ).toEqual(dates('2026-09-01', '2026-09-30'))
  })

  it('handles a leap year February', () => {
    const now = at('2028-02-15T01:00:00Z')
    const opts = { now, timeZone: 'Australia/Sydney' }
    expect(resolveDateRange('this-month', opts)).toEqual(
      dates('2028-02-01', '2028-02-29')
    )
    expect(
      resolveDateRange({ direction: 'past', amount: 1, unit: 'month' }, opts)
    ).toEqual(dates('2028-01-16', '2028-02-15'))
  })

  it('takes this-week from a Monday in the previous month', () => {
    const now = at('2026-10-01T02:00:00Z')
    expect(
      resolveDateRange('this-week', { now, timeZone: 'Australia/Perth' })
    ).toEqual(dates('2026-09-28', '2026-10-04'))
  })
})

describe('resolveDateRange: the zone decides the day', () => {
  // Late on Friday night in Sydney, 9:30pm in Perth.
  const LATE_FRIDAY = at('2026-10-02T13:30:00Z')
  // 1am on Monday in Sydney (AEDT), 10pm on Sunday in Perth.
  const EARLY_MONDAY = at('2026-10-04T14:00:00Z')

  it.each([
    [LATE_FRIDAY, 'Australia/Sydney', '2026-10-03', '2026-10-04'],
    [LATE_FRIDAY, 'Australia/Perth', '2026-10-03', '2026-10-04'],
    [EARLY_MONDAY, 'Australia/Sydney', '2026-10-10', '2026-10-11'],
    [EARLY_MONDAY, 'Australia/Perth', '2026-10-03', '2026-10-04'],
    [EARLY_MONDAY, 'Pacific/Auckland', '2026-10-10', '2026-10-11'],
    [EARLY_MONDAY, 'Australia/Lord_Howe', '2026-10-10', '2026-10-11']
  ])('this weekend at %s in %s', (now, timeZone, start, end) => {
    expect(resolveDateRange('this-weekend', { now, timeZone })).toEqual(
      dates(start, end)
    )
  })

  it('reads Saturday and Sunday as part of this weekend', () => {
    const saturday = at('2026-10-03T03:00:00Z')
    const sunday = at('2026-10-04T03:00:00Z')
    for (const now of [saturday, sunday]) {
      expect(
        resolveDateRange('this-weekend', {
          now,
          timeZone: 'Australia/Sydney'
        })
      ).toEqual(dates('2026-10-03', '2026-10-04'))
    }
  })

  it('reads today on the DST changeover day', () => {
    // 3:30am AEDT on Sun 4 Oct, the hour after the clocks jumped.
    const now = at('2026-10-03T16:30:00Z')
    for (const timeZone of ['Australia/Sydney', 'Australia/Lord_Howe']) {
      expect(resolveDateRange('today', { now, timeZone })).toEqual(
        dates('2026-10-04', '2026-10-04')
      )
    }
    expect(
      resolveDateRange('today', { now, timeZone: 'Australia/Perth' })
    ).toEqual(dates('2026-10-04', '2026-10-04'))
    expect(
      resolveDateRange('today', {
        now: at('2026-10-03T15:30:00Z'),
        timeZone: 'Australia/Perth'
      })
    ).toEqual(dates('2026-10-03', '2026-10-03'))
  })
})

describe('resolveDateRange: instants', () => {
  it.each<[DateRangeValue, string | null, string | null]>([
    [
      { direction: 'next', amount: 3, unit: 'hour' },
      '2026-10-02T00:00:00Z',
      '2026-10-02T03:00:00Z'
    ],
    [
      { direction: 'past', amount: 24, unit: 'hour' },
      '2026-10-01T00:00:00Z',
      '2026-10-02T00:00:00Z'
    ],
    ['upcoming', '2026-10-02T00:00:00Z', null],
    ['past', null, '2026-10-02T00:00:00Z'],
    ['ongoing', '2026-10-02T00:00:00Z', '2026-10-02T00:00:00Z']
  ])('%j', (value, start, end) => {
    expect(resolveDateRange(value, SYDNEY)).toEqual(instants(start, end))
  })

  it('counts elapsed hours across the DST jump', () => {
    // 1:30am AEST on Sun 4 Oct: three hours later the clock reads 5:30am.
    const now = at('2026-10-03T15:30:00Z')
    const range = resolveDateRange(
      { direction: 'next', amount: 3, unit: 'hour' },
      { now, timeZone: 'Australia/Sydney' }
    )
    expect(range.kind).toBe('instants')
    expect((range.end as number) - (range.start as number)).toBe(3 * HOUR)
  })

  it.each([
    ['Australia/Sydney', '2026-10-03T14:00:00Z', '2026-10-04T01:00:00Z'],
    ['Australia/Lord_Howe', '2026-10-03T13:30:00Z', '2026-10-04T01:00:00Z'],
    ['Pacific/Auckland', '2026-10-03T11:00:00Z', '2026-10-03T23:00:00Z'],
    ['Australia/Perth', '2026-10-03T16:00:00Z', '2026-10-04T04:00:00Z']
  ])(
    'reads a floating date-time on the DST day in %s',
    (timeZone, start, end) => {
      expect(
        resolveDateRange(
          { start: '2026-10-04T00:00', end: '2026-10-04T12:00' },
          { now: FRIDAY, timeZone }
        )
      ).toEqual(instants(start, end))
    }
  )

  it('reads the Lord Howe autumn changeover, a half hour back', () => {
    expect(
      resolveDateRange(
        { start: '2027-04-04T12:00', end: '2027-04-04' },
        { now: FRIDAY, timeZone: 'Australia/Lord_Howe' }
      )
    ).toEqual({
      kind: 'instants',
      start: Date.parse('2027-04-04T01:30:00Z'),
      end: Date.parse('2027-04-04T13:30:00Z') - 1
    })
  })

  it('keeps a year under 100 in its own century', () => {
    const range = resolveDateRange(
      { start: '0050-06-01T12:00', end: '0050-06-01T13:00' },
      { now: FRIDAY, timeZone: 'UTC' }
    )
    expect(new Date(range.start as number).getUTCFullYear()).toBe(50)
    expect(new Date(range.start as number).getUTCHours()).toBe(12)
  })

  it('honours an explicit offset', () => {
    expect(
      resolveDateRange(
        { start: '2026-10-04T00:00:00Z', end: '2026-10-04T12:00:00+10:00' },
        SYDNEY
      )
    ).toEqual(instants('2026-10-04T00:00:00Z', '2026-10-04T02:00:00Z'))
  })

  it('opens a plain date at its first instant and closes it at its last', () => {
    expect(
      resolveDateRange({ start: '2026-10-03', end: '2026-10-04T09:00' }, SYDNEY)
    ).toEqual(instants('2026-10-02T14:00:00Z', '2026-10-03T22:00:00Z'))
    const range = resolveDateRange(
      { start: '2026-10-03T18:00', end: '2026-10-04' },
      SYDNEY
    )
    expect(range.end).toBe(Date.parse('2026-10-04T13:00:00Z') - 1)
  })

  it('rejects an hour window past the end of time', () => {
    expect(() =>
      resolveDateRange(
        { direction: 'next', amount: Number.MAX_SAFE_INTEGER, unit: 'hour' },
        SYDNEY
      )
    ).toThrow(RangeError)
  })

  it('rejects a malformed or reversed range', () => {
    expect(() =>
      resolveDateRange({ start: '2026-10-14', end: '2026-10-01' }, SYDNEY)
    ).toThrow(RangeError)
    expect(() =>
      resolveDateRange({ start: '14/10/2026', end: '2026-10-20' }, SYDNEY)
    ).toThrow(RangeError)
    expect(() =>
      resolveDateRange({ direction: 'next', amount: 0, unit: 'day' }, SYDNEY)
    ).toThrow(RangeError)
  })
})

const available = (range: unknown) => ({ status: 'available', range })

describe('resolveComparison', () => {
  // INNO-1039: a calendar period compares with the period before it, so this
  // month compares with last month, not the 31 days before it.
  it.each<[DateRangeValue, string, string]>([
    [{ start: '2026-10-01', end: '2026-10-14' }, '2026-09-17', '2026-09-30'],
    [{ direction: 'past', amount: 7, unit: 'day' }, '2026-09-19', '2026-09-25'],
    ['this-month', '2026-09-01', '2026-09-30'],
    ['last-month', '2026-08-01', '2026-08-31'],
    ['next-month', '2026-10-01', '2026-10-31'],
    ['today', '2026-10-01', '2026-10-01'],
    ['yesterday', '2026-09-30', '2026-09-30'],
    ['this-week', '2026-09-21', '2026-09-27'],
    ['last-week', '2026-09-14', '2026-09-20'],
    ['this-weekend', '2026-09-26', '2026-09-27'],
    [{ period: 'month', offset: 0, toDate: true }, '2026-09-01', '2026-09-02'],
    [{ period: 'week', offset: 0, toDate: true }, '2026-09-21', '2026-09-25'],
    [{ period: 'quarter', offset: 0 }, '2026-07-01', '2026-09-30'],
    [
      { period: 'quarter', offset: 0, toDate: true },
      '2026-07-01',
      '2026-07-02'
    ],
    [{ period: 'year', offset: 0, fiscal: true }, '2025-07-01', '2026-06-30'],
    [
      { period: 'year', offset: 0, toDate: true, fiscal: true },
      '2025-07-01',
      '2025-10-02'
    ],
    [{ period: 'year', offset: -1 }, '2024-01-01', '2024-12-31']
  ])('previous period of %j', (value, start, end) => {
    expect(resolveComparison(value, 'previous-period', SYDNEY)).toEqual(
      available(dates(start, end))
    )
  })

  it.each<[string, string, string]>([
    // The whole of March compares with the whole of February.
    ['2027-03-31T01:00:00Z', '2027-02-01', '2027-02-28'],
    // March to the 30th has no 30 February, so all of February.
    ['2027-03-30T01:00:00Z', '2027-02-01', '2027-02-28'],
    ['2027-03-15T01:00:00Z', '2027-02-01', '2027-02-15'],
    // To date keeps to the same day, even on a month's last.
    ['2027-02-28T01:00:00Z', '2027-01-01', '2027-01-28']
  ])('month to date on %s against last month', (now, start, end) => {
    expect(
      resolveComparison(
        { period: 'month', offset: 0, toDate: true },
        'previous-period',
        { ...SYDNEY, now: at(now) }
      )
    ).toEqual(available(dates(start, end)))
  })

  it.each<[DateRangeValue, string, string]>([
    [{ start: '2026-10-01', end: '2026-10-14' }, '2025-10-01', '2025-10-14'],
    [{ start: '2028-02-01', end: '2028-02-29' }, '2027-02-01', '2027-02-28'],
    [{ start: '2028-02-29', end: '2028-02-29' }, '2027-02-28', '2027-02-28'],
    [{ period: 'year', offset: 0, fiscal: true }, '2025-07-01', '2026-06-30']
  ])('previous year of %j', (value, start, end) => {
    expect(resolveComparison(value, 'previous-year', SYDNEY)).toEqual(
      available(dates(start, end))
    )
  })

  it('aligns weekdays a year back when asked', () => {
    // Mon 5 to Sun 11 Oct 2026 against Mon 6 to Sun 12 Oct 2025.
    expect(
      resolveComparison('next-week', 'previous-year', {
        ...SYDNEY,
        alignWeekday: true
      })
    ).toEqual(available(dates('2025-10-06', '2025-10-12')))
  })

  it('has nothing to compare now against', () => {
    expect(resolveComparison('ongoing', 'previous-period', SYDNEY)).toEqual({
      status: 'unavailable',
      range: null
    })
  })

  it('rejects an offset no zone has', () => {
    expect(() =>
      resolveDateRange(
        { start: '2026-10-04T00:00+25:00', end: '2026-10-04T12:00Z' },
        SYDNEY
      )
    ).toThrow(RangeError)
  })

  it('rejects an out of range time even with an offset', () => {
    expect(() =>
      resolveDateRange(
        { start: '2026-10-04T00:00Z', end: '2026-10-04T24:00Z' },
        SYDNEY
      )
    ).toThrow(RangeError)
  })

  it('refuses an app’s own comparison rather than guess its dates', () => {
    expect(() =>
      resolveComparison('this-month', 'similar' as Comparison, SYDNEY)
    ).toThrow(RangeError)
  })

  it('takes a custom comparison as given', () => {
    expect(
      resolveComparison(
        'this-month',
        { start: '2026-09-01', end: '2026-09-30' },
        SYDNEY
      )
    ).toEqual(available(dates('2026-09-01', '2026-09-30')))
  })

  it('shifts an instant window back by its own length', () => {
    expect(
      resolveComparison(
        { direction: 'past', amount: 24, unit: 'hour' },
        'previous-period',
        SYDNEY
      )
    ).toEqual(
      available({
        kind: 'instants',
        start: Date.parse('2026-09-30T00:00:00Z') - 1,
        end: Date.parse('2026-10-01T00:00:00Z') - 1
      })
    )
  })

  it('keeps the wall clock for a previous year of instants', () => {
    // 7pm AEDT on 4 Jan 2027 was 7pm AEDT on 4 Jan 2026 too.
    expect(
      resolveComparison(
        { start: '2027-01-04T19:00', end: '2027-01-04T22:00' },
        'previous-year',
        SYDNEY
      )
    ).toEqual(
      available(instants('2026-01-04T08:00:00Z', '2026-01-04T11:00:00Z'))
    )
  })

  it('keeps a previous-year window in order across a repeated hour', () => {
    // 2:50am AEDT to 2:10am AEST on Sun 4 Apr 2027: twenty minutes.
    const { range } = resolveComparison(
      { start: '2027-04-03T15:50:00Z', end: '2027-04-03T16:10:00Z' },
      'previous-year',
      SYDNEY
    )
    expect(range?.kind).toBe('instants')
    expect((range!.end as number) - (range!.start as number)).toBe(20 * 60_000)
  })

  it('keeps a previous-year window open across a skipped hour', () => {
    const { range } = resolveComparison(
      { start: '2027-10-04T02:30', end: '2027-10-04T03:30' },
      'previous-year',
      SYDNEY
    )
    expect((range!.end as number) - (range!.start as number)).toBe(3_600_000)
  })

  it('has nothing to compare an open-ended range against', () => {
    const none = { status: 'unavailable', range: null }
    expect(resolveComparison('upcoming', 'previous-period', SYDNEY)).toEqual(
      none
    )
    expect(resolveComparison('past', 'previous-year', SYDNEY)).toEqual(none)
  })
})

describe('resolveComparison: history', () => {
  it.each<[string, Comparison, string, string, string]>([
    ['2026-09-01', 'previous-period', 'available', '2026-09-01', '2026-09-30'],
    ['2026-09-10', 'previous-period', 'partial', '2026-09-01', '2026-09-30'],
    ['2026-09-30', 'previous-period', 'partial', '2026-09-01', '2026-09-30'],
    [
      '2026-10-01',
      'previous-period',
      'unavailable',
      '2026-09-01',
      '2026-09-30'
    ],
    ['2026-01-15', 'previous-year', 'unavailable', '2025-10-01', '2025-10-31']
  ])(
    'with data from %s, this month against %s is %s',
    (dataStart, comparison, status, start, end) => {
      expect(
        resolveComparison('this-month', comparison, { ...SYDNEY, dataStart })
      ).toEqual({ status, range: dates(start, end) })
    }
  )

  it('measures an instant window against the start of the first day', () => {
    // The last 24 hours before these 24 ended at 10am on 1 Oct in Sydney.
    const past24 = { direction: 'past', amount: 24, unit: 'hour' } as const
    expect(
      resolveComparison(past24, 'previous-period', {
        ...SYDNEY,
        dataStart: '2026-10-01'
      }).status
    ).toBe('partial')
    expect(
      resolveComparison(past24, 'previous-period', {
        ...SYDNEY,
        dataStart: '2026-10-02'
      }).status
    ).toBe('unavailable')
  })

  it('checks a custom comparison against the data too', () => {
    expect(
      resolveComparison(
        'last-month',
        { start: '2026-09-25', end: '2026-10-10' },
        { ...SYDNEY, dataStart: '2026-01-01', dataEnd: '2026-10-02' }
      ).status
    ).toBe('partial')
    expect(
      resolveComparison(
        'last-month',
        { start: '2026-10-05', end: '2026-10-10' },
        { ...SYDNEY, dataEnd: '2026-10-02' }
      ).status
    ).toBe('unavailable')
  })

  it('has nothing to compare an open-ended range with, custom dates included', () => {
    expect(
      resolveComparison(
        'upcoming',
        { start: '2026-01-01', end: '2026-01-31' },
        SYDNEY
      )
    ).toEqual({ status: 'unavailable', range: null })
  })

  it('stays open-ended whatever the data', () => {
    expect(
      resolveComparison('upcoming', 'previous-period', {
        ...SYDNEY,
        dataStart: '2020-01-01'
      })
    ).toEqual({ status: 'unavailable', range: null })
  })

  it('rejects data dates that are not plain dates or run backwards', () => {
    expect(() =>
      resolveComparison('this-month', 'previous-period', {
        ...SYDNEY,
        dataStart: '1/9/2026'
      })
    ).toThrow(RangeError)
    expect(() =>
      resolveComparison('this-month', 'previous-period', {
        ...SYDNEY,
        dataStart: '2026-10-02',
        dataEnd: '2026-10-01'
      })
    ).toThrow(RangeError)
  })
})

describe('resolveComparison: a period in progress', () => {
  const inProgress = { ...SYDNEY, dataEnd: '2026-10-02' }

  it.each<[DateRangeValue, Comparison, string, string]>([
    // Like for like: the first two days of each month.
    ['this-month', 'previous-period', '2026-09-01', '2026-09-02'],
    ['this-month', 'previous-year', '2025-10-01', '2025-10-02'],
    [
      { period: 'quarter', offset: 0 },
      'previous-period',
      '2026-07-01',
      '2026-07-02'
    ],
    ['this-week', 'previous-period', '2026-09-21', '2026-09-25'],
    // Literal ranges keep their elapsed length: 1 to 2 Oct is two days.
    [
      { start: '2026-10-01', end: '2026-10-14' },
      'previous-period',
      '2026-09-29',
      '2026-09-30'
    ],
    // Already over, so nothing is cut.
    ['last-month', 'previous-period', '2026-08-01', '2026-08-31']
  ])('%j against %s', (value, comparison, start, end) => {
    expect(resolveComparison(value, comparison, inProgress)).toEqual(
      available(dates(start, end))
    )
  })

  it.each<[DateRangeValue, string]>([
    // Data loaded overnight lags a day: on the 1st, this month has none yet.
    ['this-month', '2026-09-30'],
    ['today', '2026-10-01']
  ])(
    'has nothing to compare when %j starts after the data ends',
    (value, dataEnd) => {
      expect(
        resolveComparison(value, 'previous-period', { ...SYDNEY, dataEnd })
          .status
      ).toBe('unavailable')
    }
  )

  it('cuts at a data end that lags today', () => {
    expect(
      resolveComparison('this-month', 'previous-period', {
        ...SYDNEY,
        dataEnd: '2026-10-01'
      })
    ).toEqual(available(dates('2026-09-01', '2026-09-01')))
  })

  it('cuts an instant window at the end of the last day', () => {
    const range = { start: '2026-10-02T00:00', end: '2026-10-03T23:59' }
    const { range: compared } = resolveComparison(
      range,
      'previous-period',
      inProgress
    )
    // Midnight to midnight on 2 Oct against the day before, in Sydney.
    expect(compared).toEqual({
      kind: 'instants',
      start: Date.parse('2026-09-30T14:00:00Z'),
      end: Date.parse('2026-10-01T14:00:00Z') - 1
    })
  })
})

describe('isBuiltInComparison', () => {
  it.each<[Comparison<string>, boolean]>([
    ['previous-period', true],
    ['previous-year', true],
    [{ start: '2026-09-01', end: '2026-09-30' }, true],
    ['similar', false],
    ['', false]
  ])('%j is built in: %s', (comparison, expected) => {
    expect(isBuiltInComparison(comparison)).toBe(expected)
  })
})
