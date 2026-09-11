import { describe, expect, it, vi } from 'vitest'

import {
  formatCountdown,
  formatDateRange,
  formatDateRangeParts,
  formatDateTime,
  formatDuration,
  formatDurationDays,
  formatFull,
  formatGlyph,
  formatIso,
  formatLong,
  formatMachine,
  formatMachineDuration,
  formatMedium,
  formatRelative,
  formatShort,
  formatTimeOfDay,
  formatTimeRange,
  joinWithFact,
  viewerTimeZone
} from './format'

const BNE = 'Australia/Brisbane' // +10, no DST
const PER = 'Australia/Perth' // +08
const SYD = 'Australia/Sydney' // +10/+11

// Fri 27 Nov 2026, 7:30pm Brisbane
const start = new Date('2026-11-27T09:30:00Z')
// Sun 29 Nov 2026, 10:00pm Brisbane
const end = new Date('2026-11-29T12:00:00Z')

const inYear = (y: number) => new Date(`${y}-06-01T00:00:00Z`)
const bne = { timeZone: BNE }

describe('the date style scale', () => {
  it('is monotone — each step drops one thing', () => {
    expect(formatFull(start, bne)).toBe('Friday, 27 November 2026')
    expect(formatLong(start, bne)).toBe('Fri 27 Nov 2026')
    expect(formatMedium(start, bne)).toBe('27 Nov 2026')
    expect(formatShort(start, bne)).toBe('27 Nov')
    expect(formatIso(start, bne)).toBe('2026-11-27')
  })

  it('defaults to long, the everyday register', () => {
    expect(formatDateTime(start, bne)).toBe(formatLong(start, bne))
  })

  it('keeps weekday and month in the same register', () => {
    // full spells both out; long abbreviates both. Never one of each.
    expect(formatFull(start, bne)).toContain('Friday')
    expect(formatFull(start, bne)).toContain('November')
    expect(formatLong(start, bne)).toContain('Fri ')
    expect(formatLong(start, bne)).toContain('Nov ')
    expect(formatLong(start, bne)).not.toContain('November')
  })
})

