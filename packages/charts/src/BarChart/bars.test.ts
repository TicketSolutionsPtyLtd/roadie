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
