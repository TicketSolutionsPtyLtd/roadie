import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  currencyPrefix,
  formatCurrency,
  formatDayHeader,
  formatDayShort,
  formatEventSchedule,
  formatSeatRange,
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

  describe('with a venue timeZone', () => {
    // Absolute instant (Z) + explicit IANA tz → result depends only on the
    // venue tz, so these assertions are independent of the test runner's tz.
    it('renders the instant in the venue tz (Australia/Brisbane = UTC+10)', () => {
      // 09:00 UTC = 19:00 in Brisbane.
      expect(
        formatTime(new Date('2026-10-03T09:00:00Z'), {
          timeZone: 'Australia/Brisbane'
        })
      ).toBe('7pm')
    })
    it('renders the same instant differently in another venue tz', () => {
      // 09:00 UTC = 05:00 in New York (EDT, UTC-4).
      expect(
        formatTime(new Date('2026-10-03T09:00:00Z'), {
          timeZone: 'America/New_York'
        })
      ).toBe('5am')
    })
    it('falls back to browser-local (no throw) for an invalid tz id', () => {
      const date = new Date(2026, 0, 1, 19, 30)
      expect(() => formatTime(date, { timeZone: 'Not/AZone' })).not.toThrow()
      expect(formatTime(date, { timeZone: 'Not/AZone' })).toBe(formatTime(date))
    })
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

  describe('with eventTimeZone (venue-local times)', () => {
    // Absolute instants (Z) + an explicit venue tz → runner-tz-independent.
    it('renders same-day start/finish in the venue tz', () => {
      // 09:00–13:00 UTC = 19:00–23:00 Brisbane (UTC+10).
      expect(
        formatEventSchedule(
          {
            eventStartAtUtc: '2026-10-03T09:00:00Z',
            eventEndAtUtc: '2026-10-03T13:00:00Z',
            eventDateKey: '2026-10-03',
            eventTimeZone: 'Australia/Brisbane'
          },
          opts
        )
      ).toBe('7pm – 11pm')
    })

    it('threads the venue tz through the multi-day branch', () => {
      // 08:30 UTC → 18:30 Brisbane; next day 11:00 UTC → 21:00 Brisbane.
      const out = formatEventSchedule(
        {
          eventStartAtUtc: '2026-10-03T08:30:00Z',
          eventEndAtUtc: '2026-10-04T11:00:00Z',
          eventDateKey: '2026-10-03',
          eventEndDateKey: '2026-10-04',
          eventTimeZone: 'Australia/Brisbane'
        },
        opts
      )
      expect(out).toMatch(/^6:30pm – /)
      expect(out).toContain('Oct')
      expect(out).toMatch(/9pm$/)
    })

    it('falls back to browser-local for an invalid tz (no throw)', () => {
      // Local-naive start + bogus tz → fallback parses local wall-clock = 7pm,
      // independent of the runner tz.
      const event = {
        eventStartAtUtc: '2026-10-03T19:00:00',
        eventDateKey: '2026-10-03',
        eventTimeZone: 'Bogus/Zone'
      }
      expect(() => formatEventSchedule(event, opts)).not.toThrow()
      expect(formatEventSchedule(event, opts)).toBe('7pm')
    })

    // Forcing the runner tz proves the time is the VENUE's, not the runner's:
    // the same instant reads differently with vs without eventTimeZone.
    describe('under a runner tz that differs from the venue', () => {
      const original = process.env.TZ
      beforeAll(() => {
        process.env.TZ = 'America/New_York'
      })
      afterAll(() => {
        process.env.TZ = original
      })
      it('uses venue-local (Brisbane), not runner-local (New York)', () => {
        const base = {
          eventStartAtUtc: '2026-10-03T09:00:00Z', // 19:00 Brisbane / 05:00 NY
          eventDateKey: '2026-10-03'
        }
        // No tz → runner-local (New York) = 5am.
        expect(formatEventSchedule(base, opts)).toBe('5am')
        // With venue tz → Brisbane = 7pm.
        expect(
          formatEventSchedule(
            { ...base, eventTimeZone: 'Australia/Brisbane' },
            opts
          )
        ).toBe('7pm')
      })
    })
  })
})

describe('formatSeatRange', () => {
  it('returns null for no seats', () => {
    expect(formatSeatRange(undefined)).toBeNull()
    expect(formatSeatRange([])).toBeNull()
  })

  it('collapses a consecutive run within a row', () => {
    expect(
      formatSeatRange([
        { section: 'Stalls', row: 'B', seat: '11' },
        { section: 'Stalls', row: 'B', seat: '12' }
      ])
    ).toBe('Stalls B11–12')
  })

  it('handles a section without a row', () => {
    expect(formatSeatRange([{ section: 'Booth', seat: '4' }])).toBe('Booth 4')
  })

  it('keeps gaps as a comma list and runs as a range', () => {
    expect(
      formatSeatRange([
        { row: 'B', seat: '11' },
        { row: 'B', seat: '12' },
        { row: 'B', seat: '15' }
      ])
    ).toBe('B11–12, 15')
  })

  it('joins separate section/row groups with a middle dot', () => {
    expect(
      formatSeatRange([
        { section: 'Stalls', row: 'B', seat: '11' },
        { section: 'Stalls', row: 'B', seat: '12' },
        { section: 'Mezzanine', row: 'M', seat: '3' }
      ])
    ).toBe('Stalls B11–12 · Mezzanine M3')
  })

  it('sorts unordered numeric seats before collapsing', () => {
    expect(
      formatSeatRange([
        { row: 'A', seat: '3' },
        { row: 'A', seat: '1' },
        { row: 'A', seat: '2' }
      ])
    ).toBe('A1–3')
  })

  it('falls back to a comma list for non-integer labels', () => {
    expect(
      formatSeatRange([
        { section: 'GA', seat: '11A' },
        { section: 'GA', seat: '11B' }
      ])
    ).toBe('GA 11A, 11B')
  })

  it('de-dupes identical seats from a merged reservation', () => {
    expect(
      formatSeatRange([
        { section: 'Stalls', row: 'B', seat: '11' },
        { section: 'Stalls', row: 'B', seat: '12' },
        { section: 'Stalls', row: 'B', seat: '11' },
        { section: 'Stalls', row: 'B', seat: '12' }
      ])
    ).toBe('Stalls B11–12')
  })
})
