// @vitest-environment node
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { check } from '../check.ts'
import { DRAWINGS } from '../draw.ts'
import { region } from '../measure.ts'
import { template } from '../new.ts'
import { bounds, normalise, toSvg } from '../normalise.ts'
import {
  draw,
  ease,
  ellipse,
  extrude,
  fit,
  intersect,
  letterSide,
  path,
  polygon,
  rect,
  rotate,
  scale,
  subtract,
  tangent,
  translate,
  union
} from './index.ts'

const area = (...paths: Parameters<typeof union>) =>
  region(union(...paths)).area
const facing = (faces: { normal: [number, number] }[]) =>
  faces.map((f) => f.normal.map((n) => Math.round(n * 100) / 100 + 0))

describe('extrude', () => {
  it('sweeps a square into a hexagon, with a face either side of the corner it turns', () => {
    const square = rect(0, 0, 10, 10)
    const { back, faces } = extrude(square, [2, 2])
    expect(faces.map((f) => f.layer)).toEqual(['Shadow', 'Shadow'])
    expect(facing(faces)).toEqual(
      expect.arrayContaining([
        [1, 0],
        [0, 1]
      ])
    )
    expect(area(square, back, ...faces.map((f) => f.path))).toBeCloseTo(140, 3)
  })

  it('draws no face behind the front: edges facing away from the vector stay hidden', () => {
    const { faces } = extrude(rect(0, 0, 10, 10), [-2, 2])
    expect(facing(faces)).toEqual(
      expect.arrayContaining([
        [-1, 0],
        [0, 1]
      ])
    )
  })

  it.each([
    ['a sharp corner', 0, 2],
    ['an eased corner, as the letters have', 0.6, 2],
    ['a rounded corner, which reads as one surface', 4, 1]
  ])('splits the sides at %s into %i face(s)', (_, radius, count) => {
    const { faces } = extrude(rect(0, 0, 20, 20, radius), [3, 3])
    expect(faces).toHaveLength(count)
  })

  it('gives an ellipse one face, from tangent to tangent', () => {
    expect(extrude(ellipse(0, 0, 10, 6), [3, 3]).faces).toHaveLength(1)
  })

  it('sweeps a circle into a capsule, its face ending where the sides run parallel to the vector', () => {
    const circle = ellipse(0, 0, 10)
    const { back, faces } = extrude(circle, [3, 4])
    const swept = area(circle, back, ...faces.map((f) => f.path))
    expect(swept).toBeCloseTo(100 * Math.PI + 2 * 10 * 5, 0)
  })

  it('paints the faces further along the vector, nearer the viewer, last', () => {
    const step = polygon([
      [0, 0],
      [10, 0],
      [10, 10],
      [20, 10],
      [20, 20],
      [0, 20]
    ])
    const { faces } = extrude(step, [3, 3])
    expect(faces.map((f) => bounds([f.path]).minX)).toEqual([10, 0, 20])
  })

  it('makes the walls of a hole Detail, and the outside Shadow', () => {
    const ring = subtract(rect(0, 0, 30, 30), rect(10, 10, 10, 10))
    const { faces } = extrude(ring, [3, 3])
    expect(faces.filter((f) => f.hole).map((f) => f.layer)).toEqual([
      'Detail',
      'Detail'
    ])
    expect(faces.filter((f) => !f.hole).map((f) => f.layer)).toEqual([
      'Shadow',
      'Shadow'
    ])
  })

  it('marks the walls that look sideways across a gap at more of the front', () => {
    const h = subtract(
      rect(0, 0, 30, 30),
      rect(10, -1, 10, 11),
      rect(10, 20, 10, 11)
    )
    const { faces } = extrude(h, [3, 3])
    const walls = faces.filter((f) => f.normal[0] > 0.99)
    expect(walls.map((f) => [bounds([f.path]).minX, f.notch])).toEqual(
      expect.arrayContaining([
        [10, true],
        [30, false]
      ])
    )
  })

  it.each([
    [
      'a counter wall',
      subtract(rect(0, 0, 30, 30), rect(10, 10, 10, 10)),
      10,
      'Detail'
    ],
    [
      'a notch wall',
      subtract(rect(0, 0, 30, 30), rect(10, 20, 10, 11)),
      10,
      'Detail'
    ],
    ['an outside wall', rect(0, 0, 30, 30), 30, 'Shadow']
  ])("gives %s facing right the letters' layer", (_, shape, x, layer) => {
    const { faces } = extrude(shape, [3, 3], { side: letterSide })
    const wall = faces.find(
      (f) => f.normal[0] > 0.99 && bounds([f.path]).minX === x
    )
    expect(wall?.layer).toBe(layer)
  })

  it("makes the letters' undersides Detail", () => {
    const { faces } = extrude(rect(0, 0, 10, 10), [3, 3], { side: letterSide })
    expect(faces.find((f) => f.normal[1] > 0.99)?.layer).toBe('Detail')
  })

  it('lets the drawing pick each side by its normal', () => {
    const { faces } = extrude(rect(0, 0, 10, 10), [2, 2], {
      side: ({ normal }) => (normal[1] > normal[0] ? 'Detail' : 'Shadow')
    })
    const bottom = faces.find((f) => f.normal[1] > 0.99)
    const right = faces.find((f) => f.normal[0] > 0.99)
    expect([bottom?.layer, right?.layer]).toEqual(['Detail', 'Shadow'])
  })
})

