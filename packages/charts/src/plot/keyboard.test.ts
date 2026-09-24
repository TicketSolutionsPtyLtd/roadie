import { describe, expect, it } from 'vitest'

import { stepAlong, stepSeries } from './keyboard'

// y is the engine's pixel y, so a smaller y sits higher on screen.
const top = { xValue: 1, group: 'C', y: 10 }
const middle = { xValue: 1, group: 'B', y: 40 }
const bottom = { xValue: 1, group: 'A', y: 80 }
const alone = { xValue: 2, group: 'A', y: 70 }
const points = [bottom, middle, top, alone]

describe('stepSeries', () => {
  it('moves up to the series above and down to the one below at the same x', () => {
    expect(stepSeries(points, middle, -1)).toBe(top)
    expect(stepSeries(points, middle, 1)).toBe(bottom)
  })

  it('stops at the edge', () => {
    expect(stepSeries(points, top, -1)).toBeNull()
    expect(stepSeries(points, bottom, 1)).toBeNull()
    expect(stepSeries(points, alone, 1)).toBeNull()
  })

  it('finds nothing for a point that is not in the list', () => {
    expect(stepSeries([top, bottom], middle, 1)).toBeNull()
  })

  it('matches dates by time', () => {
    const upper = { xValue: new Date(2026, 10, 14), group: 'A', y: 10 }
    const lower = { xValue: new Date(2026, 10, 14), group: 'B', y: 50 }
    expect(stepSeries([upper, lower], upper, 1)).toBe(lower)
  })
})

describe('stepAlong', () => {
  const a0 = { markId: 'series-1', group: null, x: 0 }
  const a1 = { markId: 'series-1', group: null, x: 40 }
  const b0 = { markId: 'series-2', group: null, x: 0 }
  const b2 = { markId: 'series-2', group: null, x: 80 }
  const points = [a1, b0, a0, b2]

  it('moves along the same series in x order', () => {
    expect(stepAlong(points, a0, 1)).toBe(a1)
    expect(stepAlong(points, a1, -1)).toBe(a0)
    expect(stepAlong(points, b0, 1)).toBe(b2)
  })

  it('stops at the ends of the series', () => {
    expect(stepAlong(points, a1, 1)).toBeNull()
    expect(stepAlong(points, b0, -1)).toBeNull()
  })
})
