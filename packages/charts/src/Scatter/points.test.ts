import { describe, expect, it } from 'vitest'

import { portfolioExample } from './examples'
import { quadrantOf, scatterPoints } from './points'

describe('scatterPoints', () => {
  it('sizes points by area between 3px and 12px', () => {
    const points = scatterPoints(portfolioExample)
    const radii = points.map((p) => p.r)
    expect(Math.min(...radii)).toBeGreaterThanOrEqual(3)
    expect(Math.max(...radii)).toBe(12)
    const [big, small] = [points[1]!, points[5]!]
    const area = (r: number) => r ** 2 - 3 ** 2
    expect(area(small.r) / area(big.r)).toBeCloseTo(600 / 5000, 5)
  })

  it('gives every point one radius without a size field', () => {
    const radii = scatterPoints({ ...portfolioExample, size: undefined }).map(
      (p) => p.r
    )
    expect(new Set(radii).size).toBe(1)
  })

  it('marks highlighted points', () => {
    expect(
      scatterPoints(portfolioExample)
        .filter((p) => p.highlighted)
        .map((p) => p.name)
    ).toEqual(['Julia Jacklin', 'Genesis Owusu'])
  })

  it('drops rows missing either measure', () => {
    expect(
      scatterPoints({
        data: [
          { a: 1, b: null },
          { a: 'soon', b: 2 },
          { a: 2, b: 3 }
        ],
        x: 'a',
        y: 'b'
      })
    ).toEqual([
      expect.objectContaining({
        name: 'Point 3',
        xValue: 2,
        yValue: 3,
        index: 2
      })
    ])
  })

  it('places a point in its quadrant', () => {
    const quadrants = portfolioExample.quadrants!
    expect(
      scatterPoints(portfolioExample).map((p) => quadrantOf(p, quadrants))
    ).toEqual([
      'topRight',
      'topRight',
      'topRight',
      'topLeft',
      'bottomLeft',
      'bottomLeft'
    ])
  })
})