describe('time is orthogonal to date style', () => {
  it('attaches to any style, comma-separated as Intl does', () => {
    expect(formatFull(start, { ...bne, timeStyle: 'medium' })).toBe(
      'Friday, 27 November 2026, 7:30pm'
    )
    expect(formatLong(start, { ...bne, timeStyle: 'medium' })).toBe(
      'Fri 27 Nov 2026, 7:30pm'
    )
    expect(formatShort(start, { ...bne, timeStyle: 'medium' })).toBe(
      '27 Nov, 7:30pm'
    )
  })

  it('is absent unless asked for', () => {
    expect(formatLong(start, bne)).toBe('Fri 27 Nov 2026')
  })

  it('is the platform default with the meridiem closed up', () => {
    // Intl renders '7:30 pm'. The house style closes that gap at every style,
    // so the space is the only difference from the platform.
    const platform = new Intl.DateTimeFormat('en-AU', {
      timeZone: BNE,
      timeStyle: 'short'
    }).format(start)
    expect(platform).toBe('7:30 pm')
    expect(formatTimeOfDay(start, bne)).toBe(platform.replace(' ', ''))
    expect(formatTimeOfDay(start, bne)).toBe('7:30pm')
  })

  it('numeric is fixed width and sorts as it reads', () => {
    expect(formatTimeOfDay(start, { ...bne, timeStyle: 'numeric' })).toBe(
      '19:30'
    )
    // Zero-padded, so every value is the same width in a column.
    const early = new Date('2026-11-27T23:05:00Z')
    expect(formatTimeOfDay(early, { ...bne, timeStyle: 'numeric' })).toBe(
      '09:05'
    )
    expect(
      formatTimeOfDay(early, { ...bne, timeStyle: 'numeric' })!.length
    ).toBe(formatTimeOfDay(start, { ...bne, timeStyle: 'numeric' })!.length)
  })

  it('numeric joins with a space, because data is not a sentence', () => {
    expect(formatShort(start, { ...bne, timeStyle: 'numeric' })).toBe(
      '27 Nov 19:30'
    )
    expect(formatShort(start, { ...bne, timeStyle: 'numeric' })).not.toContain(
      ','
    )
  })

  it('numeric never carries a zone name', () => {
    expect(
      formatTimeOfDay(start, { ...bne, timeStyle: 'numeric' })
    ).not.toMatch(/[A-Z]{3,4}$/)
  })

  it('long names the zone as people say it', () => {
    expect(formatTimeOfDay(start, { ...bne, timeStyle: 'long' })).toBe(
      '7:30pm AEST'
    )
    expect(formatTimeOfDay(start, { timeZone: PER, timeStyle: 'long' })).toBe(
      '5:30pm AWST'
    )
  })

  it('long follows daylight saving', () => {
    // The same venue reads AEDT in summer and AEST in winter.
    const summer = new Date('2026-11-27T09:30:00Z')
    const winter = new Date('2026-06-27T09:30:00Z')
    const syd = { timeZone: SYD, timeStyle: 'long' as const }
    expect(formatTimeOfDay(summer, syd)).toContain('AEDT')
    expect(formatTimeOfDay(winter, syd)).toContain('AEST')
    // Brisbane does not observe it, so it never changes.
    expect(formatTimeOfDay(summer, { ...bne, timeStyle: 'long' })).toContain(
      'AEST'
    )
    expect(formatTimeOfDay(winter, { ...bne, timeStyle: 'long' })).toContain(
      'AEST'
    )
  })

  it('attaches the zone to a full date and time too', () => {
    expect(formatLong(start, { ...bne, timeStyle: 'long' })).toBe(
      'Fri 27 Nov 2026, 7:30pm AEST'
    )
  })

  it('never names a zone under iso, where the offset already does', () => {
    expect(formatIso(start, { ...bne, timeStyle: 'long' })).toBe(
      '2026-11-27 19:30'
    )
  })

  it('compact drops :00 and the space, for tight spots', () => {
    const onTheHour = new Date('2026-11-27T09:00:00Z')
    expect(formatTimeOfDay(start, { ...bne, timeStyle: 'short' })).toBe(
      '7:30pm'
    )
    expect(formatTimeOfDay(onTheHour, { ...bne, timeStyle: 'short' })).toBe(
      '7pm'
    )
  })

  it('renders midnight and noon as 12', () => {
    expect(formatTimeOfDay(new Date('2026-11-27T14:00:00Z'), bne)).toBe(
      '12:00am'
    )
    expect(formatTimeOfDay(new Date('2026-11-27T02:00:00Z'), bne)).toBe(
      '12:00pm'
    )
  })

  it('stays machine-readable end to end under iso', () => {
    expect(formatIso(start, { ...bne, timeStyle: 'medium' })).toBe(
      '2026-11-27 19:30'
    )
  })
})

describe('the year rule', () => {
  it('drops the current year when the date stands alone', () => {
    expect(
      formatFull(start, { ...bne, context: 'standalone', now: inYear(2026) })
    ).toBe('Friday, 27 November')
  })

  it('keeps a year that is not the current one', () => {
    expect(
      formatFull(start, { ...bne, context: 'standalone', now: inYear(2025) })
    ).toBe('Friday, 27 November 2026')
  })

  it('always shows the year in a list, even the current one', () => {
    expect(
      formatLong(start, { ...bne, context: 'list', now: inYear(2026) })
    ).toBe('Fri 27 Nov 2026')
  })

  it('defaults to list, the unambiguous option', () => {
    expect(formatLong(start, { ...bne, now: inYear(2026) })).toBe(
      formatLong(start, { ...bne, context: 'list', now: inYear(2026) })
    )
  })

  it('short never carries a year, whatever the context', () => {
    expect(
      formatShort(start, { ...bne, context: 'standalone', now: inYear(2020) })
    ).toBe('27 Nov')
    expect(formatShort(start, { ...bne, showYear: true })).toBe('27 Nov')
  })

  it('iso always carries a year, whatever the context', () => {
    expect(
      formatIso(start, { ...bne, context: 'standalone', now: inYear(2026) })
    ).toBe('2026-11-27')
    expect(formatIso(start, { ...bne, showYear: false })).toBe('2026-11-27')
  })

  it('measures the current year in the venue zone, not the viewer’s', () => {
    // 31 Dec 2026 23:00 Perth is already 1 Jan 2027 in Sydney.
    const nye = new Date('2026-12-31T15:00:00Z')
    const o = { context: 'standalone' as const, now: nye }
    expect(formatLong(nye, { ...o, timeZone: PER })).toBe('Thu 31 Dec')
    expect(formatLong(nye, { ...o, timeZone: SYD })).toBe('Fri 1 Jan')
  })
})

