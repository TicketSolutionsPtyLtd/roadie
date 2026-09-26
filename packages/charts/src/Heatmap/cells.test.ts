import { describe, expect, it } from 'vitest'

import { heatBuckets, heatCells } from './cells'
import { sectionPaceExample, whenFansBuyExample } from './examples'

describe('heatCells', () => {
  it('maps the largest value to the last sequential step and zero to the first', () => {
    const cells = heatCells(whenFansBuyExample)
    expect(cells.find((c) => c.value === 42)!.step).toBe(8)
    expect(heatBuckets('sequential')).toHaveLength(9)
    expect(
      heatCells({
        ...whenFansBuyExample,
        data: [
          { weekday: 'Mon', hour: '9am', orders: 0 },
          { weekday: 'Mon', hour: '12pm', orders: 5 }
        ]
      })[0]!.bucket
    ).toBe('heat-0')
  })

  it('centres diverging values on zero, cool for ahead', () => {
    const cells = heatCells(sectionPaceExample)
    expect(cells.find((c) => c.value === 0.12)!.bucket).toBe('diverge-0')
    expect(cells.find((c) => c.value === -0.08)!.step).toBeGreaterThan(4)
    expect(heatBuckets('diverging')[4]).toBe('diverge-4')
  })

  it('skips cells with no number', () => {
    expect(
      heatCells({
        data: [{ r: 'a', c: 'x', v: null }],
        rows: 'r',
        columns: 'c',
        value: 'v'
      })
    ).toEqual([])
  })

  it('gives all-zero data the first step, never NaN', () => {
    const cells = heatCells({
      data: [
        { r: 'a', c: 'x', v: 0 },
        { r: 'a', c: 'y', v: 0 }
      ],
      rows: 'r',
      columns: 'c',
      value: 'v'
    })
    expect(cells.map((c) => c.bucket)).toEqual(['heat-0', 'heat-0'])
  })
})
