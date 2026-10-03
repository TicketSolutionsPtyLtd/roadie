import { describe, expect, it } from 'vitest'

import { type SuggestDatesOptions, suggestDates } from './suggestDates'

// Sat 3 Oct 2026.
const SATURDAY: SuggestDatesOptions = { today: '2026-10-03' }

const dates = (text: string, options: SuggestDatesOptions = SATURDAY) =>
  suggestDates(text, options).map(({ label, start }) => [label, start])

describe('suggestDates: hints for an empty field', () => {
  it('shows what can be typed, each with its date', () => {
    expect(suggestDates('', SATURDAY)).toEqual([
      {
        key: '2026-10-03',
        label: 'Today',
        description: 'Sat 3 Oct 2026',
        start: '2026-10-03',
        end: '2026-10-03'
      },
      {
        key: '2026-10-04',
        label: 'Tomorrow',
        description: 'Sun 4 Oct 2026',
        start: '2026-10-04',
        end: '2026-10-04'
      },
      {
        key: '2026-10-09',
        label: 'Next Fri',
        description: 'Fri 9 Oct 2026',
        start: '2026-10-09',
        end: '2026-10-09'
      },
      {
        key: '2026-10-17',
        label: 'In 2 weeks',
        description: 'Sat 17 Oct 2026',
        start: '2026-10-17',
        end: '2026-10-17'
      },
      {
        key: '2026-10-31',
        label: 'End of month',
        description: 'Sat 31 Oct 2026',
        start: '2026-10-31',
        end: '2026-10-31'
      },
      {
        key: '2026-11-01',
        label: '1 Nov',
        description: 'Sun 1 Nov 2026',
        start: '2026-11-01',
        end: '2026-11-01'
      }
    ])
  })

  it('treats spaces alone as empty', () => {
    expect(dates('   ')).toEqual(dates(''))
  })

  it('leaves out dates that are disabled', () => {
    expect(
      dates('', { ...SATURDAY, disabled: { before: '2026-10-05' } })
    ).toEqual([
      ['Next Fri', '2026-10-09'],
      ['In 2 weeks', '2026-10-17'],
      ['End of month', '2026-10-31'],
      ['1 Nov', '2026-11-01']
    ])
    expect(
      dates('', { ...SATURDAY, disabled: { after: '2026-10-04' } })
    ).toEqual([
      ['Today', '2026-10-03'],
      ['Tomorrow', '2026-10-04']
    ])
  })

  it('offers nothing when every date is disabled', () => {
    expect(suggestDates('', { ...SATURDAY, disabled: () => true })).toEqual([])
  })

  it('reads today in the time zone', () => {
    // 12:30am Saturday in Sydney is still Friday evening in Perth.
    const now = new Date('2026-10-02T14:30:00Z')
    expect(
      suggestDates('', { now, timeZone: 'Australia/Sydney' })[0]?.start
    ).toBe('2026-10-03')
    expect(
      suggestDates('', { now, timeZone: 'Australia/Perth' })[0]?.start
    ).toBe('2026-10-02')
  })

  it('describes dates in the date style and locale', () => {
    expect(
      suggestDates('', { ...SATURDAY, dateStyle: 'medium' })[0]?.description
    ).toBe('3 Oct 2026')
  })
})

