// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { check } from './check.ts'
import { absoluteStart, bounds, normalise, toSvg } from './normalise.ts'
import { PK, parse } from './pathkit.ts'

const SHADOW = '#0091EB'
const FACE = '#E1D1FB'
const DETAIL = '#FFC3A8'
const INK = '#1A1F2B'

const svg = (...paths: string[]) =>
  `<svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">${paths.join('')}</svg>`
const fill = (colour: string, d: string) => `<path d="${d}" fill="${colour}"/>`
const line = (d: string, width = 0.5) =>
  `<path d="${d}" stroke="${INK}" stroke-width="${width}"/>`
const rect = (x: number, y: number, w: number, h: number) =>
  `M${x} ${y}h${w}v${h}h-${w}z`

/** Whether a layer's fill covers a point, sampled through a tiny square there. */
function covers(d: string, x: number, y: number) {
  const layer = parse(d)
  layer.setFillType(PK.FillType.EVENODD)
  const dot = parse(rect(x - 0.01, y - 0.01, 0.02, 0.02))
  layer.op(dot, PK.PathOp.INTERSECT)
  const hit = layer.toSVGString() !== ''
  layer.delete()
  dot.delete()
  return hit
}

/** Whether a stroke's 0.5-wide line passes over a point. */
function inks(d: string, x: number, y: number) {
  const swept = parse(d)
  swept.stroke({
    width: 0.5,
    join: PK.StrokeJoin.ROUND,
    cap: PK.StrokeCap.ROUND
  })
  const hit = covers(swept.toSVGString(), x, y)
  swept.delete()
  return hit
}

const names = (s: string) => normalise(s).layers.map((l) => l.name)