describe('locales', () => {
  // The locale supplies the words; the rules supply the shape. A numbering
  // system that is not Latin must not take the whole formatter down with it.
  it('formats in a locale whose digits are not Latin', () => {
    for (const locale of ['ar-EG', 'hi-IN-u-nu-deva', 'bn-BD']) {
      const out = formatLong(start, { ...bne, locale })
      expect(out).not.toBeNull()
      expect(out).toMatch(/27/)
      expect(out).toMatch(/2026/)
    }
  })

  it('keeps the numbers Latin while the words follow the locale', () => {
    const out = formatMedium(start, { ...bne, locale: 'ar-EG' })
    expect(out).toMatch(/^27 /)
    expect(out).toMatch(/2026$/)
  })
})

describe('ranges', () => {
  it('rides the year on the later end of a same-year range', () => {
    expect(formatDateRange(start, end, bne)).toBe('Fri 27 to Sun 29 Nov 2026')
  })

  // Both ends were assembled by different routes, so the start lost its time.
  it('carries the time on both ends of a same-year range', () => {
    expect(formatDateRange(start, end, { ...bne, timeStyle: 'medium' })).toBe(
      'Fri 27, 7:30pm to Sun 29 Nov 2026, 10:00pm'
    )
  })

  it('carries the time on both ends of a cross-year range', () => {
    expect(
      formatDateRange(
        new Date('2026-12-30T09:00:00Z'),
        new Date('2027-01-01T09:00:00Z'),
        { ...bne, timeStyle: 'medium' }
      )
    ).toBe('Wed 30 Dec 2026, 7:00pm to Fri 1 Jan 2027, 7:00pm')
  })

  // A range whose ends share a day but not a time is a time range, and the end
  // time is the whole point of asking for one.
  it('gives the end as a bare time when both ends share a day', () => {
    expect(
      formatDateRange(
        new Date('2026-11-27T09:30:00Z'),
        new Date('2026-11-27T13:00:00Z'),
        { ...bne, timeStyle: 'medium' }
      )
    ).toBe('Fri 27 Nov 2026, 7:30pm to 11:00pm')
  })

  it('drops the zero minutes on the end under the short style', () => {
    expect(
      formatDateRange(
        new Date('2026-11-27T09:30:00Z'),
        new Date('2026-11-27T13:00:00Z'),
        { ...bne, timeStyle: 'short' }
      )
    ).toBe('Fri 27 Nov 2026, 7:30pm to 11pm')
  })

  it('still collapses a same-day range with no time on it', () => {
    expect(
      formatDateRangeParts(
        new Date('2026-11-27T09:30:00Z'),
        new Date('2026-11-27T13:00:00Z'),
        bne
      )?.to
    ).toBeNull()
  })

  // 'Fri 27 Nov 2026, 12:30pm'.endsWith('2:30pm') is true, so a suffix check
  // reads a noon start and a 2pm finish as the same time. Lunch is common.
  it('keeps an end time whose text is a suffix of the start', () => {
    const mel = {
      timeZone: 'Australia/Melbourne',
      timeStyle: 'medium'
    } as const
    expect(
      formatDateRangeParts(
        new Date('2026-11-27T01:30:00Z'),
        new Date('2026-11-27T03:30:00Z'),
        mel
      )
    ).toEqual({ from: 'Fri 27 Nov 2026, 12:30pm', to: '2:30pm' })
    expect(
      formatDateRangeParts(
        new Date('2026-11-27T01:00:00Z'),
        new Date('2026-11-27T03:00:00Z'),
        mel
      )
    ).toEqual({ from: 'Fri 27 Nov 2026, 12:00pm', to: '2:00pm' })
  })

  it('collapses two instants that render the same time', () => {
    expect(
      formatDateRangeParts(
        new Date('2026-11-27T09:30:15Z'),
        new Date('2026-11-27T09:30:45Z'),
        { ...bne, timeStyle: 'medium' }
      )?.to
    ).toBeNull()
  })

  it('collapses a range whose ends are the same instant', () => {
    const at = new Date('2026-11-27T09:30:00Z')
    expect(
      formatDateRangeParts(at, at, { ...bne, timeStyle: 'medium' })?.to
    ).toBeNull()
  })

  it('prints both years when a range straddles one', () => {
    expect(
      formatDateRange(
        new Date('2026-12-30T09:00:00Z'),
        new Date('2027-01-01T09:00:00Z'),
        bne
      )
    ).toBe('Wed 30 Dec 2026 to Fri 1 Jan 2027')
  })

  it('keeps the month on the start when the ends differ', () => {
    expect(formatDateRange(new Date('2026-10-30T09:00:00Z'), end, bne)).toBe(
      'Fri 30 Oct to Sun 29 Nov 2026'
    )
  })

  it('collapses a range that starts and ends on one day', () => {
    expect(formatDateRange(start, new Date('2026-11-27T13:00:00Z'), bne)).toBe(
      'Fri 27 Nov 2026'
    )
  })

  it('follows whichever date style it is given', () => {
    expect(formatDateRange(start, end, { ...bne, dateStyle: 'full' })).toBe(
      'Friday, 27 to Sunday, 29 November 2026'
    )
    expect(formatDateRange(start, end, { ...bne, dateStyle: 'medium' })).toBe(
      '27 to 29 Nov 2026'
    )
  })

  it('keeps both iso ends whole so each stays parseable', () => {
    expect(formatDateRange(start, end, { ...bne, dateStyle: 'iso' })).toBe(
      '2026-11-27 to 2026-11-29'
    )
  })

  it('joins a range with the word to, never a dash', () => {
    expect(formatTimeRange(start, end, bne)).toBe('7:30pm to 10:00pm')
  })

  it('separates an adjacent fact with a middot', () => {
    expect(joinWithFact('Fri 27 Nov 2026', '3 days')).toBe(
      'Fri 27 Nov 2026 · 3 days'
    )
    expect(joinWithFact('Fri 27 Nov 2026', null)).toBe('Fri 27 Nov 2026')
  })
})

