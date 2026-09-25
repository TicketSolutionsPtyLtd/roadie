import { describe, expect, it } from 'vitest'

import { annotationsOnAxis, annotationsOnBars } from './annotations'
import { parseX } from './time'

const HOUR = 3_600_000
const hours = ['2026-08-03T09:00', '2026-08-03T10:00', '2026-08-03T12:00'].map(
  (key) => ({ key, x: parseX(key)! })
)
const onBars = (at: string | number) =>
  annotationsOnBars([{ at, label: 'On sale' }], hours, HOUR, 10).map((a) => a.x)

describe('annotationsOnBars', () => {
  it('snaps a wall time with an offset to the bar that holds it', () => {
    expect(onBars('2026-08-03T09:00:00+10:00')).toEqual(['2026-08-03T09:00'])
    expect(onBars('2026-08-03T10:45')).toEqual(['2026-08-03T10:00'])
  })

  it('snaps across a gap to the nearest bar', () => {
    expect(onBars('2026-08-03T11:50')).toEqual(['2026-08-03T12:00'])
  })

  it('drops a date outside hourly bars', () => {
    expect(onBars('2026-08-03')).toEqual([])
    expect(onBars('2026-08-04T09:00')).toEqual([])
    expect(onBars(42)).toEqual([])
  })

  it('matches category bars by name only', () => {
    const channels = ['Email', 'Social'].map((key) => ({ key, x: key }))
    expect(
      annotationsOnBars(
        [
          { at: 'Social', label: 'New ad' },
          { at: 'Radio', label: 'Missing' }
        ],
        channels,
        null,
        10
      ).map((a) => a.x)
    ).toEqual(['Social'])
  })
})

describe('annotationsOnAxis', () => {
  const domain = [parseX('2026-10-01')!, parseX('2026-10-15')!] as const

  it('places wall times inside the domain and drops the rest', () => {
    expect(
      annotationsOnAxis(
        [
          { at: '2026-10-05T19:30:00+10:00', label: 'Inside' },
          { at: '2026-11-01', label: 'After' },
          { at: 'soon', label: 'Junk' }
        ],
        domain,
        true,
        1
      ).map((a) => a.label)
    ).toEqual(['Inside'])
  })
})
