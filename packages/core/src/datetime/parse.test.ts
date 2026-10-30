import { describe, expect, it } from 'vitest'

import {
  type DatePhraseSuggestion,
  isDatePhraseCompletion,
  parseDatePhrase
} from './parse'

// Fri 2 Oct 2026, 10am in Sydney.
const SYDNEY = {
  now: new Date('2026-10-02T00:00:00Z'),
  timeZone: 'Australia/Sydney'
}
// Wed 30 Sept 2026, 10am in Sydney.
const WEDNESDAY = { ...SYDNEY, now: new Date('2026-09-30T00:00:00Z') }

const one = (
  label: string,
  value: DatePhraseSuggestion['value']
): DatePhraseSuggestion[] => [{ label, value }]

describe('parseDatePhrase: relative words', () => {
  it.each<[string, DatePhraseSuggestion[]]>([
    ['today', one('Today', 'today')],
    ['tomorrow', one('Tomorrow', 'tomorrow')],
    ['yesterday', one('Yesterday', 'yesterday')],
    ['tmrw', one('Tomorrow', 'tomorrow')],
    ['tomorow', one('Tomorrow', 'tomorrow')],
    ['tonight', one('Today', 'today')],
    ['this week', one('This week', 'this-week')],
    ['next week', one('Next week', 'next-week')],
    ['last week', one('Last week', 'last-week')],
    ['this weekend', one('This weekend', 'this-weekend')],
    ['this month', one('This month', 'this-month')],
    ['next month', one('Next month', 'next-month')],
    ['last month', one('Last month', 'last-month')],
    ['upcoming', one('Upcoming', 'upcoming')],
    ['ongoing', one('Happening now', 'ongoing')],
    [
      'next 7 days',
      one('Next 7 days', { direction: 'next', amount: 7, unit: 'day' })
    ],
    [
      'past 3 hours',
      one('Last 3 hours', { direction: 'past', amount: 3, unit: 'hour' })
    ],
    [
      'last 2 weeks',
      one('Last 2 weeks', { direction: 'past', amount: 2, unit: 'week' })
    ],
    [
      'next 6 months',
      one('Next 6 months', { direction: 'next', amount: 6, unit: 'month' })
    ],
    [
      'next hour',
      one('Next 1 hour', { direction: 'next', amount: 1, unit: 'hour' })
    ],
    [
      'last 1 day',
      one('Last 1 day', { direction: 'past', amount: 1, unit: 'day' })
    ],
    [
      'fortnight',
      one('Next 14 days', { direction: 'next', amount: 14, unit: 'day' })
    ],
    [
      'next fortnight',
      one('Next 14 days', { direction: 'next', amount: 14, unit: 'day' })
    ],
    [
      'last fortnight',
      one('Last 14 days', { direction: 'past', amount: 14, unit: 'day' })
    ],
    [
      'this financial year',
      one('This financial year', { period: 'year', offset: 0, fiscal: true })
    ],
    [
      'last financial year',
      one('Last financial year', { period: 'year', offset: -1, fiscal: true })
    ],
    [
      'financial year to date',
      one('Financial year to date', {
        period: 'year',
        offset: 0,
        fiscal: true,
        toDate: true
      })
    ],
    ['last quarter', one('Last quarter', 'last-quarter')],
    ['this year', one('This year', 'this-year')],
    [
      'month to date',
      one('Month to date', { period: 'month', offset: 0, toDate: true })
    ]
  ])('%s', (text, expected) => {
    expect(parseDatePhrase(text, SYDNEY)).toEqual(expected)
  })

  it('offers both readings of next weekend, as dates', () => {
    expect(parseDatePhrase('next weekend', SYDNEY)).toEqual([
      {
        label: '10 to 11 Oct 2026',
        value: { start: '2026-10-10', end: '2026-10-11' },
        description: 'Next weekend'
      },
      { label: 'This weekend', value: 'this-weekend' }
    ])
  })

  it('reads last weekend as dates, and says which weekend they are', () => {
    expect(parseDatePhrase('last weekend', SYDNEY)).toEqual([
      {
        label: '26 to 27 Sept 2026',
        value: { start: '2026-09-26', end: '2026-09-27' },
        description: 'Last weekend'
      }
    ])
  })

  it.each([
    'weekend',
    'the weekend',
    'on the weekend',
    'at the weekend',
    'over the weekend',
    'on weekend'
  ])('reads "%s" as this weekend', (text) => {
    expect(parseDatePhrase(text, SYDNEY)).toEqual(
      one('This weekend', 'this-weekend')
    )
  })

  it('ignores case and extra spaces', () => {
    expect(parseDatePhrase('  This   WEEKEND ', SYDNEY)).toEqual(
      one('This weekend', 'this-weekend')
    )
  })

  it('completes a word as it is typed', () => {
    expect(parseDatePhrase('tom', SYDNEY)).toEqual(one('Tomorrow', 'tomorrow'))
    expect(parseDatePhrase('this wee', SYDNEY).map((s) => s.label)).toEqual([
      'This week',
      'This weekend'
    ])
  })

  it.each([
    ['wee', ['This week', 'This weekend', 'Week to date']],
    ['week', ['This week', 'This weekend', 'Week to date']],
    ['month', ['This month', 'Month to date']],
    ['year', ['This year', 'Year to date']]
  ])('completes "%s" to this period first', (text, labels) => {
    expect(parseDatePhrase(text, SYDNEY).map((s) => s.label)).toEqual(labels)
  })

  it('keeps completing a phrase that contains to', () => {
    expect(parseDatePhrase('month to d', SYDNEY)).toEqual(
      one('Month to date', { period: 'month', offset: 0, toDate: true })
    )
  })

  it('offers each unit for a bare count', () => {
    expect(parseDatePhrase('next 3', SYDNEY).map((s) => s.label)).toEqual([
      'Next 3 days',
      'Next 3 weeks',
      'Next 3 months',
      'Next 3 hours'
    ])
  })
})

