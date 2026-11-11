// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { layersOf } from './check.ts'
import { extrude, union } from './draw/index.ts'
import { sources } from './generate.ts'
import { measure, region } from './measure.ts'
import { PK, parse } from './pathkit.ts'

describe('region', () => {
  it.each([
    ['a square', 'M0 0H10V10H0Z', 100, [5, 5], false],
    [
      'a square with a hole wound against it',
      'M0 0H10V10H0Z M2 2V8H8V2Z',
      64,
      [5, 5],
      false
    ],
    [
      'a square with a hole, even-odd',
      'M0 0H10V10H0Z M2 2H8V8H2Z',
      64,
      [5, 5],
      true
    ],
    [
      'two squares that overlap',
      'M0 0H10V10H0Z M5 0H15V10H5Z',
      150,
      [7.5, 5],
      false
    ]
  ] as const)('measures %s', (_, d, area, [cx, cy], evenOdd) => {
    const path = parse(d)
    if (evenOdd) path.setFillType(PK.FillType.EVENODD)
    const r = region(path)
    expect(r.area).toBeCloseTo(area, 6)
    expect([r.cx, r.cy]).toEqual([expect.closeTo(cx, 6), expect.closeTo(cy, 6)])
  })

  it('measures a shape whose contours touch, where one probe of a side can land on the other contour', () => {
    const fills = layersOf(
      sources().find((s) => s.slug === 'ticket')!.svg
    ).filter((l) => l.name !== 'Stroke')
    const solid = (d: string) => {
      const p = parse(d)
      p.setFillType(PK.FillType.EVENODD)
      p.simplify()
      return p
    }
    const front = union(
      ...fills.filter((l) => l.name !== 'Shadow').map((l) => solid(l.d))
    )
    const { back, faces } = extrude(front, [1.25, 5])
    const all = union(...fills.map((l) => solid(l.d)))
    const swept = union(front, back, ...faces.map((f) => f.path))
    expect(region(swept).area).toBeGreaterThan(region(all).area)
  })

  it('measures a circle drawn in cubics to within their fit', () => {
    const k = 0.5523 * 10
    const circle = parse(
      `M10 0C10 ${k} ${k} 10 0 10C${-k} 10 -10 ${k} -10 0C-10 ${-k} ${-k} -10 0 -10C${k} -10 10 ${-k} 10 0Z`
    )
    expect(region(circle).area / (Math.PI * 100)).toBeCloseTo(1, 3)
  })
})

describe('measure', () => {
  const layers = [
    { name: 'Shadow' as const, d: 'M8 8H46V46H8Z' },
    { name: 'Face' as const, d: 'M2 2H40V40H2Z' },
    { name: 'Stroke' as const, d: 'M2 2H40V40H2Z' }
  ]

  it('splits what shows by layer, with lines taking their share off the fills under them', () => {
    const m = measure(layers)
    const total = 2 * 38 * 38 - 32 * 32
    // The line's outer half adds a sliver where the Face's top and left edges meet nothing.
    const outerHalf = 2 * 38 * 0.25
    expect(m.coverage).toBeCloseTo((total + outerHalf) / 48 / 48, 2)
    const sum = Object.values(m.shares).reduce((a, b) => a + b, 0)
    expect(sum).toBeCloseTo(1, 6)
    expect(m.shares.Stroke).toBeCloseTo((4 * 38 * 0.5) / total, 2)
  })

  it('reads the extent from the geometry, as the fit does', () => {
    expect(measure(layers)).toMatchObject({ longSide: 44, shortSide: 44 })
  })

  it('finds which way the shadow falls', () => {
    // The visible Shadow, an L from 8 to 46 less the Face, centres at 34.3; the Face at 21.
    const [dx, dy] = measure(layers).shadowOffset!
    expect(dx).toBeCloseTo(13.3, 0)
    expect(dy).toBeCloseTo(dx, 6)
  })
})
