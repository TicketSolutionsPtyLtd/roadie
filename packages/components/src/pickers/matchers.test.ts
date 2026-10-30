import { describe, expect, it } from 'vitest'

import {
  type CalendarMatchers,
  matchesDate,
  modifierAttribute
} from './matchers'

describe('matchesDate', () => {
  const cases: [string, CalendarMatchers | undefined, string, boolean][] = [
    ['nothing', undefined, '2027-03-14', false],
    ['a date', '2027-03-14', '2027-03-14', true],
    ['another date', '2027-03-14', '2027-03-15', false],
    ['a list of dates', ['2027-03-01', '2027-03-14'], '2027-03-14', true],
    ['an empty list', [], '2027-03-14', false],
    [
      'a range, inside',
      { start: '2027-03-10', end: '2027-03-20' },
      '2027-03-14',
      true
    ],
    [
      'a range, at its start',
      { start: '2027-03-10', end: '2027-03-20' },
      '2027-03-10',
      true
    ],
    [
      'a range, at its end',
      { start: '2027-03-10', end: '2027-03-20' },
      '2027-03-20',
      true
    ],
    [
      'a range, outside',
      { start: '2027-03-10', end: '2027-03-20' },
      '2027-03-21',
      false
    ],
    [
      'a reversed range',
      { start: '2027-03-20', end: '2027-03-10' },
      '2027-03-14',
      true
    ],
    ['before, earlier', { before: '2027-03-14' }, '2027-03-13', true],
    ['before, the day itself', { before: '2027-03-14' }, '2027-03-14', false],
    ['after, later', { after: '2027-03-14' }, '2027-03-15', true],
    ['after, the day itself', { after: '2027-03-14' }, '2027-03-14', false],
    ['a weekday, Saturday', { dayOfWeek: [6, 7] }, '2027-03-13', true],
    ['a weekday, Monday', { dayOfWeek: [6, 7] }, '2027-03-15', false],
    ['a function', (date: string) => date.endsWith('-14'), '2027-03-14', true],
    [
      'a function, false',
      (date: string) => date.endsWith('-14'),
      '2027-03-15',
      false
    ],
    [
      'a mixed list',
      [{ before: '2027-03-01' }, { dayOfWeek: [1] }],
      '2027-03-15',
      true
    ]
  ]

  it.each(cases)('matches %s', (_, matchers, date, expected) => {
    expect(matchesDate(date, matchers)).toBe(expected)
  })
})

describe('modifierAttribute', () => {
  it.each([
    ['hasSession', 'data-has-session'],
    ['has-session', 'data-has-session'],
    ['soldOut', 'data-sold-out'],
    ['booked', 'data-booked']
  ])('names %s as %s', (name, attribute) => {
    expect(modifierAttribute(name)).toBe(attribute)
  })
})