describe('parseDatePhrase: weekdays', () => {
  it.each<[string, typeof SYDNEY, string[]]>([
    ['fri', SYDNEY, ['2026-10-02']],
    ['friday', SYDNEY, ['2026-10-02']],
    ['this fri', SYDNEY, ['2026-10-02']],
    ['mon', SYDNEY, ['2026-10-05']],
    ['next fri', SYDNEY, ['2026-10-09']],
    ['next mon', SYDNEY, ['2026-10-05']],
    ['last fri', SYDNEY, ['2026-09-25']],
    ['thurs', WEDNESDAY, ['2026-10-01']],
    // Wednesday: next week's Friday, then the coming one.
    ['next fri', WEDNESDAY, ['2026-10-09', '2026-10-02']]
  ])('%s', (text, options, expected) => {
    const suggestions = parseDatePhrase(text, options)
    expect(suggestions.map((s) => s.value)).toEqual(
      expected.map((on) => ({ on }))
    )
  })

  it('labels a weekday with its date', () => {
    expect(parseDatePhrase('next fri', SYDNEY)).toEqual(
      one('Fri 9 Oct 2026', { on: '2026-10-09' })
    )
  })
})

describe('parseDatePhrase: in and end of', () => {
  it.each<[string, string]>([
    ['in 3 days', '2026-10-05'],
    ['in 1 day', '2026-10-03'],
    ['in a week', '2026-10-09'],
    ['in 2 weeks', '2026-10-16'],
    ['in 2 wks', '2026-10-16'],
    ['in 2 months', '2026-12-02'],
    ['in an hour', ''],
    ['in 1 year', '2027-10-02'],
    ['end of week', '2026-10-04'],
    ['end of the month', '2026-10-31'],
    ['end of month', '2026-10-31'],
    ['end of year', '2026-12-31']
  ])('%s', (text, on) => {
    const values = parseDatePhrase(text, SYDNEY).map((s) => s.value)
    expect(values).toEqual(on ? [{ on }] : [])
  })

  it.each<[string, DatePhraseSuggestion[]]>([
    [
      'rest of the week',
      one('2 to 4 Oct 2026', { start: '2026-10-02', end: '2026-10-04' })
    ],
    [
      'rest of this week',
      one('2 to 4 Oct 2026', { start: '2026-10-02', end: '2026-10-04' })
    ],
    [
      'rest of month',
      one('2 to 31 Oct 2026', { start: '2026-10-02', end: '2026-10-31' })
    ],
    [
      'rest of the year',
      one('2 Oct to 31 Dec 2026', { start: '2026-10-02', end: '2026-12-31' })
    ]
  ])('reads "%s" from today to the end', (text, expected) => {
    expect(parseDatePhrase(text, SYDNEY)).toEqual(expected)
  })

  it('offers no rest of the week past year 9999', () => {
    const last = { now: new Date('9999-12-31T12:00:00Z'), timeZone: 'UTC' }
    expect(parseDatePhrase('rest of the week', last)).toEqual([])
  })

  it('labels the date it lands on', () => {
    expect(parseDatePhrase('in 2 weeks', SYDNEY)).toEqual(
      one('Fri 16 Oct 2026', { on: '2026-10-16' })
    )
  })

  it('clamps a month ahead to the end of a shorter month', () => {
    const january = { ...SYDNEY, now: new Date('2026-01-31T00:00:00Z') }
    expect(parseDatePhrase('in 1 month', january)[0]?.value).toEqual({
      on: '2026-02-28'
    })
  })

  it('offers no end of week past year 9999', () => {
    const last = { now: new Date('9999-12-31T12:00:00Z'), timeZone: 'UTC' }
    expect(parseDatePhrase('end of week', last)).toEqual([])
    expect(parseDatePhrase('end of month', last)[0]?.value).toEqual({
      on: '9999-12-31'
    })
  })

  it('ends the week on the day before weekStart', () => {
    expect(
      parseDatePhrase('end of week', { ...SYDNEY, weekStart: 7 })[0]?.value
    ).toEqual({ on: '2026-10-03' })
  })
})

