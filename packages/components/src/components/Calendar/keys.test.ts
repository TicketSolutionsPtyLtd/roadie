import { describe, expect, it } from 'vitest'

import { dateForKey } from './keys'

// 14 March 2027 is a Sunday.
const SUNDAY = '2027-03-14'

describe('dateForKey', () => {
  it.each([
    ['ArrowLeft', false, '2027-03-13'],
    ['ArrowRight', false, '2027-03-15'],
    ['ArrowUp', false, '2027-03-07'],
    ['ArrowDown', false, '2027-03-21'],
    ['PageUp', false, '2027-02-14'],
    ['PageDown', false, '2027-04-14'],
    ['PageUp', true, '2026-03-14'],
    ['PageDown', true, '2028-03-14'],
    ['Home', false, '2027-03-08'],
    ['End', false, '2027-03-14']
  ])('%s (shift %s) moves to %s', (key, shiftKey, expected) => {
    expect(dateForKey(key, SUNDAY, { shiftKey, weekStart: 1 })).toBe(expected)
  })

  it('takes Home and End from the week start', () => {
    expect(dateForKey('Home', SUNDAY, { weekStart: 7 })).toBe(SUNDAY)
    expect(dateForKey('End', SUNDAY, { weekStart: 7 })).toBe('2027-03-20')
  })

  it('mirrors the arrows right to left', () => {
    expect(dateForKey('ArrowLeft', SUNDAY, { rtl: true })).toBe('2027-03-15')
    expect(dateForKey('ArrowRight', SUNDAY, { rtl: true })).toBe('2027-03-13')
  })

  it('keeps the last day when a month is shorter', () => {
    expect(dateForKey('PageDown', '2027-01-31', {})).toBe('2027-02-28')
  })

  it('ignores other keys', () => {
    expect(dateForKey('a', SUNDAY, {})).toBeNull()
    expect(dateForKey('Enter', SUNDAY, {})).toBeNull()
  })
})
