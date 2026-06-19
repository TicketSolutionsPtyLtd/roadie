import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  currencyPrefix,
  formatCurrency,
  formatDayHeader,
  formatDayShort,
  formatEventSchedule,
  formatTime
} from './format'

describe('formatCurrency', () => {
  it('formats AUD in en-AU', () => {
    const out = formatCurrency(12.5, { locale: 'en-AU', currency: 'AUD' })
    expect(out).toContain('12.50')
  })
  it('formats NZD in en-NZ (no hardcoded $ / AUD)', () => {
    const out = formatCurrency(12.5, { locale: 'en-NZ', currency: 'NZD' })
    expect(out).toContain('12.50')
    expect(out).toContain('$') // en-NZ uses $ but the currency is NZD
  })
})

describe('currencyPrefix', () => {
  it('returns the leading symbol, not a hardcoded $', () => {
    expect(currencyPrefix('en-AU', 'AUD')).toBe('$')
    expect(currencyPrefix('en-NZ', 'NZD')).toBe('$')
    // de-DE puts the symbol after the amount → no leading prefix.
    expect(currencyPrefix('de-DE', 'EUR')).toBe('')
  })
})

describe('formatTime', () => {
  // Local time — construct via the local-time Date ctor so the assertion is
  // TZ-independent (matches how the skins parse the wall-clock hour).
  it.each<[number, number, string]>([
    [19, 0, '7pm'],
    [19, 30, '7:30pm'],
    [0, 0, '12am'],
    [0, 5, '12:05am'],
    [12, 0, '12pm'],
    [9, 5, '9:05am']
  ])('%i:%i → %s', (h: number, m: number, expected: string) => {
    expect(formatTime(new Date(2026, 0, 1, h, m))).toBe(expected)
  })
})

describe('formatDayHeader', () => {
  it('formats a venue-local key into a readable header', () => {
    const out = formatDayHeader('2026-06-15', { locale: 'en-AU' })
    expect(out).toMatch(/2026/)
    expect(out).toMatch(/June|Jun/)
  })
  it('returns the raw key for an empty string (fail-safe)', () => {
    expect(formatDayHeader('', { locale: 'en-AU' })).toBe('')
  })
  it('returns the raw key for an out-of-range date (no rollover)', () => {
    expect(formatDayHeader('2026-13-40', { locale: 'en-AU' })).toBe(
      '2026-13-40'
    )
  })

  // The whole reason formatDayHeader parses with the local-date ctor (not
  // `new Date('YYYY-MM-DD')`, which is UTC midnight) is to avoid a day-shift in
  // non-UTC zones. Run it under a behind-UTC zone to prove the key's day is
  // preserved — a UTC-parse impl would render the 14th here.
  describe('under a non-UTC timezone (America/New_York)', () => {
    const original = process.env.TZ
    beforeAll(() => {
      process.env.TZ = 'America/New_York'
    })
    afterAll(() => {
      process.env.TZ = original
    })
    it('keeps the venue-local day (no UTC off-by-one)', () => {
      const out = formatDayHeader('2026-06-15', { locale: 'en-AU' })
      expect(out).toContain('15')
      expect(out).not.toContain('14')
    })
  })
})

describe('formatDayShort', () => {
  it('formats a key as a year-less short day', () => {
    const out = formatDayShort('2026-10-04', { locale: 'en-AU' })
    expect(out).toContain('4')
    expect(out).toContain('Oct')
    expect(out).not.toContain('2026')
  })
  it('returns the raw key when malformed', () => {
    expect(formatDayShort('nope', { locale: 'en-AU' })).toBe('nope')
  })
})

describe('formatEventSchedule', () => {
  const opts = { locale: 'en-AU' }
  // Local-naive ISO (no Z) so the local-time formatter is TZ-independent.

  it('shows only the start time when there is no finish', () => {
    expect(
      formatEventSchedule(
        { eventStartAtUtc: '2026-10-03T19:00:00', eventDateKey: '2026-10-03' },
        opts
      )
    ).toBe('7pm')
  })

  it('shows start – finish for a same-day finish time', () => {
    expect(
      formatEventSchedule(
        {
          eventStartAtUtc: '2026-10-03T19:00:00',
          eventEndAtUtc: '2026-10-03T23:00:00',
          eventDateKey: '2026-10-03'
        },
        opts
      )
    ).toBe('7pm – 11pm')
  })

  it('adds the end date for a multi-day run', () => {
    const out = formatEventSchedule(
      {
        eventStartAtUtc: '2026-10-03T18:30:00',
        eventEndAtUtc: '2026-10-04T21:00:00',
        eventDateKey: '2026-10-03',
        eventEndDateKey: '2026-10-04'
      },
      opts
    )
    expect(out).toMatch(/^6:30pm – /)
    expect(out).toContain('Oct')
    expect(out).toContain('4')
    expect(out).toMatch(/9pm$/)
  })

  it('returns null when the start is unparseable', () => {
    expect(
      formatEventSchedule(
        { eventStartAtUtc: 'not-a-date', eventDateKey: 'x' },
        opts
      )
    ).toBeNull()
  })
})
