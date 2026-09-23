import { describe, expect, it } from 'vitest'

import { sparklineGeometry } from './geometry'

describe('sparklineGeometry', () => {
  it('maps the series left to right with padding', () => {
    const g = sparklineGeometry([0, 10, 5, 10, 20])!
    expect(g.points.split(' ')).toHaveLength(5)
    expect(g.end.x).toBe(100)
    expect(g.end.y).toBeGreaterThan(0)
    expect(g.end.y).toBeLessThan(15)
  })

  it('includes the reference in the domain', () => {
    const g = sparklineGeometry([10, 11, 12, 11, 12], 20)!
    expect(g.referenceY).toBeLessThan(g.end.y)
  })

  it('draws a flat series on the midline', () => {
    const g = sparklineGeometry([5, 5, 5, 5, 5])!
    expect(g.end.y).toBe(50)
  })

  it('drops non-finite points and returns null when too few remain', () => {
    expect(sparklineGeometry([1, Number.NaN, 2])).toBeNull()
    expect(
      sparklineGeometry([1, Number.NaN, 2, 3, 4, 5])!.points.split(' ')
    ).toHaveLength(5)
  })

  it('handles negative values', () => {
    const g = sparklineGeometry([-5, -2, 0, 3, -1])!
    expect(Number.isFinite(g.end.y)).toBe(true)
  })
})
