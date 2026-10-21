import { describe, expect, it } from 'vitest'

import { formatX } from './xFormat'

describe('formatX', () => {
  it.each([
    [-30, '30 days before', '30d'],
    [-1, '1 day before', '1d'],
    [-1.5, '1 day 12 hours before', '1.5d'],
    [0, 'Event day', '0d'],
    [2, '2 days after', '+2d']
  ])('reads %s days out as "%s", ticked "%s"', (days, label, tick) => {
    expect(formatX(days, 'daysOut')).toBe(label)
    expect(formatX(days, 'daysOut', 'tick')).toBe(tick)
  })

  it.each([
    [19, 'Day 1, 7:00pm', '19:00'],
    [25, 'Day 1, 1:00am', '01:00'],
    [30, 'Day 2, 6:00am', 'Day 2'],
    [43.25, 'Day 2, 7:15pm', '19:15'],
    [6, 'Day 1, 6:00am', 'Day 1']
  ])(
    'reads %s hours into the event as "%s", ticked "%s"',
    (hours, label, tick) => {
      expect(formatX(hours, 'eventTime')).toBe(label)
      expect(formatX(hours, 'eventTime', 'tick')).toBe(tick)
    }
  )

  it('formats a plain number as its value format', () => {
    expect(formatX(1234, 'number')).toBe('1,234')
    expect(formatX(0.25, 'percent', 'tick')).toBe('25%')
    expect(formatX(12)).toBe('12')
  })

  it('says a missing value plainly', () => {
    expect(formatX(Number.NaN, 'daysOut')).toBe('Not available')
  })
})