describe('the venue timezone', () => {
  it('renders the venue’s wall clock, not the viewer’s', () => {
    // 23:00 Perth on the 27th is 02:00 Sydney on the 28th.
    const late = new Date('2026-11-27T15:00:00Z')
    expect(formatLong(late, { timeZone: PER })).toBe('Fri 27 Nov 2026')
    expect(formatTimeOfDay(late, { timeZone: PER })).toBe('11:00pm')
  })

  it('survives a DST boundary', () => {
    // Sydney clocks jump +10 -> +11 on 2026-10-04.
    const before = new Date('2026-10-03T12:00:00Z')
    const after = new Date('2026-10-04T12:00:00Z')
    expect(formatTimeOfDay(before, { timeZone: SYD })).toBe('10:00pm')
    expect(formatTimeOfDay(after, { timeZone: SYD })).toBe('11:00pm')
  })
})

describe('the glyph', () => {
  it('returns parts, never a year', () => {
    expect(formatGlyph(start, bne)).toEqual({
      month: 'NOV',
      day: '27',
      weekday: 'FRI'
    })
  })
})

describe('duration', () => {
  it('counts inclusive days', () => {
    expect(formatDurationDays(start, end, bne)).toBe('3 days')
  })

  it('rolls an end at or before 6am back to the night before', () => {
    // 10pm Fri to 3am Sat is one night, so no duration is shown.
    expect(
      formatDurationDays(
        new Date('2026-11-27T12:00:00Z'),
        new Date('2026-11-27T17:00:00Z'),
        bne
      )
    ).toBeNull()
  })

  it('does not collapse midnight to midnight', () => {
    expect(
      formatDurationDays(
        new Date('2026-11-26T14:00:00Z'),
        new Date('2026-11-28T14:00:00Z'),
        bne
      )
    ).toBe('3 days')
  })

  it('is unaffected by a DST boundary inside the range', () => {
    expect(
      formatDurationDays(
        new Date('2026-10-02T09:00:00Z'),
        new Date('2026-10-04T09:00:00Z'),
        { timeZone: SYD }
      )
    ).toBe('3 days')
  })

  it('says nothing for a single day', () => {
    expect(formatDurationDays(start, start, bne)).toBeNull()
  })

  it('says nothing past 30 days — 365 helps no one', () => {
    expect(
      formatDurationDays(start, new Date('2027-11-27T09:30:00Z'), bne)
    ).toBeNull()
  })
})