describe('suggestDates: as you type', () => {
  it.each<[string, [string, string][]]>([
    ['tom', [['Tomorrow', '2026-10-04']]],
    // On a Saturday, next Tue is the coming one, so it shows once.
    [
      'T',
      [
        ['Today', '2026-10-03'],
        ['Tomorrow', '2026-10-04'],
        ['Tue', '2026-10-06'],
        ['Thu', '2026-10-08']
      ]
    ],
    ['fr', [['Fri', '2026-10-09']]],
    ['next m', [['Next Mon', '2026-10-05']]],
    ['last fri', [['Last Fri', '2026-10-02']]],
    [
      '14',
      [
        ['14 Oct', '2026-10-14'],
        ['14 Nov', '2026-11-14'],
        ['14 Dec', '2026-12-14'],
        ['14 Jan', '2027-01-14'],
        ['14 Feb', '2027-02-14'],
        ['14 Mar', '2027-03-14']
      ]
    ],
    // A day number looks ahead: 2 Oct has passed and May reads as last May.
    [
      '2',
      [
        ['2 Nov', '2026-11-02'],
        ['2 Dec', '2026-12-02'],
        ['2 Jan', '2027-01-02'],
        ['2 Feb', '2027-02-02'],
        ['2 Mar', '2027-03-02'],
        ['2 Apr', '2027-04-02']
      ]
    ],
    ['14 ma', [['14 Mar', '2027-03-14']]],
    [
      'in an',
      [
        ['In a day', '2026-10-04'],
        ['In a week', '2026-10-10'],
        ['In a month', '2026-11-03'],
        ['In a year', '2027-10-03']
      ]
    ],
    [
      'in 2',
      [
        ['In 2 days', '2026-10-05'],
        ['In 2 weeks', '2026-10-17'],
        ['In 2 months', '2026-12-03'],
        ['In 2 years', '2028-10-03']
      ]
    ],
    ['in 1 w', [['In 1 week', '2026-10-10']]],
    [
      'end',
      [
        ['End of week', '2026-10-04'],
        ['End of month', '2026-10-31'],
        ['End of year', '2026-12-31']
      ]
    ]
  ])('%s', (text, expected) => {
    expect(dates(text)).toEqual(expected)
  })

  it('puts the typed date first, as the date it names', () => {
    expect(suggestDates('14 mar 2027', SATURDAY)).toEqual([
      {
        key: '2027-03-14',
        label: 'Sun 14 Mar 2027',
        start: '2027-03-14',
        end: '2027-03-14'
      }
    ])
  })

  it('keeps the words of a phrase typed in full', () => {
    expect(dates('in 2 weeks')).toEqual([['In 2 weeks', '2026-10-17']])
    expect(dates('end of month')).toEqual([['End of month', '2026-10-31']])
    expect(dates('Next Fri')).toEqual([['Next Fri', '2026-10-09']])
  })

  it('offers both readings of a word with two', () => {
    // Wed 30 Sep 2026: next week's Friday, then the coming one.
    expect(dates('next fri', { today: '2026-09-30' })).toEqual([
      ['Next Fri', '2026-10-09'],
      ['Fri 2 Oct 2026', '2026-10-02']
    ])
  })

  it('offers nothing for text that names no date', () => {
    expect(suggestDates('someday', SATURDAY)).toEqual([])
  })

  it('leaves out a typed date that is disabled', () => {
    expect(
      suggestDates('tomorrow', { ...SATURDAY, disabled: [{ dayOfWeek: [7] }] })
    ).toEqual([])
  })

  it('stops at the limit', () => {
    expect(suggestDates('14', { ...SATURDAY, limit: 2 })).toHaveLength(2)
  })

  it('reads its own hints in English whatever the locale', () => {
    // In Sesotho "Jan" is June, but the hint "1 Jan" means 1 January.
    expect(
      suggestDates('', { today: '2026-12-10', locale: 'st' }).at(-1)?.start
    ).toBe('2027-01-01')
  })

  it('reads a date shown in the locale', () => {
    expect(dates('14 mars 2027', { ...SATURDAY, locale: 'fr' })[0]).toEqual([
      'dim 14 mars 2027',
      '2027-03-14'
    ])
  })
})

describe('suggestDates: ranges', () => {
  const RANGES = { ...SATURDAY, ranges: true }

  it('leaves ranges out of a single date', () => {
    expect(suggestDates('this wee', SATURDAY)).toEqual([])
  })

  it('offers a range with the dates it covers', () => {
    expect(suggestDates('this wee', RANGES)).toEqual([
      {
        key: '2026-09-28/2026-10-04',
        label: 'This week',
        description: '28 Sept to 4 Oct 2026',
        start: '2026-09-28',
        end: '2026-10-04'
      },
      {
        key: '2026-10-03/2026-10-04',
        label: 'This weekend',
        description: '3 to 4 Oct 2026',
        start: '2026-10-03',
        end: '2026-10-04'
      }
    ])
  })

  it('describes a range in the date style', () => {
    expect(
      suggestDates('this weeke', { ...RANGES, dateStyle: 'long' })[0]
        ?.description
    ).toBe('Sat 3 to Sun 4 Oct 2026')
  })

  it('names a typed range by its dates', () => {
    expect(suggestDates('1 to 14 mar 2027', RANGES)).toEqual([
      {
        key: '2027-03-01/2027-03-14',
        label: '1 to 14 Mar 2027',
        start: '2027-03-01',
        end: '2027-03-14'
      }
    ])
  })

  it('leaves out ranges shorter or longer than allowed', () => {
    expect(
      dates('this wee', { ...RANGES, minDays: 3 }).map(([label]) => label)
    ).toEqual(['This week'])
    expect(
      dates('this wee', { ...RANGES, maxDays: 3 }).map(([label]) => label)
    ).toEqual(['This weekend'])
  })

  it('leaves out a range with a disabled end', () => {
    expect(
      dates('this wee', { ...RANGES, disabled: { before: '2026-10-01' } }).map(
        ([label]) => label
      )
    ).toEqual(['This weekend'])
  })

  it('leaves out open ranges and hour windows', () => {
    expect(suggestDates('upcoming', RANGES)).toEqual([])
    expect(suggestDates('next 3 hours', RANGES)).toEqual([])
  })
})
