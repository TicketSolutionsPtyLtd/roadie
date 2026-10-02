import { describe, expect, it } from 'vitest'

import {
  addDays,
  addMonths,
  compareDates,
  dayOfWeek,
  monthGrid,
  plainDateOf,
  startOfWeek
} from './plainDate'

describe('plainDateOf', () => {
  // 14:30Z on 2 Oct 2026 is late evening in Perth and past midnight further east.
  it.each([
    ['Australia/Perth', '2026-10-02'],
    ['Australia/Sydney', '2026-10-03'],
    ['Australia/Lord_Howe', '2026-10-03'],
    ['Pacific/Auckland', '2026-10-03'],
    ['UTC', '2026-10-02']
  ])('reads the calendar date in %s', (timeZone, expected) => {
    expect(plainDateOf(new Date('2026-10-02T14:30:00Z'), timeZone)).toBe(
      expected
    )
  })

  it('takes a Temporal-shaped instant', () => {
    const epochMilliseconds = Date.parse('2026-10-02T14:30:00Z')
    expect(plainDateOf({ epochMilliseconds }, 'Australia/Sydney')).toBe(
      '2026-10-03'
    )
  })

  it('reads each side of the Sydney DST changeover', () => {
    expect(
      plainDateOf(new Date('2026-10-03T15:30:00Z'), 'Australia/Sydney')
    ).toBe('2026-10-04')
    expect(
      plainDateOf(new Date('2026-10-03T13:59:00Z'), 'Australia/Sydney')
    ).toBe('2026-10-03')
  })

  it('pads early years and throws past 9999', () => {
    expect(plainDateOf(new Date('0001-06-01T00:00:00Z'), 'UTC')).toBe(
      '0001-06-01'
    )
    const yearZero = new Date(Date.UTC(2000, 5, 1))
    yearZero.setUTCFullYear(0)
    expect(plainDateOf(yearZero, 'UTC')).toBe('0000-06-01')
    expect(() =>
      plainDateOf(new Date('+010000-06-01T00:00:00Z'), 'UTC')
    ).toThrow(RangeError)
  })

  it('throws on an invalid instant', () => {
    expect(() => plainDateOf(new Date('nope'), 'UTC')).toThrow(RangeError)
  })
})

describe('addDays', () => {
  it.each([
    ['2026-10-02', 1, '2026-10-03'],
    ['2026-10-31', 1, '2026-11-01'],
    ['2026-12-31', 1, '2027-01-01'],
    ['2026-03-01', -1, '2026-02-28'],
    ['2028-03-01', -1, '2028-02-29'],
    ['2026-10-02', 0, '2026-10-02'],
    ['2026-10-02', -365, '2025-10-02']
  ])('%s + %i days is %s', (date, days, expected) => {
    expect(addDays(date, days)).toBe(expected)
  })

  it('ignores the clock, so a DST changeover day is still one day', () => {
    expect(addDays('2026-10-03', 1)).toBe('2026-10-04')
    expect(addDays('2026-10-04', 1)).toBe('2026-10-05')
  })

  it('rejects anything that is not a real ISO date', () => {
    expect(() => addDays('2026-02-30', 1)).toThrow(RangeError)
    expect(() => addDays('2/10/2026', 1)).toThrow(RangeError)
    expect(() => addDays('2026-10-02T10:00', 1)).toThrow(RangeError)
  })
})

describe('addMonths', () => {
  it.each([
    ['2026-01-31', 1, '2026-02-28'],
    ['2028-01-31', 1, '2028-02-29'],
    ['2026-03-31', 1, '2026-04-30'],
    ['2026-03-31', -1, '2026-02-28'],
    ['2026-08-31', 1, '2026-09-30'],
    ['2026-10-15', 3, '2027-01-15'],
    ['2026-01-15', -1, '2025-12-15'],
    ['2028-02-29', 12, '2029-02-28'],
    ['2028-02-29', -12, '2027-02-28'],
    ['2028-02-29', 48, '2032-02-29']
  ])('%s + %i months is %s', (date, months, expected) => {
    expect(addMonths(date, months)).toBe(expected)
  })
})

