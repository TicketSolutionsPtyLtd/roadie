import { describe, expect, it } from 'vitest'

import { barYExtent, toBars } from './bars'
import { onSaleExample, scanRateExample } from './examples'

describe('toBars', () => {
  it('sorts by x and keeps missing values as empty bars', () => {
    const bars = toBars({
      data: [
        { day: '2026-10-03', orders: 3 },
        { day: '2026-10-01', orders: null },
        { day: '2026-10-02', orders: 2 }
      ],
      x: 'day',
      y: 'orders'
    })
    expect(bars.map((b) => b.key)).toEqual([
      '2026-10-01',
      '2026-10-02',
      '2026-10-03'
    ])
    expect(bars[0]!.y).toBeNull()
  })

  it('adds up rows that share an x, as one bar', () => {
    const bars = toBars({
      data: [
        { day: '2026-10-01', orders: 3 },
        { day: '2026-10-02', orders: 2 },
        { day: '2026-10-01T00:00', orders: 4 },
        { day: '2026-10-02', orders: null }
      ],
      x: 'day',
      y: 'orders'
    })
    expect(bars.map((b) => [b.key, b.y])).toEqual([
      ['2026-10-01', 7],
      ['2026-10-02', 2]
    ])
    expect(
      toBars({
        data: [
          { channel: 'Email', orders: 3 },
          { channel: 'Email', orders: 5 }
        ],
        x: 'channel',
        y: 'orders'
      }).map((b) => b.y)
    ).toEqual([8])
  })

  it('carries the line measure', () => {
    expect(
      toBars(scanRateExample).every((b) => typeof b.line === 'number')
    ).toBe(true)
  })

  it('starts the value axis at zero', () => {
    expect(barYExtent(onSaleExample)[0]).toBe(0)
    expect(
      barYExtent({
        data: [
          { d: '2026-10-01', v: 500 },
          { d: '2026-10-02', v: 520 }
        ],
        x: 'd',
        y: 'v'
      })[0]
    ).toBe(0)
  })
})
