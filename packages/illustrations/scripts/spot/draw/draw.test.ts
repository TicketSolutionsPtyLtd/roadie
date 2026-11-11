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
  ellipse,
  extrude,
  fit,
  polygon,
  rect,
  subtract,
  tangent,
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