describe('fit', () => {
  it.each([
    ['grows small art', rect(0, 0, 4, 2)],
    ['shrinks large art', rect(-50, 10, 200, 60)]
  ])('%s so its long side spans 2 to 46, centred', (_, shape) => {
    fit([shape])
    const b = bounds([shape])
    expect([b.minX, b.maxX]).toEqual([
      expect.closeTo(2, 4),
      expect.closeTo(46, 4)
    ])
    expect((b.minY + b.maxY) / 2).toBeCloseTo(24, 4)
  })

  it('centres tall art across, its height spanning 2 to 46', () => {
    const tall = rect(0, 0, 2, 4)
    fit([tall])
    const b = bounds([tall])
    expect([b.minY, b.maxY]).toEqual([
      expect.closeTo(2, 4),
      expect.closeTo(46, 4)
    ])
    expect((b.minX + b.maxX) / 2).toBeCloseTo(24, 4)
  })

  it('counts lines that bound no fill', () => {
    const face = rect(0, 0, 10, 10)
    const mark = polygon([
      [0, 0],
      [20, 0],
      [20, 0.1]
    ])
    fit([face, mark])
    expect(bounds([mark]).maxX).toBeCloseTo(46, 4)
  })
})

describe('shapes', () => {
  it('rounds each corner as a quarter circle, inside the shape', () => {
    const rounded = rect(0, 0, 10, 10, 2)
    const b = bounds([rounded])
    expect([b.minX, b.minY, b.maxX, b.maxY]).toEqual([0, 0, 10, 10])
    expect(region(rounded).area).toBeCloseTo(100 - (4 - Math.PI) * 4, 2)
  })

  it('caps a radius at half the edge, so an oversized one rounds a square into a circle', () => {
    const circle = rect(0, 0, 10, 10, 99)
    const b = bounds([circle])
    expect([b.minX, b.minY, b.maxX, b.maxY]).toEqual([0, 0, 10, 10])
    expect(region(circle).area).toBeCloseTo(25 * Math.PI, 1)
  })

  it.each([
    [
      'rotates about a point',
      rotate(rect(0, 0, 10, 2), 90, [5, 1]),
      [4, -4, 6, 6]
    ],
    [
      'scales about a point',
      scale(rect(0, 0, 10, 10), 2, [5, 5]),
      [-5, -5, 15, 15]
    ],
    ['translates', translate(rect(0, 0, 10, 10), 3, -2), [3, -2, 13, 8]],
    [
      'intersects',
      intersect(rect(0, 0, 10, 10), rect(5, 5, 10, 10)),
      [5, 5, 10, 10]
    ]
  ])('%s', (_, shape, expected) => {
    const b = bounds([shape])
    expect([b.minX, b.minY, b.maxX, b.maxY]).toEqual(
      expected.map((n) => expect.closeTo(n, 6))
    )
  })

  it('eases convex and concave corners by their own amounts', () => {
    const l = polygon([
      [0, 0],
      [10, 0],
      [10, 20],
      [20, 20],
      [20, 30],
      [0, 30]
    ])
    const eased = ease(l, 2, 1)
    const quarter = (r: number) => ((4 - Math.PI) * r * r) / 4
    // Five convex corners lose area and the one concave corner gains it.
    expect(region(eased).area).toBeCloseTo(
      region(l).area - 5 * quarter(2) + quarter(1),
      2
    )
    expect(bounds([eased])).toEqual(bounds([l]))
  })

  it('leaves smooth turns alone, so an already rounded shape keeps its curves', () => {
    const rounded = rect(0, 0, 10, 10, 3)
    expect(region(ease(rounded, 1)).area).toBeCloseTo(region(rounded).area, 4)
  })

  it('caps an ease at half of each edge', () => {
    const thin = ease(rect(0, 0, 10, 2), 5)
    expect(bounds([thin])).toEqual(bounds([rect(0, 0, 10, 2)]))
    expect(region(thin).area).toBeCloseTo(region(rect(0, 0, 10, 2, 1)).area, 2)
  })

  it.each([
    [
      'a point part way along it',
      polygon([
        [0, 0],
        [9.5, 0],
        [10, 0],
        [10, 10],
        [0, 10]
      ])
    ],
    ['a join Skia leaves', union(rect(0, 0, 10, 10), rect(9.7, 0, 0.3, 5))]
  ])('caps an ease by the whole edge, with %s', (_, square) => {
    const quarter = ((4 - Math.PI) * 2 * 2) / 4
    expect(region(ease(square, 2)).area).toBeCloseTo(100 - 4 * quarter, 2)
  })

  it.each([
    ['concave', 2, 0, -5, 0],
    ['convex', 0, 2, 0, 1]
  ])(
    'keeps %s corners sharp when their ease is 0',
    (_, convex, concave, convexCorners, concaveCorners) => {
      const l = polygon([
        [0, 0],
        [10, 0],
        [10, 20],
        [20, 20],
        [20, 30],
        [0, 30]
      ])
      const quarter = ((4 - Math.PI) * 2 * 2) / 4
      expect(region(ease(l, convex, concave)).area).toBeCloseTo(
        400 + (convexCorners + concaveCorners) * quarter,
        2
      )
    }
  )

  it('eases a corner beside a curve without moving the curve', () => {
    const half = intersect(ellipse(10, 10, 10), rect(0, 0, 10, 20))
    const quarter = (4 - Math.PI) / 4
    expect(region(ease(half, 1)).area).toBeCloseTo(
      region(half).area - 2 * quarter,
      2
    )
  })

  it('reads a join as smooth when a handle sits on its end point', () => {
    const shape = path('M0 0L10 0C20 0 20 10 20 10C20 10 20 20 10 20L0 20Z')
    const quarter = (4 - Math.PI) / 4
    expect(region(ease(shape, 1)).area).toBeCloseTo(
      region(shape).area - 2 * quarter,
      2
    )
  })

  it('eases a shape with a single corner', () => {
    const shape = polygon(
      [
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 10]
      ],
      [0, 5, 5, 5]
    )
    const quarter = (4 - Math.PI) / 4
    expect(region(ease(shape, 2)).area).toBeCloseTo(
      region(shape).area - 4 * quarter,
      2
    )
  })

  it('keeps the counter of a shape it eases', () => {
    const o = subtract(rect(0, 0, 30, 30), rect(10, 10, 10, 10))
    const quarter = (r: number) => ((4 - Math.PI) * r * r) / 4
    expect(region(ease(o, 2, 1)).area).toBeCloseTo(
      800 - 4 * quarter(2) + 4 * quarter(1),
      2
    )
  })

  it('refuses a tangent from a point inside the ellipse', () => {
    expect(() => tangent([1, 0], [0, 0], 5)).toThrow()
  })

  it('finds where a line from a point touches an ellipse', () => {
    const [a, b] = tangent([20, 0], [0, 0], 5, 10)
    for (const [x, y] of [a, b]) {
      expect((x / 5) ** 2 + (y / 10) ** 2).toBeCloseTo(1, 6)
      // The ellipse's normal at a tangent point is square to the line from the point.
      expect((x - 20) * (x / 25) + y * (y / 100)).toBeCloseTo(0, 6)
    }
  })
})

