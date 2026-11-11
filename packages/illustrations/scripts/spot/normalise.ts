import { type CustomPlugin, optimize } from 'svgo'

import {
  BOX,
  FILL_LAYERS,
  type FillLayer,
  type Layer,
  OUTLINE_COLOUR,
  OUTLINE_WIDTH,
  STROKE
} from './format.ts'
import {
  clipOutside,
  grow,
  pathData,
  runsInside,
  shrink,
  union
} from './geometry.ts'
import { PK, type Path, parse } from './pathkit.ts'

type Item =
  | { kind: 'fill'; layer: FillLayer | 'Outline'; d: string; evenOdd: boolean }
  | { kind: 'stroke'; d: string; width: number }

export type Report = {
  layers: Layer[]
  /** Strokes that sat under a fill and were cut back to what showed. */
  clippedStrokes: number
  /** How far the art was shrunk and moved to leave room for the outline. */
  fit: { scale: number; dx: number; dy: number } | null
  strokeWidths: number[]
}

function hex(colour: string) {
  const c = colour.toLowerCase()
  const full = /^#[0-9a-f]{3}$/.test(c)
    ? `#${[...c.slice(1)].map((v) => v + v).join('')}`
    : c
  if (!/^#[0-9a-f]{6}$/.test(full))
    throw new Error(`${colour} isn't a colour the converter reads; use hex`)
  return full
}

function distance(a: string, b: string) {
  const rgb = (h: string) =>
    [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
  const [x, y] = [rgb(hex(a)), rgb(hex(b))]
  return Math.hypot(...x.map((v, i) => v - y[i]!))
}

// Wide enough for the near-misses drawn by hand (#ffc9b0 for #ffc3a8), far narrower than the gap between any two layers.
const PALETTE_TOLERANCE = 40

const OUTLINE_MATCH = 8

function layerFor(colour: string): FillLayer | 'Outline' {
  if (distance(colour, OUTLINE_COLOUR) < OUTLINE_MATCH) return 'Outline'
  const [nearest] = (Object.entries(FILL_LAYERS) as [FillLayer, string][])
    .map(([name, c]) => [name, distance(colour, c)] as const)
    .sort((a, b) => a[1] - b[1])
  if (!nearest || nearest[1] > PALETTE_TOLERANCE)
    throw new Error(`${colour} isn't a spot illustration colour`)
  return nearest[0]
}

const NOT_ALLOWED = new Set([
  'clipPath',
  'mask',
  'linearGradient',
  'radialGradient',
  'pattern',
  'image',
  'text',
  'filter',
  'use'
])

// Shapes inside these are only drawn where something references them.
const NOT_PAINTED = new Set(['defs', 'symbol'])

const INHERITED = ['fill', 'fill-rule', 'stroke', 'stroke-width'] as const
// What SVG paints when nothing sets these.
const INITIAL_PAINT: Record<string, string> = { fill: '#000' }

/** Every painted shape, in paint order, with a path's fill and stroke as separate items. */
function readItems(svg: string): Item[] {
  const items: Item[] = []
  const paint = new WeakMap<object, Record<string, string>>()
  const unpainted = new WeakSet<object>()
  const collect: CustomPlugin = {
    name: 'collectPaintOrder',
    fn: () => ({
      element: {
        enter(node, parent) {
          if (NOT_PAINTED.has(node.name) || unpainted.has(parent)) {
            unpainted.add(node)
            return
          }
          const inherited = {
            ...(paint.get(parent) ?? INITIAL_PAINT),
            ...Object.fromEntries(
              INHERITED.flatMap((k) =>
                node.attributes[k] === undefined
                  ? []
                  : [[k, node.attributes[k]]]
              )
            )
          }
          paint.set(node, inherited)
          const a = { ...node.attributes, ...inherited }
          if (NOT_ALLOWED.has(node.name))
            throw new Error(
              `<${node.name}> isn't supported; flatten it to plain paths`
            )
          if (a['clip-path'] || a.mask || a.filter)
            throw new Error("clip paths, masks, and filters aren't supported")
          if (a.opacity || a['fill-opacity'] || a['stroke-opacity'])
            throw new Error('every layer is opaque; remove the opacity')
          if (node.name !== 'path') return
          if (a.transform)
            throw new Error('a transform was left on a path; flatten it')
          const fill = a.fill && a.fill !== 'none' ? a.fill : null
          const stroke = a.stroke && a.stroke !== 'none' ? a.stroke : null
          if (!a.d) return
          if (fill)
            items.push({
              kind: 'fill',
              layer: layerFor(fill),
              d: a.d,
              evenOdd: a['fill-rule'] === 'evenodd'
            })
          if (stroke && distance(stroke, OUTLINE_COLOUR) >= OUTLINE_MATCH) {
            if (distance(stroke, STROKE.colour) > PALETTE_TOLERANCE)
              throw new Error(`stroke ${stroke} isn't the stroke colour`)
            items.push({
              kind: 'stroke',
              d: a.d,
              width: Number(a['stroke-width'] ?? 1)
            })
          }
        }
      }
    })
  }
  optimize(svg, {
    plugins: [
      'removeDoctype',
      'removeXMLProcInst',
      'removeComments',
      'removeMetadata',
      'removeEditorsNSData',
      'inlineStyles',
      'convertStyleToAttrs',
      // Hex only, so a colour never comes out as a name like `red`.
      { name: 'convertColors', params: { shortname: false } },
      { name: 'convertShapeToPath', params: { convertArcs: true } },
      'moveGroupAttrsToElems',
      'convertTransform',
      collect
    ]
  })
  return items
}

function toPath(item: { d: string; evenOdd?: boolean }) {
  const p = parse(item.d)
  p.setFillType(item.evenOdd ? PK.FillType.EVENODD : PK.FillType.WINDING)
  return p
}

const NUMBER = String.raw`[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?`
const LEADING_MOVE = new RegExp(
  String.raw`^\s*m\s*(${NUMBER})[\s,]*(${NUMBER})[\s,]*`
)

/**
 * Path data that still starts in place once joined after another stroke. A
 * leading `m` is absolute only at the start of a path, and the pairs after it
 * are relative lines, so they get an `l`. The rest is kept as written, arcs
 * included, rather than rewritten as PathKit's curves.
 */
export function absoluteStart(d: string) {
  const move = LEADING_MOVE.exec(d)
  if (!move) return d.trim()
  const [matched, x, y] = move
  const rest = d.slice(matched.length).trimEnd()
  return `M${x} ${y}${/^[\d.+-]/.test(rest) ? 'l' : ''}${rest}`
}

// A stroke lying on a shape's edge is drawn twice, once by each shape; only a fill reaching past it buries it.
const EDGE_TOLERANCE = 0.05
// Cut a buried stroke this far short of the covering edge, so its round cap ends inside that shape's own stroke.
const CUT_SHORT = 0.2

/**
 * Turns any SVG drawn in the spot illustration colours into one path per
 * layer, without changing what shows.
 *
 * Fills merge into their layer's first appearance; a shape that joins a layer
 * further down is first cut out of every layer in between, since it covered
 * them. Strokes merge into one Stroke on top, each cut back to the part no
 * fill above it hid.
 */
export function normalise(svg: string): Report {
  const items = readItems(svg)
  const layers: { name: FillLayer; path: Path }[] = []
  const strokes: string[] = []
  const strokeWidths = new Set<number>()
  let clippedStrokes = 0

  items.forEach((item, i) => {
    if (item.kind === 'stroke') {
      strokeWidths.add(item.width)
      const fillsAbove = items
        .slice(i + 1)
        .filter((it) => it.kind === 'fill' && it.layer !== 'Outline')
      const covering = union(fillsAbove.map(toPath))
      const line = parse(item.d)
      const core = covering && shrink(covering.copy(), EDGE_TOLERANCE)
      if (covering && core && runsInside(line, core)) {
        clippedStrokes++
        strokes.push(clipOutside(line, grow(covering, CUT_SHORT)))
      } else {
        strokes.push(absoluteStart(item.d))
      }
      for (const p of [line, core, covering]) p?.delete()
      return
    }
    if (item.layer === 'Outline') return
    const shape = toPath(item)
    const at = layers.findIndex((l) => l.name === item.layer)
    if (at === -1) {
      shape.simplify()
      layers.push({ name: item.layer, path: shape })
      return
    }
    for (const above of layers.slice(at + 1))
      above.path.op(shape, PK.PathOp.DIFFERENCE)
    layers[at]!.path.op(shape, PK.PathOp.UNION)
    shape.delete()
  })

  if (!layers.length)
    throw new Error("there's nothing filled; draw the art in the layer colours")
  if (!strokes.length)
    throw new Error(
      `there are no lines; every spot illustration has a Stroke in ${STROKE.colour}`
    )
  const strokePath = parse(strokes.join(''))
  const fit = fitInside([...layers.map((l) => l.path), strokePath])
  const result: Layer[] = [
    ...layers.map((l) => {
      const simplified = l.path.simplify()
      return { name: l.name, d: simplified ? pathData(simplified) : '' }
    }),
    {
      name: 'Stroke' as const,
      d: fit ? pathData(strokePath) : strokes.join('')
    }
  ].filter((l) => l.d !== '')
  for (const l of layers) l.path.delete()
  strokePath.delete()
  return {
    layers: result,
    clippedStrokes,
    fit,
    strokeWidths: [...strokeWidths]
  }
}

// Art within this of the limit is left alone: the outline's own antialiasing hides it.
const FIT_TOLERANCE = 0.05

export function bounds(paths: Path[]) {
  const all = paths.map((p) => p.computeTightBounds())
  return {
    minX: Math.min(...all.map((b) => b.fLeft)),
    minY: Math.min(...all.map((b) => b.fTop)),
    maxX: Math.max(...all.map((b) => b.fRight)),
    maxY: Math.max(...all.map((b) => b.fBottom))
  }
}

/** Shrinks art that would push its outline out of the box, about its own centre, then nudges it back inside. */
function fitInside(paths: Path[]) {
  const { minX, minY, maxX, maxY } = bounds(paths)
  const lo = OUTLINE_WIDTH
  const hi = BOX - OUTLINE_WIDTH
  const fits = (min: number, max: number) =>
    min >= lo - FIT_TOLERANCE && max <= hi + FIT_TOLERANCE
  if (fits(minX, maxX) && fits(minY, maxY)) return null
  const scale = Math.min(
    1,
    (hi - lo) / (maxX - minX),
    (hi - lo) / (maxY - minY)
  )
  const shift = (min: number, max: number) => {
    const c = (min + max) / 2
    const a = c + (min - c) * scale
    const b = c + (max - c) * scale
    return a < lo ? lo - a : b > hi ? hi - b : 0
  }
  const dx = shift(minX, maxX)
  const dy = shift(minY, maxY)
  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2
  for (const p of paths)
    p.transform(
      scale,
      0,
      cx - cx * scale + dx,
      0,
      scale,
      cy - cy * scale + dy,
      0,
      0,
      1
    )
  return { scale: +scale.toFixed(4), dx: +dx.toFixed(3), dy: +dy.toFixed(3) }
}

// SVGO's types allow only undefined, which brings back the default; null is what turns arcs off.
const ARCS_OFF = null as unknown as undefined

/** A spot illustration's source file: one path per layer, named by its id. */
export function toSvg(layers: Layer[]) {
  const paths = layers.map(({ name, d }) =>
    name === 'Stroke'
      ? `<path id="Stroke" stroke="${STROKE.colour}" stroke-width="${STROKE.width}" stroke-linecap="round" stroke-linejoin="round" d="${d}"/>`
      : `<path id="${name}" fill="${FILL_LAYERS[name]}" fill-rule="evenodd" d="${d}"/>`
  )
  return optimize(
    `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 ${BOX} ${BOX}">${paths.join('')}</svg>`,
    {
      multipass: true,
      // 0.01 of the 48 grid is under 0.03px even at 128px.
      floatPrecision: 2,
      plugins: [
        {
          name: 'preset-default',
          params: {
            overrides: {
              cleanupIds: false,
              mergePaths: false,
              // At 2 decimals, curves rewritten as arcs drift enough to show.
              convertPathData: { makeArcs: ARCS_OFF }
            }
          }
        }
      ],
      js2svg: { pretty: true, indent: 2, eol: 'lf', finalNewline: true }
    }
  ).data
}
