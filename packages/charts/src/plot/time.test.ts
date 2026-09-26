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

  it('spaces about four ticks from start to end', () => {
    const ticks = timeTicks(0, 30 * DAY)
    expect(ticks).toEqual([0, 10 * DAY, 20 * DAY, 30 * DAY])
  })

  it('ticks whole days on a short range and never repeats a label', () => {
    const start = Date.UTC(2026, 9, 1)
    const ticks = timeTicks(start, start + 2 * DAY)
    expect(ticks.every((t) => t % DAY === 0)).toBe(true)
    expect(ticks.map((t) => formatTimeTick(t, 2 * DAY))).toEqual([
      '1 Oct',
      '2 Oct',
      '3 Oct'
    ])
  })

  it('ticks whole hours within a day', () => {
    const start = Date.UTC(2026, 9, 1, 17, 30)
    const ticks = timeTicks(start, start + 5 * 3_600_000)
    expect(ticks.every((t) => t % 3_600_000 === 0)).toBe(true)
    expect(ticks.map((t) => formatTimeTick(t, DAY / 2))).toEqual([
      '6pm',
      '8pm',
      '10pm'
    ])
  })

  it('ticks every 6 or 12 hours across a day or two of timed data', () => {
    const start = Date.UTC(2026, 9, 1, 10)
    const span = 36 * 3_600_000
    const labels = timeTicks(start, start + span, { hasTime: true }).map((t) =>
      formatTimeTick(t, span)
    )
    expect(labels).toEqual(['12pm', '2 Oct', '12pm'])
    const day = 25 * 3_600_000
    expect(
      timeTicks(start, start + day, { hasTime: true }).map((t) =>
        formatTimeTick(t, day)
      )
    ).toEqual(['12pm', '6pm', '2 Oct', '6am'])
  })

  it('keeps whole days on a short range of dates', () => {
    const start = Date.UTC(2026, 9, 1)
    expect(timeTicks(start, start + 2 * DAY, { hasTime: false })).toEqual([
      start,
      start + DAY,
      start + 2 * DAY
    ])
  })

  it('drops a tick that would repeat a label', () => {
    const start = Date.UTC(2026, 9, 1)
    const labels = timeTicks(start, start + DAY).map((t) =>
      formatTimeTick(t, DAY)
    )
    expect(new Set(labels).size).toBe(labels.length)
  })

  it('knows when a value carries a time', () => {
    expect(hasTimeOfDay('2026-11-14T19:00')).toBe(true)
    expect(hasTimeOfDay('2026-11-14 19:00:00')).toBe(true)
    expect(hasTimeOfDay('2026-11-14')).toBe(false)
  })

  it('finds a time only in a whole wall time string', () => {
    expect(hasTimeOfDay('Doors 19:30')).toBe(false)
    expect(hasTimeOfDay('Set T19:30')).toBe(false)
    expect(hasTimeOfDay('2026-11-14 19:30 onwards')).toBe(false)
    expect(hasTimeOfDay('2026-11-14T25:00')).toBe(false)
    expect(hasTimeOfDay(20261114)).toBe(false)
  })

  it('keeps seconds in the plotted time and titles to the minute', () => {
    const ms = parseX('2026-11-14T19:30:45')
    expect(ms).toBe(Date.UTC(2026, 10, 14, 19, 30, 45))
    expect(hasTimeOfDay('2026-11-14T19:30:45')).toBe(true)
    expect(formatTimeTitle(ms!, true)).toBe('Sat 14 Nov, 7:30pm')
    expect(hasTimeOfDay('2026-11-14T19:30:99')).toBe(false)
  })

  it('plots a warehouse space separated time at its wall time', () => {
    expect(parseX('2026-11-14 19:30')).toBe(Date.UTC(2026, 10, 14, 19, 30))
    expect(isTimeField([{ at: '2026-11-14 19:30:00' }], 'at')).toBe(true)
  })
})
