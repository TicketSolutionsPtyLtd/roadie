import { describe, expect, it } from 'vitest'

import { formatTime, readTime, stepTime } from './readTime'

describe('readTime', () => {
  it.each([
    ['', null],
    ['7:30pm', '19:30'],
    ['7.30 pm', '19:30'],
    ['7pm', '19:00'],
    ['19:30', '19:30'],
    ['09:05', '09:05'],
    ['noon', '12:00'],
    ['midnight', '00:00']
  ])('%j is %j', (text, value) => {
    expect(readTime(text)).toEqual({ value })
  })

  it.each(['14 mar', 'today', '25:00', '13pm', 'soon'])(
    '%j is not a time',
    (text) => {
      expect(readTime(text)).toEqual({ error: 'Enter a time, like 7:30pm' })
    }
  )

  it('gives a 24-hour example on a 24-hour clock', () => {
    expect(readTime('soon', { hourCycle: 24 })).toEqual({
      error: 'Enter a time, like 19:30'
    })
  })

  it('keeps to the minute step', () => {
    expect(readTime('7:45pm', { minuteStep: 15 })).toEqual({ value: '19:45' })
    expect(readTime('7:32pm', { minuteStep: 15 })).toEqual({
      error: 'Choose a time in 15-minute steps'
    })
  })
})

describe('formatTime', () => {
  it.each([
    ['19:30', 12, '7:30pm'],
    ['19:00', 12, '7:00pm'],
    ['00:15', 12, '12:15am'],
    ['19:30', 24, '19:30'],
    ['07:05', 24, '07:05']
  ] as const)('%s on a %i-hour clock is %s', (time, hourCycle, text) => {
    expect(formatTime(time, { hourCycle })).toBe(text)
  })

  it('reads back what it shows', () => {
    for (const hourCycle of [12, 24] as const) {
      expect(readTime(formatTime('19:30', { hourCycle }))).toEqual({
        value: '19:30'
      })
    }
  })
})

describe('a minute step that is not a whole number of 1 or more', () => {
  it('reads as 1', () => {
    expect(readTime('7:32pm', { minuteStep: 0 })).toEqual({ value: '19:32' })
    expect(stepTime('19:30', 1, 0)).toBe('19:31')
  })
})

describe('stepTime', () => {
  it.each([
    ['19:30', 1, 15, '19:45'],
    ['19:30', -1, 15, '19:15'],
    ['19:32', 1, 15, '19:45'],
    ['19:32', -1, 15, '19:30'],
    ['23:50', 1, 15, '00:00'],
    ['00:00', -1, 15, '23:45'],
    ['09:59', 1, 1, '10:00']
  ] as const)('%s by %i of %i is %s', (time, direction, step, next) => {
    expect(stepTime(time, direction, step)).toBe(next)
  })
})
