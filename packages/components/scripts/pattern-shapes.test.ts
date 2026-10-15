import { describe, expect, it } from 'vitest'

import { extractPattern, fieldOf, safeAreaOf } from './pattern-shapes.mjs'

const exported = `<svg width="547" height="1080" viewBox="0 0 547 1080" fill="none" xmlns="http://www.w3.org/2000/svg">
<rect width="547" height="1080" fill="#FBFCFF"/>
<g id="Patterns">
<path d="M-230 -905H4521Z" fill="white"/>
<path d="M-228 -907V-906Z" fill="black"/>
<g id="Slide / Left" clip-path="url(#clip0)">
<rect width="547" height="1080" fill="#0091EB"/>
<g id="Pattern right">
<path d="M10 20L30 40Z" fill="#C2DFFB"/>
<path d="M0 0C0 -10 20 -10 20 0Z" fill="#c2dffb"/>
</g></g></g></svg>`

describe('extractPattern', () => {
  it('keeps only the swirl paths and the field they span', () => {
    expect(extractPattern(exported)).toMatchObject({
      viewBox: '0 -8 30 48',
      paths: ['M10 20L30 40Z', 'M0 0C0 -10 20 -10 20 0Z']
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

  it('never bridges ground wider than it closes over', () => {
    const apart = [ring(0, 0, 500, 440), ring(1400, 0, 500, 440)]
    const [x, , width] = safeAreaOf(apart).split(' ').map(Number)
    expect(x! + width!).toBeLessThanOrEqual(500)
  })
})
