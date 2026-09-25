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

  it('knows a wall time string', () => {
    expect(isWallTime('2026-11-14T10:00')).toBe(true)
    expect(isWallTime('Mon')).toBe(false)
    expect(isWallTime(3)).toBe(false)
  })
})
