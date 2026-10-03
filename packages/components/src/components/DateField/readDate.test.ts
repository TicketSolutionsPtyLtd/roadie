import { describe, expect, it } from 'vitest'

import { formatDate, readDate } from './readDate'

// Wed 7 Oct 2026.
const TODAY = '2026-10-07'
const TYPE_A_DATE = 'Enter a date, like 14 Mar or next Fri'

describe('readDate', () => {
  it.each([
    ['', null],
    ['   ', null],
    ['14 mar', '2027-03-14'],
    ['1/12', '2026-12-01'],
    ['1/12/2027', '2027-12-01'],
    ['next fri', '2026-10-16'],
    ['fri', '2026-10-09'],
    ['today', '2026-10-07'],
    ['tomorrow', '2026-10-08'],
    ['yesterday', '2026-10-06'],
    ['2026-11-27', '2026-11-27'],
    ['Fri 27 Nov 2026', '2026-11-27']
  ])('%j is %j', (text, value) => {
    expect(readDate(text, { today: TODAY })).toEqual({ value })
  })

  it.each(['this week', '7:30pm', 'next 7 days', 'gibberish', '31/2'])(
    '%j is not one date',
    (text) => {
      expect(readDate(text, { today: TODAY })).toEqual({ error: TYPE_A_DATE })
    }
  )

  it('says which date is unavailable', () => {
    expect(
      readDate('1 oct', { today: TODAY, disabled: { before: TODAY } })
    ).toEqual({ error: 'Thu 1 Oct 2026 isn’t available' })
  })

  it('reads today in the given zone when today is not passed', () => {
    // 1am Thu 8 Oct in Sydney, still Wed 7 Oct in Perth.
    const now = new Date('2026-10-07T15:00:00Z')
    expect(readDate('today', { now, timeZone: 'Australia/Perth' })).toEqual({
      value: '2026-10-07'
    })
    expect(readDate('today', { now, timeZone: 'Australia/Sydney' })).toEqual({
      value: '2026-10-08'
    })
  })
})

describe('formatDate', () => {
  it.each([
    ['long', 'Fri 27 Nov 2026'],
    ['medium', '27 Nov 2026'],
    ['full', 'Friday, 27 November 2026']
  ] as const)('%s', (dateStyle, text) => {
    expect(formatDate('2026-11-27', { dateStyle })).toBe(text)
  })

  it.each(['de-DE', 'fr-FR', 'es-ES', 'it-IT', 'nl-NL', 'en-US'])(
    'reads back every month it shows in %s',
    (locale) => {
      for (let month = 1; month <= 12; month++) {
        const date = `2026-${String(month).padStart(2, '0')}-27`
        for (const dateStyle of ['full', 'long', 'medium'] as const) {
          const text = formatDate(date, { dateStyle, locale })
          expect(readDate(text, { today: TODAY, locale }), text).toEqual({
            value: date
          })
        }
      }
    }
  )

  it('still reads English typed in another locale', () => {
    for (const locale of ['fr-FR', 'es-ES', 'it-IT']) {
      expect(readDate('27 mar', { today: TODAY, locale })).toEqual({
        value: '2027-03-27'
      })
    }
  })

  it('refuses rather than guesses a name it can’t read', () => {
    expect(
      readDate('27 فروردین 2026', { today: TODAY, locale: 'fa-IR' })
    ).toEqual({ error: TYPE_A_DATE })
  })

  it('reads on with a locale tag Intl rejects', () => {
    expect(readDate('14 mar', { today: TODAY, locale: 'en_AU' })).toEqual({
      value: '2027-03-14'
    })
  })

  it('reads back what it shows', () => {
    for (const dateStyle of ['full', 'long', 'medium'] as const) {
      expect(
        readDate(formatDate('2026-11-27', { dateStyle }), { today: TODAY })
      ).toEqual({ value: '2026-11-27' })
    }
  })
})