describe('the machine value', () => {
  it('is a zoneless date when no time is shown', () => {
    expect(formatMachine(start, bne)).toBe('2026-11-27')
  })

  it('carries the venue offset when a time is shown', () => {
    expect(formatMachine(start, { ...bne, timeStyle: 'medium' })).toBe(
      '2026-11-27T19:30:00+10:00'
    )
    expect(formatMachine(start, { timeZone: PER, timeStyle: 'medium' })).toBe(
      '2026-11-27T17:30:00+08:00'
    )
  })

  it('identifies the same instant whatever the venue', () => {
    for (const timeZone of [BNE, PER, SYD, 'UTC']) {
      const value = formatMachine(start, { timeZone, timeStyle: 'medium' })!
      expect(new Date(value).getTime()).toBe(start.getTime())
    }
  })

  it('is not the iso style, which has no offset', () => {
    const machine = formatMachine(start, { ...bne, timeStyle: 'medium' })!
    const iso = formatIso(start, { ...bne, timeStyle: 'medium' })!
    expect(machine).not.toBe(iso)
    expect(iso).not.toMatch(/[+-]\d{2}:\d{2}|Z$/)
  })
})

describe('durations', () => {
  const M = 60_000
  const H = 60 * M
  const D = 24 * H

  it('reads in words, coarsely', () => {
    expect(formatDuration(2 * H)).toBe('2 hours')
    expect(formatDuration(90 * M)).toBe('1 hour 30 minutes')
    expect(formatDuration(45 * M)).toBe('45 minutes')
    expect(formatDuration(3 * D)).toBe('3 days')
  })

  it('singularises', () => {
    expect(formatDuration(H)).toBe('1 hour')
    expect(formatDuration(M)).toBe('1 minute')
    expect(formatDuration(D)).toBe('1 day')
  })

  it('drops minutes once there are days', () => {
    expect(formatDuration(3 * D + 4 * H + 20 * M)).toBe('3 days 4 hours')
  })

  it('only shows seconds under a minute', () => {
    expect(formatDuration(30_000)).toBe('30 seconds')
    expect(formatDuration(2 * H + 12_000)).toBe('2 hours')
    expect(formatDuration(400)).toBe('less than a minute')
  })

  it('abbreviates on request', () => {
    expect(formatDuration(90 * M, 'short')).toBe('1h 30m')
    expect(formatDuration(3 * D + 4 * H, 'short')).toBe('3d 4h')
  })

  it('has a middle register for when there is no room for words', () => {
    expect(formatDuration(90 * M, 'medium')).toBe('1 hr 30 mins')
    expect(formatDuration(2 * H + 30 * M, 'medium')).toBe('2 hrs 30 mins')
    expect(formatDuration(3 * D + 4 * H, 'medium')).toBe('3 days 4 hrs')
    expect(formatDuration(30_000, 'medium')).toBe('30 secs')
  })

  it('inflects the middle register and never the short one', () => {
    expect(formatDuration(H, 'medium')).toBe('1 hr')
    expect(formatDuration(2 * H, 'medium')).toBe('2 hrs')
    expect(formatDuration(H, 'short')).toBe('1h')
    expect(formatDuration(2 * H, 'short')).toBe('2h')
  })

  // Rounding 59.6s up to 60 and then calling it seconds reads as a broken clock.
  it('promotes a rounded 60 seconds to one minute', () => {
    expect(formatDuration(59_600)).toBe('1 minute')
    expect(formatDuration(59_600, 'medium')).toBe('1 min')
    expect(formatDuration(59_600, 'short')).toBe('1m')
    expect(formatDuration(59_400)).toBe('59 seconds')
  })

  it('says nearly nothing rather than nothing under a minute', () => {
    expect(formatDuration(400)).toBe('less than a minute')
    expect(formatDuration(400, 'medium')).toBe('under a min')
    expect(formatDuration(400, 'short')).toBe('0m')
  })

  it('takes an ISO 8601 duration, the same language it emits', () => {
    expect(formatDuration('PT2H30M')).toBe('2 hours 30 minutes')
    expect(formatDuration('P3D')).toBe('3 days')
    expect(formatDuration('PT45S')).toBe('45 seconds')
    expect(formatDuration('P1W')).toBe('7 days')
    expect(formatMachineDuration('PT2H30M')).toBe('PT2H30M')
  })

  it('takes the field form, which is what Temporal.Duration exposes', () => {
    expect(formatDuration({ hours: 2, minutes: 30 })).toBe('2 hours 30 minutes')
    expect(formatDuration({ days: 3 })).toBe('3 days')
    expect(formatMachineDuration({ hours: 2, minutes: 30 })).toBe('PT2H30M')
    // Temporal.Duration carries every field, including the zeroes.
    const temporalShaped = {
      years: 0,
      months: 0,
      weeks: 0,
      days: 0,
      hours: 2,
      minutes: 30,
      seconds: 0,
      milliseconds: 0
    }
    expect(formatDuration(temporalShaped)).toBe('2 hours 30 minutes')
  })

  it('refuses years and months rather than guessing a length', () => {
    expect(formatDuration('P1M')).toBeNull()
    expect(formatDuration('P1Y')).toBeNull()
    expect(formatDuration({ months: 1 })).toBeNull()
    expect(formatMachineDuration('P1M')).toBeNull()
  })

  it('refuses a string that is not a duration', () => {
    expect(formatDuration('2h30m')).toBeNull()
    expect(formatDuration('P')).toBeNull()
    expect(formatDuration('PT')).toBeNull()
    expect(formatDuration('')).toBeNull()
    expect(formatDuration('2026-11-27')).toBeNull()
  })

  it('reads a countdown from any of the forms', () => {
    expect(formatCountdown(272_000)).toBe('4:32')
    expect(formatCountdown('PT4M32S')).toBe('4:32')
    expect(formatCountdown({ minutes: 4, seconds: 32 })).toBe('4:32')
  })

  it('counts down as a clock, growing an hour field only when needed', () => {
    expect(formatCountdown(272_000)).toBe('4:32')
    expect(formatCountdown(9_000)).toBe('0:09')
    expect(formatCountdown(3_872_000)).toBe('1:04:32')
  })

  it('never counts below zero', () => {
    expect(formatCountdown(-5000)).toBe('0:00')
  })

  it('emits an ISO 8601 duration for a time element', () => {
    expect(formatMachineDuration(2 * H + 30 * M)).toBe('PT2H30M')
    expect(formatMachineDuration(3 * D)).toBe('P3D')
    expect(formatMachineDuration(3 * D + 4 * H)).toBe('P3DT4H')
    expect(formatMachineDuration(0)).toBe('PT0S')
  })

  it('refuses nonsense rather than guessing', () => {
    expect(formatDuration(-1)).toBeNull()
    expect(formatDuration(NaN)).toBeNull()
    expect(formatMachineDuration(-1)).toBeNull()
  })
})