describe('parseDatePhrase: dates', () => {
  it.each<[string, DatePhraseSuggestion[]]>([
    ['14 mar', one('Sun 14 Mar 2027', { on: '2027-03-14' })],
    ['14th March', one('Sun 14 Mar 2027', { on: '2027-03-14' })],
    ['14 march 2027', one('Sun 14 Mar 2027', { on: '2027-03-14' })],
    ['14 Mar 2026', one('Sat 14 Mar 2026', { on: '2026-03-14' })],
    ['mar 14', one('Sun 14 Mar 2027', { on: '2027-03-14' })],
    ['14 mar 27', one('Sun 14 Mar 2027', { on: '2027-03-14' })],
    ['mar 14 27', one('Sun 14 Mar 2027', { on: '2027-03-14' })],
    ['on 14 mar', one('Sun 14 Mar 2027', { on: '2027-03-14' })],
    ['1/12', one('Tue 1 Dec 2026', { on: '2026-12-01' })],
    ['1/12/2027', one('Wed 1 Dec 2027', { on: '2027-12-01' })],
    ['1/12/27', one('Wed 1 Dec 2027', { on: '2027-12-01' })],
    ['2026-12-01', one('Tue 1 Dec 2026', { on: '2026-12-01' })],
    ['2 oct', one('Fri 2 Oct 2026', { on: '2026-10-02' })],
    ['Fri 27 Nov 2026', one('Fri 27 Nov 2026', { on: '2026-11-27' })],
    ['Friday, 27 November 2026', one('Fri 27 Nov 2026', { on: '2026-11-27' })],
    ['sun 14 mar', one('Sun 14 Mar 2027', { on: '2027-03-14' })],
    ['Thu 27 Nov 2026', one('Fri 27 Nov 2026', { on: '2026-11-27' })],
    ['the 20th of oct', one('Tue 20 Oct 2026', { on: '2026-10-20' })],
    ['on the 14th of march', one('Sun 14 Mar 2027', { on: '2027-03-14' })],
    [
      'in the next 7 days',
      one('Next 7 days', { direction: 'next', amount: 7, unit: 'day' })
    ],
    [
      'in the last 2 weeks',
      one('Last 2 weeks', { direction: 'past', amount: 2, unit: 'week' })
    ],
    ['in the next week', one('Next week', 'next-week')],
    ['after 1 dec', one('After Tue 1 Dec 2026', { after: '2026-12-01' })],
    ['before 14 mar', one('Before Sun 14 Mar 2027', { before: '2027-03-14' })],
    [
      'between 1 and 14 mar',
      one('1 to 14 Mar 2027', { start: '2027-03-01', end: '2027-03-14' })
    ],
    [
      'between 20 dec and 5 jan',
      one('20 Dec 2026 to 5 Jan 2027', {
        start: '2026-12-20',
        end: '2027-01-05'
      })
    ],
    [
      'between 1 mar and 14 apr 2027',
      one('1 Mar to 14 Apr 2027', { start: '2027-03-01', end: '2027-04-14' })
    ]
  ])('%s', (text, expected) => {
    expect(parseDatePhrase(text, SYDNEY)).toEqual(expected)
  })

  it('takes the closest occurrence of a date with no year', () => {
    const april = (now: string) =>
      parseDatePhrase('1 apr', { ...SYDNEY, now: new Date(now) })[0]?.value
    // Six months either way: 1 Apr 2027 is 182 days off, 1 Apr 2026 is 183.
    expect(april('2026-10-01T00:00:00Z')).toEqual({ on: '2027-04-01' })
    expect(april('2026-09-15T00:00:00Z')).toEqual({ on: '2026-04-01' })
  })

  it('finds a leap day more than a year away', () => {
    expect(parseDatePhrase('29 feb', SYDNEY)).toEqual(
      one('Tue 29 Feb 2028', { on: '2028-02-29' })
    )
  })

  it('reads today in the given zone', () => {
    // 1am Sat 3 Oct in Sydney, still Fri 2 Oct in Perth.
    const now = new Date('2026-10-02T15:00:00Z')
    expect(
      parseDatePhrase('fri', { now, timeZone: 'Australia/Perth' })[0]?.value
    ).toEqual({ on: '2026-10-02' })
    expect(
      parseDatePhrase('fri', { now, timeZone: 'Australia/Sydney' })[0]?.value
    ).toEqual({ on: '2026-10-09' })
  })
})