describe('normalise', () => {
  it('names each layer by its colour, back to front, with Stroke last', () => {
    expect(
      names(
        svg(
          fill(SHADOW, rect(6, 6, 30, 30)),
          fill(FACE, rect(4, 4, 30, 30)),
          line(rect(4, 4, 30, 30))
        )
      )
    ).toEqual(['Shadow', 'Face', 'Stroke'])
  })

  it('merges shapes of one colour into one layer, where that colour first appears', () => {
    const { layers } = normalise(
      svg(
        fill(FACE, rect(4, 4, 10, 10)),
        fill(SHADOW, rect(20, 20, 10, 10)),
        fill(FACE, rect(34, 34, 10, 10)),
        line(rect(4, 4, 10, 10))
      )
    )
    expect(layers.map((l) => l.name)).toEqual(['Face', 'Shadow', 'Stroke'])
    const face = layers[0]!.d
    expect(covers(face, 9, 9)).toBe(true)
    expect(covers(face, 39, 39)).toBe(true)
  })

  it('cuts a shape out of the layers it moves beneath, so what shows is unchanged', () => {
    const { layers } = normalise(
      svg(
        fill(FACE, rect(4, 4, 10, 10)),
        fill(SHADOW, rect(10, 10, 20, 20)),
        fill(FACE, rect(20, 20, 6, 6)),
        line(rect(4, 4, 10, 10))
      )
    )
    const [face, shadow] = layers
    expect(covers(face!.d, 23, 23)).toBe(true)
    expect(covers(shadow!.d, 23, 23)).toBe(false)
    expect(covers(shadow!.d, 28, 28)).toBe(true)
  })

  it('keeps a stroke drawn with relative points where it was', () => {
    // SVGO writes paths like this: the points after a leading `m` are relative lines.
    const { layers } = normalise(
      svg(fill(FACE, rect(4, 4, 30, 30)), line('m4 30 10 0 0 -10'))
    )
    const stroke = layers.at(-1)!.d
    expect(inks(stroke, 9, 30)).toBe(true)
    expect(inks(stroke, 14, 25)).toBe(true)
    expect(inks(stroke, 7, 15)).toBe(false)
  })

  it('keeps a relative stroke where it was when it follows another stroke', () => {
    const { layers } = normalise(
      svg(
        fill(FACE, rect(4, 4, 30, 30)),
        line('M40 40h4'),
        line('m4 30 10 0 0 -10')
      )
    )
    const stroke = layers.at(-1)!.d
    expect(inks(stroke, 42, 40)).toBe(true)
    expect(inks(stroke, 9, 30)).toBe(true)
    expect(inks(stroke, 14, 25)).toBe(true)
  })

  it('keeps the arcs of a stroke, so a circle stays a few bytes', () => {
    const { layers } = normalise(
      svg(
        fill(FACE, rect(4, 4, 8, 8)),
        `<circle cx="30" cy="30" r="8" stroke="${INK}" stroke-width=".5"/>`,
        line('m20 10a3 3 0 0 1 6 0')
      )
    )
    const stroke = layers.at(-1)!.d
    expect(inks(stroke, 30, 22)).toBe(true)
    expect(inks(stroke, 23, 7)).toBe(true)
    expect(stroke.length).toBeLessThan(80)
    expect(check(toSvg(layers), 'circle.svg')).toEqual([])
  })

  it('merges every stroke into one Stroke on top', () => {
    const { layers } = normalise(
      svg(
        line(rect(4, 4, 10, 10)),
        fill(FACE, rect(4, 4, 10, 10)),
        line('M20 20L30 30')
      )
    )
    expect(layers.map((l) => l.name)).toEqual(['Face', 'Stroke'])
    expect(inks(layers[1]!.d, 25, 25)).toBe(true)
    expect(inks(layers[1]!.d, 4, 9)).toBe(true)
  })

  it('cuts a stroke back where a fill above it hid it', () => {
    const report = normalise(
      svg(
        fill(SHADOW, rect(4, 4, 20, 20)),
        line('M6 14H40'),
        fill(FACE, rect(20, 8, 12, 12)),
        line(rect(20, 8, 12, 12))
      )
    )
    const stroke = report.layers.at(-1)!.d
    expect(report.clippedStrokes).toBe(1)
    expect(inks(stroke, 10, 14)).toBe(true)
    expect(inks(stroke, 26, 14)).toBe(false)
    expect(inks(stroke, 36, 14)).toBe(true)
  })

  it('leaves a stroke alone when a fill above only meets its edge', () => {
    const report = normalise(
      svg(
        fill(SHADOW, rect(4, 4, 16, 16)),
        line(rect(4, 4, 16, 16)),
        fill(FACE, rect(20, 4, 16, 16)),
        line(rect(20, 4, 16, 16))
      )
    )
    expect(report.clippedStrokes).toBe(0)
  })

  it('shrinks art that would push its outline out of the box, and leaves art that fits', () => {
    const big = normalise(
      svg(fill(FACE, rect(0, 10, 48, 20)), line(rect(0, 10, 48, 20)))
    )
    expect(big.fit?.scale).toBeCloseTo(44 / 48, 3)
    const paths = big.layers.map((l) => parse(l.d))
    const { minX, maxX } = bounds(paths)
    for (const p of paths) p.delete()
    expect(minX).toBeCloseTo(2, 2)
    expect(maxX).toBeCloseTo(46, 2)

    expect(
      normalise(svg(fill(FACE, rect(2, 2, 44, 44)), line(rect(2, 2, 44, 44))))
        .fit
    ).toBeNull()
  })

  it('moves art that is small enough but too near an edge back inside, without shrinking it', () => {
    const { fit, layers } = normalise(
      svg(fill(FACE, rect(0, 10, 20, 20)), line(rect(0, 10, 20, 20)))
    )
    expect(fit?.scale).toBe(1)
    const paths = layers.map((l) => parse(l.d))
    const { minX, maxX } = bounds(paths)
    for (const p of paths) p.delete()
    expect(minX).toBeCloseTo(2, 2)
    expect(maxX).toBeCloseTo(22, 2)
  })

  it("drops the white outline, written either way, since it's drawn from the art", () => {
    for (const white of ['#FFFFFF', 'white', '#fff'])
      expect(
        names(
          svg(
            fill(white, rect(0, 0, 48, 48)),
            fill(FACE, rect(4, 4, 30, 30)),
            line(rect(4, 4, 30, 30))
          )
        )
      ).toEqual(['Face', 'Stroke'])
  })

  it('drops a white outline drawn as a stroke too', () => {
    expect(
      names(
        svg(
          `<path d="${rect(2, 2, 34, 34)}" stroke="#fff" stroke-width="4"/>`,
          fill(FACE, rect(4, 4, 30, 30)),
          line(rect(4, 4, 30, 30))
        )
      )
    ).toEqual(['Face', 'Stroke'])
  })

  it("ignores shapes in <defs> and <symbol>, which aren't painted where they're written", () => {
    expect(
      names(
        svg(
          `<defs>${fill(SHADOW, rect(4, 4, 10, 10))}</defs>`,
          `<symbol id="s">${fill(DETAIL, rect(4, 4, 10, 10))}</symbol>`,
          fill(FACE, rect(4, 4, 30, 30)),
          line(rect(4, 4, 30, 30))
        )
      )
    ).toEqual(['Face', 'Stroke'])
  })

  it('takes the fill and fill rule a group passes down to its shapes', () => {
    const { layers } = normalise(
      svg(
        `<g fill="${FACE}" fill-rule="evenodd"><path d="${rect(4, 4, 20, 20)}${rect(10, 10, 8, 8)}"/></g>`,
        line(rect(4, 4, 20, 20))
      )
    )
    expect(layers.map((l) => l.name)).toEqual(['Face', 'Stroke'])
    expect(covers(layers[0]!.d, 6, 6)).toBe(true)
    expect(covers(layers[0]!.d, 14, 14)).toBe(false)
  })

  it('takes a stroke a group passes down as a line', () => {
    const { layers, strokeWidths } = normalise(
      svg(
        fill(FACE, rect(4, 4, 10, 10)),
        `<g stroke="${INK}" stroke-width=".5"><path d="M20 20L30 30"/></g>`
      )
    )
    expect(inks(layers.at(-1)!.d, 25, 25)).toBe(true)
    expect(strokeWidths).toEqual([0.5])
  })

  it('takes near-miss colours as the nearest layer', () => {
    expect(
      names(svg(fill('#FFC9B0', rect(4, 4, 10, 10)), line(rect(4, 4, 10, 10))))
    ).toEqual(['Detail', 'Stroke'])
  })

  it.each([
    [
      'an off-palette colour',
      svg(fill('#FF0000', rect(4, 4, 10, 10))),
      "isn't a spot illustration colour"
    ],
    [
      'a shape with no fill, which paints black',
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path d="${rect(4, 4, 10, 10)}"/></svg>`,
      "isn't a spot illustration colour"
    ],
    [
      "path data that doesn't parse",
      svg(fill(FACE, 'M4 4h10v10H4z!')),
      "path data doesn't parse"
    ],
    [
      'a gradient',
      svg(
        '<defs><linearGradient id="g"/></defs>',
        fill('url(#g)', rect(4, 4, 10, 10))
      ),
      "url(#g) isn't a colour"
    ],
    [
      'a transform',
      svg(
        `<path d="${rect(4, 4, 10, 10)}" fill="${FACE}" transform="matrix(1 0 .5 1 0 0)"/>`
      ),
      'flatten'
    ],
    [
      'opacity',
      svg(`<path d="${rect(4, 4, 10, 10)}" fill="${FACE}" opacity=".5"/>`),
      'opaque'
    ],
    ['art with no lines', svg(fill(FACE, rect(4, 4, 10, 10))), 'no lines'],
    ['lines with no fills', svg(line(rect(4, 4, 10, 10))), 'nothing filled'],
    [
      'a clip path',
      svg(`<g clip-path="url(#c)">${fill(FACE, rect(4, 4, 10, 10))}</g>`),
      'clip paths'
    ]
  ])('rejects %s', (_, source, message) => {
    expect(() => normalise(source)).toThrow(message)
  })
})

describe('toSvg', () => {
  const source = toSvg(
    normalise(
      svg(
        fill(SHADOW, 'M6 6h30v30H6z'),
        fill(FACE, 'M4.123456 4h30v30H4z'),
        fill(DETAIL, rect(8, 8, 4, 4)),
        line('M4 4h30v30H4z')
      )
    ).layers
  )

  it('writes a source that passes the check', () => {
    expect(check(source, 'square.svg')).toEqual([])
  })

  it('writes one path per layer, named by its id', () => {
    expect([...source.matchAll(/<path id="(\w+)"/g)].map((m) => m[1])).toEqual([
      'Shadow',
      'Face',
      'Detail',
      'Stroke'
    ])
  })

  it('keeps 2 decimal places and no arcs', () => {
    const data = [...source.matchAll(/ d="([^"]+)"/g)]
      .map((m) => m[1])
      .join(' ')
    expect(data).toContain('4.12')
    expect(data).not.toMatch(/\d\.\d{3}/)
    expect(data).not.toMatch(/[aA]/)
  })
})

describe('absoluteStart', () => {
  it.each([
    ['  m4 30 10 0 0 -10 ', 'M4 30l10 0 0 -10'],
    ['m4,30-10,0', 'M4 30l-10,0'],
    ['m4.5.5.5.5', 'M4.5 .5l.5.5'],
    ['m1e1 2E-1 3 4', 'M1e1 2E-1l3 4'],
    ['m4 30h5z', 'M4 30h5z'],
    ['m4 30a3 3 0 0 1 6 0', 'M4 30a3 3 0 0 1 6 0'],
    ['M4 30 10 0', 'M4 30 10 0']
  ])('starts %j at its own point, as %j', (d, expected) => {
    expect(absoluteStart(d)).toBe(expected)
  })
})