describe('Temporal readiness', () => {
  // Temporal.ZonedDateTime / Temporal.Instant expose epochMilliseconds. Stand in
  // for one structurally so the contract is pinned without a polyfill dependency.
  const asTemporal = (d: Date) => ({ epochMilliseconds: d.getTime() })

  it('accepts anything carrying epochMilliseconds', () => {
    expect(formatLong(asTemporal(start), bne)).toBe(formatLong(start, bne))
    expect(formatTimeOfDay(asTemporal(start), bne)).toBe('7:30pm')
    expect(formatGlyph(asTemporal(start), bne)?.month).toBe('NOV')
  })

  it('accepts one as `now` for the year rule', () => {
    expect(
      formatFull(start, {
        ...bne,
        context: 'standalone',
        now: asTemporal(inYear(2026))
      })
    ).toBe('Friday, 27 November')
  })

  it('accepts them on both ends of a range', () => {
    expect(formatDateRange(asTemporal(start), asTemporal(end), bne)).toBe(
      'Fri 27 to Sun 29 Nov 2026'
    )
    expect(formatDurationDays(asTemporal(start), asTemporal(end), bne)).toBe(
      '3 days'
    )
  })
})

describe('timestamps', () => {
  it('viewerTimeZone returns a usable IANA zone', () => {
    const tz = viewerTimeZone()
    expect(typeof tz).toBe('string')
    expect(tz.length).toBeGreaterThan(0)
    // Whatever it returns must be accepted by the formatters.
    expect(formatLong(start, { timeZone: tz })).not.toBeNull()
  })
})