describe('parseDatePhrase: a month', () => {
  const month = (label: string, start: string, end: string) => ({
    label,
    value: { start, end }
  })

  it.each<[string, DatePhraseSuggestion[]]>([
    [
      'may',
      [
        month('May 2026', '2026-05-01', '2026-05-31'),
        month('May 2027', '2027-05-01', '2027-05-31')
      ]
    ],
    [
      'Feb',
      [
        month('February 2027', '2027-02-01', '2027-02-28'),
        month('February 2026', '2026-02-01', '2026-02-28')
      ]
    ],
    [
      'april',
      [
        month('April 2027', '2027-04-01', '2027-04-30'),
        month('April 2026', '2026-04-01', '2026-04-30')
      ]
    ],
    ['october', [month('October 2026', '2026-10-01', '2026-10-31')]],
    ['may 2027', [month('May 2027', '2027-05-01', '2027-05-31')]],
    ['feb 2028', [month('February 2028', '2028-02-01', '2028-02-29')]]
  ])('%j', (text, expected) => {
    expect(parseDatePhrase(text, SYDNEY)).toEqual(expected)
  })

  it('keeps the year in Latin digits', () => {
    const [may] = parseDatePhrase('may 2027', { ...SYDNEY, locale: 'ar-EG' })
    expect(may!.label).toMatch(/ 2027$/)
  })

  it('orders the month and year as the locale does', () => {
    const [may] = parseDatePhrase('may 2027', { ...SYDNEY, locale: 'ja' })
    expect(may!.label).toBe('2027年5月')
  })

  it.each(['jan 0000', '14 jan 0000', '0000-01-14'])(
    'reads nothing for year 0 in %j',
    (text) => {
      expect(parseDatePhrase(text, SYDNEY)).toEqual([])
    }
  )

  it('reads December 9999, the last month a date holds', () => {
    expect(parseDatePhrase('dec 9999', SYDNEY)).toEqual([
      month('December 9999', '9999-12-01', '9999-12-31')
    ])
    expect(parseDatePhrase('since dec 9999', SYDNEY)[0]!.value).toEqual({
      after: '9999-11-30'
    })
  })

  it('looks back from since, like a date with no year', () => {
    expect(parseDatePhrase('since may', SYDNEY)[0]!.value).toEqual({
      after: '2026-04-30'
    })
  })
})

