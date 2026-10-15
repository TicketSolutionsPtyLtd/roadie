import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import shapes from '../src/components/Pattern/shapes.json'
import {
  extractPattern,
  fieldOf,
  safeAreaOf,
  swirlAt
} from './pattern-shapes.mjs'

const exported = `<svg width="547" height="1080" viewBox="0 0 547 1080" fill="none" xmlns="http://www.w3.org/2000/svg">
<rect width="547" height="1080" fill="#FBFCFF"/>
<g id="Patterns">
<path d="M-230 -905H4521Z" fill="white"/>
<path d="M-228 -907V-906Z" fill="black"/>
<g id="Slide / Left" clip-path="url(#clip0)">
<rect width="547" height="1080" fill="#0091EB"/>
<g id="Pattern right">
<path d="M0 0L400 0L400 400L0 400Z" fill="#C2DFFB"/>
<path d="M0 0C0 -10 20 -10 20 0Z" fill="#c2dffb"/>
</g></g></g></svg>`

describe('extractPattern', () => {
  it('keeps only the swirl paths and the field they span', () => {
    expect(extractPattern(exported)).toMatchObject({
      viewBox: '0 -8 400 408',
      paths: ['M0 0L400 0L400 400L0 400Z', 'M0 0C0 -10 20 -10 20 0Z']
    })
  })

  it('refuses a transformed group, which would move the swirl off its field', () => {
    const moved = exported.replace(
      '<g id="Pattern right">',
      '<g id="Pattern right" transform="translate(4 0)">'
    )
    expect(() => extractPattern(moved)).toThrow(/transform/)
  })

  it('refuses a transformed swirl path', () => {
    const moved = exported.replace(
      'fill="#c2dffb"/>',
      'fill="#c2dffb" transform="scale(2)"/>'
    )
    expect(() => extractPattern(moved)).toThrow(/transform/)
  })

  it('refuses an export with no swirl paths', () => {
    expect(() =>
      extractPattern(exported.replaceAll(/#c2dffb/gi, '#000000'))
    ).toThrow(/no swirl/)
  })
})

describe('fieldOf', () => {
  it('bounds a curve by its outline, not its control points', () => {
    expect(fieldOf(['M0 0C0 -40 100 -40 100 0Z'])).toBe('0 -30 100 30')
  })

  it('rounds outward to whole pixels', () => {
    expect(fieldOf(['M0.5 0.5L9.2 9.2Z'])).toBe('0 0 10 10')
  })

  it('refuses a command it cannot bound', () => {
    expect(() => fieldOf(['M0 0Q5 5 10 0Z'])).toThrow(/command/)
  })

  it('refuses an implicitly repeated command', () => {
    expect(() => fieldOf(['M0 0L10 0 10 50Z'])).toThrow(/L has 4 numbers/)
  })
})

// A ring as one path: an outer and an inner circle, drawn with four cubic
// arcs each, wound opposite ways so the middle stays empty.
function ring(cx: number, cy: number, outer: number, inner: number) {
  const circle = (r: number, dir: 1 | -1) => {
    const k = 0.5523 * r
    const pts = [
      [cx + r, cy],
      [cx, cy + dir * r],
      [cx - r, cy],
      [cx, cy - dir * r]
    ]
    return (
      `M${pts[0]!.join(' ')}` +
      pts
        .map((_, i) => {
          const [ax, ay] = pts[i]!
          const [bx, by] = pts[(i + 1) % 4]!
          const [tax, tay] = [(-(ay - cy) / r) * dir, ((ax - cx) / r) * dir]
          const [tbx, tby] = [(-(by - cy) / r) * dir, ((bx - cx) / r) * dir]
          return `C${ax + k * tax} ${ay + k * tay} ${bx - k * tbx} ${by - k * tby} ${bx} ${by}`
        })
        .join('') +
      'Z'
    )
  }
  return circle(outer, 1) + circle(inner, -1)
}

describe('safeAreaOf', () => {
  const rings = [
    ring(0, 0, 500, 440),
    ring(0, 0, 380, 320),
    ring(0, 0, 260, 200)
  ]

  it('closes over the ground between rings, but stays inside the outer one', () => {
    const [x, y, width, height] = safeAreaOf(rings).split(' ').map(Number)
    for (const [cx, cy] of [
      [x, y],
      [x + width, y],
      [x, y + height],
      [x + width, y + height]
    ])
      expect(Math.hypot(cx!, cy!)).toBeLessThanOrEqual(500)
    // The largest square in a 500 circle is about 707 wide.
    expect(width).toBeGreaterThan(600)
    expect(height).toBeGreaterThan(600)
  })

  // A square frame of 50-wide bars with a slot in its right side. A narrow
  // slot is closed over, so the frame's inside counts; a wide one lets the
  // outside in.
  const frame = (slot: number) => [
    'M0 0L600 0L600 50L0 50Z',
    'M0 550L600 550L600 600L0 600Z',
    'M0 0L50 0L50 600L0 600Z',
    `M550 0L600 0L600 ${300 - slot / 2}L550 ${300 - slot / 2}Z`,
    `M550 ${300 + slot / 2}L600 ${300 + slot / 2}L600 600L550 600Z`
  ]

  it.each([
    [80, true],
    [160, false]
  ])('closes over a %i-wide slot: %s', (slot, closed) => {
    const [, , width, height] = safeAreaOf(frame(slot)).split(' ').map(Number)
    expect(Math.min(width!, height!) > 500).toBe(closed)
  })

  it('fills where subpaths of one path overlap, by the nonzero rule', () => {
    const overlapping = [
      'M0 0L400 0L400 400L0 400Z M200 0L600 0L600 400L200 400Z'
    ]
    const [, , width] = safeAreaOf(overlapping).split(' ').map(Number)
    expect(width).toBeGreaterThan(500)
  })

  it('refuses artwork with no area to show', () => {
    expect(() => safeAreaOf(['M0 0L1 0L1 1Z'])).toThrow(/no area/)
  })
})

// Swirl lines crossed along a line through the artwork, and the longest run
// of ground between them, in artwork units.
function crossings(
  isSwirl: (x: number, y: number) => boolean,
  [ax, ay]: number[],
  [bx, by]: number[]
) {
  const steps = Math.ceil(Math.hypot(bx! - ax!, by! - ay!) / 2)
  let lines = 0
  let onLine = false
  let ground = 0
  let longestGround = 0
  for (let i = 0; i <= steps; i++) {
    const line = isSwirl(
      ax! + ((bx! - ax!) * i) / steps,
      ay! + ((by! - ay!) * i) / steps
    )
    if (line && !onLine) lines++
    onLine = line
    ground = line ? 0 : ground + 2
    longestGround = Math.max(longestGround, ground)
  }
  return { lines, longestGround }
}

const edgesOf = (box: string) => {
  const [x, y, w, h] = box.split(' ').map(Number) as [
    number,
    number,
    number,
    number
  ]
  return [
    [
      [x, y],
      [x + w, y]
    ],
    [
      [x, y + h],
      [x + w, y + h]
    ],
    [
      [x, y],
      [x, y + h]
    ],
    [
      [x + w, y],
      [x + w, y + h]
    ]
  ]
}

describe('the committed artwork', () => {
  const isSwirl = swirlAt(shapes.paths)

  it('matches its export', () => {
    expect(
      extractPattern(
        readFileSync('src/components/Pattern/svgs/banner.svg', 'utf8')
      )
    ).toEqual(shapes)
  })

  // Along the safe area's edges the longest run of ground is about 320 units,
  // and the field's outside runs 446 or more, so 400 tells the two apart.
  it('has swirls crossing every edge of its safe area, with no outside ground', () => {
    for (const [from, to] of edgesOf(shapes.safe)) {
      const edge = crossings(isSwirl, from!, to!)
      expect(edge.lines).toBeGreaterThanOrEqual(4)
      expect(edge.longestGround).toBeLessThanOrEqual(400)
    }
  })

  it('shows outside ground along the edges of its whole field', () => {
    const runs = edgesOf(shapes.viewBox).map(
      ([from, to]) => crossings(isSwirl, from!, to!).longestGround
    )
    expect(Math.max(...runs)).toBeGreaterThan(400)
  })
})