describe('whole-number deltas', () => {
  it.each([1.5, Number.NaN, Infinity])('rejects %s', (delta) => {
    expect(() => addDays('2026-10-02', delta)).toThrow(RangeError)
    expect(() => addMonths('2026-10-02', delta)).toThrow(RangeError)
  })
})

describe('the supported range', () => {
  it('throws rather than leave four-digit years', () => {
    expect(() => addDays('9999-12-31', 1)).toThrow(RangeError)
    expect(() => addDays('0000-01-01', -1)).toThrow(RangeError)
    expect(() => addDays('2026-10-02', 1e12)).toThrow(RangeError)
    expect(() => addMonths('9999-12-31', 1)).toThrow(RangeError)
  })
})

describe('compareDates', () => {
  it('orders ISO dates', () => {
    expect(compareDates('2026-10-02', '2026-10-03')).toBe(-1)
    expect(compareDates('2026-10-03', '2026-10-02')).toBe(1)
    expect(compareDates('2026-10-02', '2026-10-02')).toBe(0)
    expect(
      ['2027-01-01', '2026-12-31', '2026-02-01'].sort(compareDates)
    ).toEqual(['2026-02-01', '2026-12-31', '2027-01-01'])
  })
})

describe('dayOfWeek', () => {
  it.each([
    ['2026-09-28', 1],
    ['2026-10-02', 5],
    ['2026-10-03', 6],
    ['2026-10-04', 7],
    ['2028-02-29', 2]
  ])('%s is day %i, Monday first', (date, expected) => {
    expect(dayOfWeek(date)).toBe(expected)
  })
})

describe('startOfWeek', () => {
  it.each([
    ['2026-10-02', 1, '2026-09-28'],
    ['2026-09-28', 1, '2026-09-28'],
    ['2026-10-04', 1, '2026-09-28'],
    // The Monday falls in the previous month.
    ['2026-10-01', 1, '2026-09-28'],
    ['2027-01-01', 1, '2026-12-28'],
    ['2026-10-02', 7, '2026-09-27'],
    ['2026-10-04', 7, '2026-10-04'],
    ['2026-10-02', 6, '2026-09-26']
  ])('the week holding %s, starting on day %i, opens %s', (date, ws, exp) => {
    expect(startOfWeek(date, ws)).toBe(exp)
  })

  it('defaults to Monday', () => {
    expect(startOfWeek('2026-10-02')).toBe('2026-09-28')
  })

  it('rejects a week start outside 1 to 7', () => {
    expect(() => startOfWeek('2026-10-02', 0)).toThrow(RangeError)
  })
})

describe('monthGrid', () => {
  it('lays out October 2026 Monday first, with outside days', () => {
    const grid = monthGrid(2026, 10)
    expect(grid).toHaveLength(5)
    expect(grid[0]).toEqual([
      '2026-09-28',
      '2026-09-29',
      '2026-09-30',
      '2026-10-01',
      '2026-10-02',
      '2026-10-03',
      '2026-10-04'
    ])
    expect(grid.at(-1)?.at(-1)).toBe('2026-11-01')
    expect(grid.every((week) => week.length === 7)).toBe(true)
  })

  it('starts on Sunday when asked', () => {
    const grid = monthGrid(2026, 10, { weekStart: 7 })
    expect(grid[0]![0]).toBe('2026-09-27')
    expect(grid.at(-1)?.at(-1)).toBe('2026-10-31')
  })

  it('needs only four weeks for a February that starts on Monday', () => {
    expect(monthGrid(2027, 2)).toHaveLength(4)
  })

  it('always returns six weeks with fixedWeeks', () => {
    const grid = monthGrid(2027, 2, { fixedWeeks: true })
    expect(grid).toHaveLength(6)
    expect(grid[0]![0]).toBe('2027-02-01')
    expect(grid.at(-1)?.at(-1)).toBe('2027-03-14')
  })

  it('handles a leap February', () => {
    const days = monthGrid(2028, 2).flat()
    expect(days).toContain('2028-02-29')
    expect(days).not.toContain('2028-02-30')
  })

  it('rejects a month outside 1 to 12', () => {
    expect(() => monthGrid(2026, 13)).toThrow(RangeError)
  })
})
