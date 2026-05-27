import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { formatCurrency, formatDayHeader, formatTime } from './format'

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