describe('machine values', () => {
  // A caller that asked for a time and got a bare date has been handed a value
  // that claims less than it was asked for, silently.
  it('returns null rather than downgrading a time to a date', () => {
    const at = new Date('2026-11-27T09:30:00Z')
    expect(formatMachine(at, { ...bne, timeStyle: 'medium' })).toBe(
      '2026-11-27T19:30:00+10:00'
    )
    expect(
      formatMachine(at, { timeZone: 'Bogus/Zone', timeStyle: 'medium' })
    ).toBeNull()
  })

  // Reachable on an engine whose ICU lacks 'longOffset': the parts resolve but
  // the offset does not, which used to yield a bare date for a datetime ask.
  it('returns null when only the offset cannot be resolved', () => {
    const real = Intl.DateTimeFormat
    // A plain function, not an arrow: the code calls this with `new`.
    const spy = vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(function (
      locale?: string,
      opts?: Intl.DateTimeFormatOptions
    ) {
      return opts?.timeZoneName === 'longOffset'
        ? { formatToParts: () => [{ type: 'literal', value: '?' }] }
        : new real(locale, opts)
    } as unknown as typeof Intl.DateTimeFormat)
    try {
      const at = new Date('2026-11-27T09:30:00Z')
      expect(formatMachine(at, { ...bne, timeStyle: 'medium' })).toBeNull()
      // With no time asked for, a bare date needs no offset and is still right.
      expect(formatMachine(at, bne)).toBe('2026-11-27')
    } finally {
      spy.mockRestore()
    }
  })

  // Rounding the fraction on its own can carry it to 60, which `% 60` then
  // erases, leaving every field zero and the invalid duration 'P'.
  it('carries a rounded fraction into the next field', () => {
    expect(formatMachineDuration(59_999.6)).toBe('PT1M')
    expect(formatMachineDuration(0.4)).toBe('PT0S')
    expect(formatMachineDuration(59_999)).toBe('PT59.999S')
    expect(formatMachineDuration(86_399_999.6)).toBe('P1D')
    expect(formatMachineDuration(3_599_999.6)).toBe('PT1H')
  })

  // 'PT0S' beside the words 'less than a minute' is a contradiction.
  it('keeps sub-second precision in a machine duration', () => {
    expect(formatMachineDuration(400)).toBe('PT0.4S')
    expect(formatDuration(400)).toBe('less than a minute')
    expect(formatMachineDuration(1500)).toBe('PT1.5S')
    expect(formatMachineDuration(0)).toBe('PT0S')
    expect(formatMachineDuration(9_000_000)).toBe('PT2H30M')
    expect(formatMachineDuration(2000)).toBe('PT2S')
  })
})