describe('parseDatePhrase: comparisons', () => {
  it.each<[string, DatePhraseSuggestion[]]>([
    ['after today', one('After Fri 2 Oct 2026', { after: '2026-10-02' })],
    ['before tomorrow', one('Before Sat 3 Oct 2026', { before: '2026-10-03' })],
    // A weekday after since is the last one, today included; after others, the coming one.
    ['after mon', one('After Mon 5 Oct 2026', { after: '2026-10-05' })],
    ['from wed', one('After Tue 6 Oct 2026', { after: '2026-10-06' })],
    ['on or after mon', one('After Sun 4 Oct 2026', { after: '2026-10-04' })],
    ['since wed', one('After Tue 29 Sept 2026', { after: '2026-09-29' })],
    ['since fri', one('After Thu 1 Oct 2026', { after: '2026-10-01' })],
    ['since next mon', one('After Sun 4 Oct 2026', { after: '2026-10-04' })],
    ['until mon', one('Before Tue 6 Oct 2026', { before: '2026-10-06' })],
    ['after in 2 weeks', one('After Fri 16 Oct 2026', { after: '2026-10-16' })],
    // A range: after its last day, before its first.
    [
      'after this weekend',
      one('After Sun 4 Oct 2026', { after: '2026-10-04' })
    ],
    [
      'before next week',
      one('Before Mon 5 Oct 2026', { before: '2026-10-05' })
    ],
    // Since, from and until take the day itself too.
    ['since mon', one('After Sun 27 Sept 2026', { after: '2026-09-27' })],
    ['from tomorrow', one('After Fri 2 Oct 2026', { after: '2026-10-02' })],
    [
      'since this weekend',
      one('After Fri 2 Oct 2026', { after: '2026-10-02' })
    ],
    ['since 1 dec', one('After Mon 30 Nov 2026', { after: '2026-11-30' })],
    ['until fri', one('Before Sat 3 Oct 2026', { before: '2026-10-03' })],
    [
      'till this weekend',
      one('Before Mon 5 Oct 2026', { before: '2026-10-05' })
    ],
    [
      'on or after 20 oct',
      one('After Mon 19 Oct 2026', { after: '2026-10-19' })
    ],
    [
      'on or before 20 oct',
      one('Before Wed 21 Oct 2026', { before: '2026-10-21' })
    ],
    // Onwards takes the day itself, as since does.
    ['20 oct onwards', one('After Mon 19 Oct 2026', { after: '2026-10-19' })],
    ['20 oct onward', one('After Mon 19 Oct 2026', { after: '2026-10-19' })],
    ['20 oct and later', one('After Mon 19 Oct 2026', { after: '2026-10-19' })],
    ['tomorrow onwards', one('After Fri 2 Oct 2026', { after: '2026-10-02' })],
    // Unlike since, a weekday before onwards is the coming one.
    ['mon onwards', one('After Sun 4 Oct 2026', { after: '2026-10-04' })],
    ['fri onwards', one('After Thu 1 Oct 2026', { after: '2026-10-01' })]
  ])('%s', (text, expected) => {
    expect(parseDatePhrase(text, SYDNEY)).toEqual(expected)
  })

  it.each([
    'after 7pm',
    'before upcoming',
    'since next 6 hours',
    'until after 1 dec',
    'since 20 oct onwards',
    '20 oct onwards onwards'
  ])('reads nothing for "%s", rather than drop the comparison', (text) => {
    expect(parseDatePhrase(text, SYDNEY)).toEqual([])
  })

  it('reads nothing past the last day a date holds', () => {
    const last = { now: new Date('9999-12-31T12:00:00Z'), timeZone: 'UTC' }
    expect(parseDatePhrase('until today', last)).toEqual([])
  })

  it.each<[string, typeof SYDNEY, DatePhraseSuggestion[]]>([
    [
      'from tomorrow to next fri',
      SYDNEY,
      one('3 to 9 Oct 2026', { start: '2026-10-03', end: '2026-10-09' })
    ],
    [
      'today and mon',
      SYDNEY,
      one('2 to 5 Oct 2026', { start: '2026-10-02', end: '2026-10-05' })
    ],
    // A weekday at the end is the first on or after the start.
    [
      'tomorrow to fri',
      SYDNEY,
      one('3 to 9 Oct 2026', { start: '2026-10-03', end: '2026-10-09' })
    ],
    [
      'from tomorrow to fri',
      SYDNEY,
      one('3 to 9 Oct 2026', { start: '2026-10-03', end: '2026-10-09' })
    ],
    [
      'fri to mon',
      WEDNESDAY,
      one('2 to 5 Oct 2026', { start: '2026-10-02', end: '2026-10-05' })
    ],
    [
      'sun to sat',
      SYDNEY,
      one('4 to 10 Oct 2026', { start: '2026-10-04', end: '2026-10-10' })
    ],
    ['tomorrow to yesterday', SYDNEY, []],
    [
      'today to next fri',
      WEDNESDAY,
      [
        {
          label: '30 Sept to 9 Oct 2026',
          value: { start: '2026-09-30', end: '2026-10-09' }
        },
        {
          label: '30 Sept to 2 Oct 2026',
          value: { start: '2026-09-30', end: '2026-10-02' }
        }
      ]
    ]
  ])('reads "%s" as the days between, in order', (text, options, expected) => {
    expect(parseDatePhrase(text, options)).toEqual(expected)
  })

  it.each(['mar 1-14', '1-14 mar', 'mar 1 - 14', '1st–14th mar'])(
    'reads "%s", days joined by a dash, as the days between',
    (text) => {
      expect(parseDatePhrase(text, SYDNEY)).toEqual(
        one('1 to 14 Mar 2027', { start: '2027-03-01', end: '2027-03-14' })
      )
    }
  )

  it('reads a dashed range with its year', () => {
    expect(parseDatePhrase('mar 1-14 2028', SYDNEY)).toEqual(
      one('1 to 14 Mar 2028', { start: '2028-03-01', end: '2028-03-14' })
    )
  })

  it('keeps "from" to "to" a range', () => {
    expect(parseDatePhrase('from 1 to 14 mar', SYDNEY)).toEqual(
      one('1 to 14 Mar 2027', { start: '2027-03-01', end: '2027-03-14' })
    )
  })

  it('completes the day being typed, as a completion', () => {
    const [after] = parseDatePhrase('after tomo', SYDNEY)
    expect(after).toEqual({
      label: 'After Sat 3 Oct 2026',
      value: { after: '2026-10-03' }
    })
    expect(isDatePhraseCompletion(after!)).toBe(true)
    expect(
      isDatePhraseCompletion(parseDatePhrase('after today', SYDNEY)[0]!)
    ).toBe(false)
  })

  it('stays linear on a long run of onwards', () => {
    const text = 'today' + ' onwards'.repeat(20_000)
    const started = performance.now()
    expect(parseDatePhrase(text, SYDNEY)).toEqual([])
    expect(performance.now() - started).toBeLessThan(500)
  })

  it('stays linear on a long run of comparison words', () => {
    const text = 'after '.repeat(20_000) + 'today'
    const started = performance.now()
    expect(parseDatePhrase(text, SYDNEY)).toEqual([])
    expect(performance.now() - started).toBeLessThan(500)
  })
})

