import { describe, expect, it } from 'vitest'

import { formatMachine, zonedInstant } from './index'
import { type WallClock, clockInstant, wallInstant } from './zone'

describe('zonedInstant', () => {
  it.each([
    [
      'a venue time in a zone with no daylight saving',
      '2026-11-28T19:30',
      'Australia/Brisbane',
      '2026-11-28T09:30:00.000Z'
    ],
    [
      'a venue time with seconds',
      '2026-11-28T19:30:45',
      'Australia/Brisbane',
      '2026-11-28T09:30:45.000Z'
    ],
    [
      'a time the spring-forward jump skips, an hour later',
      '2026-10-04T02:30',
      'Australia/Sydney',
      '2026-10-03T16:30:00.000Z'
    ],
    [
      'a time the clocks going back repeat, the first time round',
      '2026-04-05T02:30',
      'Australia/Sydney',
      '2026-04-04T15:30:00.000Z'
    ]
  ])('reads %s as a Date', (_, wallTime, zone, instant) => {
    const date = zonedInstant(wallTime, zone)
    expect(date).toBeInstanceOf(Date)
    expect(date.toISOString()).toBe(instant)
  })

  it('feeds a formatter directly and formats back to the venue time', () => {
    const timeZone = 'Australia/Brisbane'
    const doors = zonedInstant('2026-11-27T19:30', timeZone)
    expect(formatMachine(doors, { timeZone, timeStyle: 'medium' })).toBe(
      '2026-11-27T19:30:00+10:00'
    )
  })

  it('takes only a string', () => {
    const clock = { date: '2026-11-28', hour: 19, minute: 30 }
    // @ts-expect-error the wall-clock object shape is internal
    expect(() => zonedInstant(clock, 'Australia/Sydney')).toThrow(RangeError)
  })

  it.each([
    ['a date with no time', '2026-11-28'],
    ['a space for the T', '2026-11-28 19:30'],
    ['a UTC designator', '2026-11-28T19:30Z'],
    ['an offset', '2026-11-28T19:30+10:00'],
    ['fractional seconds', '2026-11-28T19:30:00.000'],
    ['a date that does not exist', '2026-02-31T19:30'],
    ['hour 24', '2026-11-28T24:00'],
    ['minute 60', '2026-11-28T19:60'],
    ['second 60', '2026-11-28T19:30:60'],
    ['a human time', 'Sat 28 Nov, 7:30pm'],
    ['leading text', ' 2026-11-28T19:30']
  ])('rejects %s with a RangeError naming it', (_, wallTime) => {
    expect(() => zonedInstant(wallTime, 'Australia/Sydney')).toThrow(
      new RangeError(`Not an ISO wall time: '${wallTime}'`)
    )
  })
})

describe('a wall time daylight saving skips', () => {
  const timeZone = 'Australia/Sydney'
  const at = (hour: number, minute: number, second = 0): WallClock => ({
    date: '2026-10-04',
    hour,
    minute,
    second,
    millisecond: 0
  })
  const iso = (epoch: number) => new Date(epoch).toISOString()

  it('moves an event time on by the size of the jump', () => {
    expect(iso(clockInstant(at(2, 30), timeZone))).toBe(
      '2026-10-03T16:30:00.000Z'
    )
  })

  it('lands a records bound on the jump, so no instant falls before it', () => {
    expect(iso(wallInstant(at(2, 30), timeZone))).toBe(
      '2026-10-03T16:00:00.000Z'
    )
  })

  it('never puts a records bound after a later wall time', () => {
    expect(wallInstant(at(2, 59, 59), timeZone)).toBeLessThanOrEqual(
      wallInstant(at(3, 0), timeZone)
    )
  })
})