describe('relative time', () => {
  const now = new Date('2026-11-27T12:00:00Z')
  const ago = (ms: number) => new Date(now.getTime() - ms)
  const rel = { timeZone: BNE, now }

  it('reads under a minute as an instant', () => {
    expect(formatRelative(ago(20_000), rel)).toBe('just now')
    expect(formatRelative(now, rel)).toBe('just now')
  })

  it('counts minutes and hours', () => {
    expect(formatRelative(ago(3 * 60_000), rel)).toBe('3 minutes ago')
    expect(formatRelative(ago(60 * 60_000), rel)).toBe('1 hour ago')
    expect(formatRelative(ago(5 * 60 * 60_000), rel)).toBe('5 hours ago')
  })

  // Rounding inside a unit can push the count past that unit's own ceiling.
  it('never overflows a unit it has already chosen', () => {
    expect(formatRelative(ago(59 * 60_000 + 45_000), rel)).toBe('1 hour ago')
    expect(formatRelative(ago(23 * 3_600_000 + 40 * 60_000), rel)).toBe(
      'yesterday'
    )
    expect(formatRelative(ago(59 * 60_000 + 20_000), rel)).toBe(
      '59 minutes ago'
    )
  })

  it('climbs the ladder into days, and names the nearest one', () => {
    const D = 24 * 60 * 60_000
    expect(formatRelative(ago(D), rel)).toBe('yesterday')
    expect(formatRelative(ago(3 * D), rel)).toBe('3 days ago')
    expect(formatRelative(ago(6 * D), rel)).toBe('6 days ago')
  })

  it('reads the future as well as the past', () => {
    const D = 24 * 60 * 60_000
    expect(formatRelative(ago(-20 * 60_000), rel)).toBe('in 20 minutes')
    expect(formatRelative(ago(-D), rel)).toBe('tomorrow')
    expect(formatRelative(ago(-5 * D), rel)).toBe('in 5 days')
  })

  it('falls back to the absolute date past the cutoff', () => {
    const old = ago(10 * 24 * 60 * 60_000)
    expect(formatRelative(old, rel)).toBe(formatLong(old, rel))
  })

  it('takes a custom cutoff', () => {
    const twoHours = ago(2 * 60 * 60_000)
    expect(formatRelative(twoHours, { ...rel, cutoffMs: 60 * 60_000 })).toBe(
      formatLong(twoHours, rel)
    )
  })

  it('honours the date style it falls back to', () => {
    const old = ago(10 * 24 * 60 * 60_000)
    expect(formatRelative(old, { ...rel, dateStyle: 'medium' })).toBe(
      formatMedium(old, rel)
    )
  })

  it('returns null for bad input', () => {
    expect(formatRelative(new Date('nope'), rel)).toBeNull()
  })
})

describe('bad input', () => {
  it('returns null rather than "Invalid Date"', () => {
    const bad = new Date('nope')
    expect(formatLong(bad, bne)).toBeNull()
    expect(formatGlyph(bad, bne)).toBeNull()
    expect(formatTimeOfDay(bad, bne)).toBeNull()
  })

  it('returns null for an unknown timezone', () => {
    expect(formatLong(start, { timeZone: 'Mars/Olympus' })).toBeNull()
  })
})