describe('parseDatePhrase: times', () => {
  it.each([
    ['7:30pm', '19:30', '7:30pm'],
    ['7:30 pm', '19:30', '7:30pm'],
    ['7.30pm', '19:30', '7:30pm'],
    ['7pm', '19:00', '7pm'],
    ['7 am', '07:00', '7am'],
    ['19:30', '19:30', '7:30pm'],
    ['09:05', '09:05', '9:05am'],
    ['12pm', '12:00', '12pm'],
    ['12am', '00:00', '12am'],
    ['noon', '12:00', '12pm'],
    ['midnight', '00:00', '12am']
  ])('%s', (text, time, label) => {
    expect(parseDatePhrase(text, SYDNEY)).toEqual(one(label, { time }))
  })
})

describe('parseDatePhrase: input size', () => {
  it('stays linear on a long run of separators', () => {
    const text = `a to ${'a to '.repeat(20_000)}`
    const started = performance.now()
    expect(parseDatePhrase(text, SYDNEY)).toEqual([])
    expect(performance.now() - started).toBeLessThan(200)
  })
})

describe('parseDatePhrase: nothing to offer', () => {
  it.each([
    '',
    '   ',
    'gibberish',
    '31 feb',
    '29 feb 2027',
    '13/13',
    'next 0 days',
    'next 99999999999999999999999 days',
    'next 99999999 days',
    'last 99999999',
    '25:00',
    '13pm',
    'between 14 and 1 mar 2027',
    'in 0 days',
    'in 9999 years',
    'in 2 fortnights',
    'end of days',
    'today to this',
    'x'
  ])('%j', (text) => {
    expect(parseDatePhrase(text, SYDNEY)).toEqual([])
  })
})