describe('draw', () => {
  it('writes an SVG that converts to a source passing the check, with no hidden lines left', () => {
    const { svg } = draw({
      parts: [
        {
          layer: 'Face',
          shape: subtract(rect(0, 0, 20, 30, 1), rect(6, 8, 8, 8))
        },
        { layer: 'Highlight', shape: rect(4, 20, 12, 4, 1), inner: true }
      ],
      vector: [3, 3]
    })
    const report = normalise(svg)
    expect(report.layers.map((l) => l.name)).toEqual([
      'Shadow',
      'Detail',
      'Face',
      'Highlight',
      'Stroke'
    ])
    expect(report.fit).toBeNull()
    expect(check(toSvg(report.layers), 'block.svg')).toEqual([])
  })

  it('keeps inner parts out of the silhouette, so they cast no extrusion', () => {
    const faces = (inner: boolean) =>
      draw({
        parts: [
          { layer: 'Face', shape: rect(0, 0, 20, 20) },
          { layer: 'Detail', shape: rect(5, 5, 30, 4), inner }
        ],
        vector: [3, 3]
      }).faces
    expect([faces(true), faces(false)]).toEqual([2, 5])
  })
})

describe('the spot:new template', () => {
  it('starts a drawing that draws and converts', async () => {
    const dir = mkdtempSync(join(DRAWINGS, '.template-'))
    try {
      const file = join(dir, 'block.ts')
      writeFileSync(
        file,
        template('block').replace('../scripts/', '../../scripts/')
      )
      const drawing = (await import(file)).default
      const { layers } = normalise(draw(drawing).svg)
      expect(check(toSvg(layers), 'block.svg')).toEqual([])
    } finally {
      rmSync(dir, { recursive: true })
    }
  })
})
