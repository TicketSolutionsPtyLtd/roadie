import { describe, expect, it } from 'vitest'

import { joinValue, splitValue } from './value'

const MELBOURNE = 'Australia/Melbourne'

describe('splitValue', () => {
  it.each([
    [null, { date: null, time: null }],
    ['2026-11-27', { date: '2026-11-27', time: null }],
    ['2026-11-27T19:30', { date: '2026-11-27', time: '19:30' }],
    ['2026-11-27T19:30:00+11:00', { date: '2026-11-27', time: '19:30' }],
    // 8:30am UTC is 7:30pm in Melbourne the same day.
    ['2026-11-27T08:30:00Z', { date: '2026-11-27', time: '19:30' }],
    // Perth's 7:30pm is 10:30pm in Melbourne.
    ['2026-11-27T19:30:00+08:00', { date: '2026-11-27', time: '22:30' }],
    ['not a date', { date: null, time: null }]
  ])('%j', (value, parts) => {
    expect(splitValue(value, MELBOURNE)).toEqual(parts)
  })
})

describe('joinValue', () => {
  it('is the date alone at day granularity', () => {
    expect(
      joinValue({ date: '2026-11-27', time: '19:30' }, 'day', MELBOURNE)
    ).toBe('2026-11-27')
    expect(joinValue({ date: null, time: null }, 'day', MELBOURNE)).toBe(null)
  })

  it('is an instant with the zone’s offset at minute granularity', () => {
    expect(
      joinValue({ date: '2026-11-27', time: '19:30' }, 'minute', MELBOURNE)
    ).toBe('2026-11-27T19:30:00+11:00')
    expect(
      joinValue({ date: '2026-06-27', time: '19:30' }, 'minute', MELBOURNE)
    ).toBe('2026-06-27T19:30:00+10:00')
  })

  it('waits for both parts at minute granularity', () => {
    expect(
      joinValue({ date: '2026-11-27', time: null }, 'minute', MELBOURNE)
    ).toBe(null)
    expect(joinValue({ date: null, time: '19:30' }, 'minute', MELBOURNE)).toBe(
      null
    )
  })

  it('round-trips through splitValue', () => {
    const value = '2026-11-27T19:30:00+11:00'
    expect(joinValue(splitValue(value, MELBOURNE), 'minute', MELBOURNE)).toBe(
      value
    )
  })
})
