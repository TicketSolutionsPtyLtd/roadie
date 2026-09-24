import { describe, expect, it } from 'vitest'

import {
  formatTimeTick,
  formatTimeTitle,
  hasTimeOfDay,
  isTimeField,
  parseX,
  spokenX,
  timeTicks
} from './time'

const DAY = 86_400_000

describe('time', () => {
  it('reads ISO dates as wall time and ignores offsets', () => {
    expect(parseX('2026-11-14')).toBe(Date.UTC(2026, 10, 14))
    expect(parseX('2026-11-14T19:30:00+10:00')).toBe(
      Date.UTC(2026, 10, 14, 19, 30)
    )
    expect(parseX(42)).toBe(42)
    expect(parseX('Email')).toBeNull()
    expect(parseX(null)).toBeNull()
  })

  it('knows a time field', () => {
    expect(isTimeField([{ d: '2026-11-14' }, { d: '2026-11-15' }], 'd')).toBe(
      true
    )
    expect(isTimeField([{ d: 'Mon' }], 'd')).toBe(false)
  })

  it('labels ticks in house formats', () => {
    expect(formatTimeTick(Date.UTC(2026, 10, 14), 30 * DAY)).toBe('14 Nov')
    expect(formatTimeTick(Date.UTC(2026, 10, 14, 19), DAY / 2)).toBe('7pm')
    expect(formatTimeTick(Date.UTC(2026, 10, 14, 19, 30), DAY / 2)).toBe(
      '7:30pm'
    )
  })

  it('titles and speaks a point', () => {
    expect(formatTimeTitle(Date.UTC(2026, 10, 27), false)).toBe('Fri 27 Nov')
    expect(spokenX(Date.UTC(2026, 2, 10), false)).toBe('Tuesday 10 March')
    expect(spokenX(Date.UTC(2026, 10, 14, 19, 30), true)).toBe(
      'Saturday 14 November, 7:30pm'
    )
  })

  it('spaces four ticks from start to end', () => {
    const ticks = timeTicks(0, 30 * DAY)
    expect(ticks).toHaveLength(4)
    expect(ticks[0]).toBe(0)
    expect(ticks[3]).toBe(30 * DAY)
  })

  it('knows when a value carries a time', () => {
    expect(hasTimeOfDay('2026-11-14T19:00')).toBe(true)
    expect(hasTimeOfDay('2026-11-14')).toBe(false)
  })
})
