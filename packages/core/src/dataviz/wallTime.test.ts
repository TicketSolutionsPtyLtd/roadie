import { describe, expect, it } from 'vitest'

import { isWallTime, parseWallTime } from './wallTime'

describe('parseWallTime', () => {
  it('reads the wall time written in the string and ignores an offset', () => {
    expect(parseWallTime('2026-11-14')).toBe(Date.UTC(2026, 10, 14))
    expect(parseWallTime('2026-11-14T19:30:00+10:00')).toBe(
      Date.UTC(2026, 10, 14, 19, 30)
    )
  })

  it('passes numbers through and refuses anything else', () => {
    expect(parseWallTime(42)).toBe(42)
    expect(parseWallTime(Number.NaN)).toBeNull()
    expect(parseWallTime('Email')).toBeNull()
    expect(parseWallTime(null)).toBeNull()
  })

  it('reads the whole string, so trailing text is not a date', () => {
    expect(parseWallTime('2026-11-14T19:30:00.000Z')).toBe(
      Date.UTC(2026, 10, 14, 19, 30)
    )
    expect(parseWallTime('2026-11-14 onwards')).toBeNull()
    expect(parseWallTime('2026-11-1422')).toBeNull()
    expect(parseWallTime('2026-11-14T19:30pm')).toBeNull()
  })

  it('reads a space separator, as warehouse exports write it', () => {
    expect(parseWallTime('2026-11-14 19:30')).toBe(
      Date.UTC(2026, 10, 14, 19, 30)
    )
    expect(parseWallTime('2026-11-14 19:30:00')).toBe(
      Date.UTC(2026, 10, 14, 19, 30)
    )
    expect(isWallTime('2026-11-14 19:30:00')).toBe(true)
    expect(parseWallTime('2026-11-14 25:00')).toBeNull()
    expect(parseWallTime('2026-02-31 19:30')).toBeNull()
    expect(parseWallTime('2026-11-14  19:30')).toBeNull()
    expect(parseWallTime(' 2026-11-14 19:30')).toBeNull()
    expect(parseWallTime('2026-11-14 19:30 onwards')).toBeNull()
  })

  it('refuses a date or time that does not exist instead of rolling over', () => {
    expect(parseWallTime('2026-02-31')).toBeNull()
    expect(parseWallTime('2026-13-01')).toBeNull()
    expect(parseWallTime('2026-11-14T25:00')).toBeNull()
    expect(parseWallTime('2028-02-29')).toBe(Date.UTC(2028, 1, 29))
  })

  it('keeps seconds and milliseconds', () => {
    expect(parseWallTime('2026-11-14T19:30:45')).toBe(
      Date.UTC(2026, 10, 14, 19, 30, 45)
    )
    expect(parseWallTime('2026-11-14 19:30:45.5')).toBe(
      Date.UTC(2026, 10, 14, 19, 30, 45, 500)
    )
    expect(parseWallTime('2026-11-14T19:30:45.123456Z')).toBe(
      Date.UTC(2026, 10, 14, 19, 30, 45, 123)
    )
  })

  it('refuses seconds that do not exist', () => {
    expect(parseWallTime('2026-11-14T19:30:99')).toBeNull()
    expect(parseWallTime('2026-11-14T19:30:60')).toBeNull()
    expect(isWallTime('2026-11-14 19:30:99')).toBe(false)
  })

  it('knows a wall time string', () => {
    expect(isWallTime('2026-11-14T10:00')).toBe(true)
    expect(isWallTime('Mon')).toBe(false)
    expect(isWallTime(3)).toBe(false)
    expect(isWallTime('2026-02-31')).toBe(false)
    expect(isWallTime('2026-11-14 onwards')).toBe(false)
  })
})
