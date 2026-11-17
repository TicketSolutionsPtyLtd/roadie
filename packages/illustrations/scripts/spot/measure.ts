import { BOX, type FillLayer, type Layer, STROKE } from './format.ts'
import {
  type Cubic,
  filledLeft,
  pointAt,
  polygons,
  tangentAt,
  toCubics
} from './geometry.ts'
import { PK, type Path, parse } from './pathkit.ts'

type Point = [number, number]

// 5-point Gauss–Legendre is exact for the degree-8 polynomials a cubic's moments give.
const GAUSS: [number, number][] = [
  [0, 128 / 225],
  [-0.5384693101056831, 0.4786286704993665],
  [0.5384693101056831, 0.4786286704993665],
  [-0.906179845938664, 0.2369268850561891],
  [0.906179845938664, 0.2369268850561891]
]

/** Signed area and first moments of one closed contour, by Green's theorem. */
function moments(contour: Cubic[]) {
  let area = 0
  let mx = 0
  let my = 0
  for (const cubic of contour)
    for (const [g, w] of GAUSS) {
      const [x, y] = pointAt(cubic, (g + 1) / 2)
      const [dx, dy] = tangentAt(cubic, (g + 1) / 2)
      const k = w / 2
      area += k * (x * dy - y * dx) * 0.5
      mx += k * x * x * dy * 0.5
      my -= k * y * y * dx * 0.5
    }
  return { area, mx, my }
}

export type Region = { area: number; cx: number; cy: number }

/**
 * The filled area of a path and its centroid. Simplified first, a path's
 * contours don't overlap, so each one adds its area when the filled side is
 * on its left and takes it away when it's on its right.
 */
export function region(path: Path): Region {
  const simple = path.copy()
  simple.simplify()
  const contours = toCubics(simple).filter((c) => c.length > 0)
  const polys = polygons(simple)
  let area = 0
  let mx = 0
  let my = 0
  contours.forEach((contour) => {
    const m = moments(contour)
    const sign = filledLeft(contour, polys) ? 1 : -1
    area += sign * m.area
    mx += sign * m.mx
    my += sign * m.my
  })
  simple.delete()
  return area > 1e-9
    ? { area, cx: mx / area, cy: my / area }
    : { area: 0, cx: 0, cy: 0 }
}

export type Measurements = {
  /** Painted area over the box's area. */
  coverage: number
  /** Each layer's visible share of the painted area, Stroke included. */
  shares: Partial<Record<FillLayer | 'Stroke', number>>
  /** The art's extent, from its geometry, as `spot:convert` fits it. */
  bounds: { minX: number; minY: number; maxX: number; maxY: number }
  longSide: number
  shortSide: number
  /** How far the visible Shadow's centre sits from the rest of the art's. */
  shadowOffset: Point | null
  /** Path commands in each layer. */
  commands: Partial<Record<FillLayer | 'Stroke', number>>
}

// Stroking every subpath at once leaves overlapping outlines that Skia can't
// simplify, so each is stroked alone and unioned.
function strokeArea(d: string) {
  const area = PK.NewPath()
  for (const sub of parse(d)
    .toSVGString()
    .match(/M[^M]*/g) ?? []) {
    const line = parse(sub)
    line.stroke({
      width: STROKE.width,
      join: PK.StrokeJoin.ROUND,
      cap: PK.StrokeCap.ROUND
    })
    area.op(line, PK.PathOp.UNION)
    line.delete()
  }
  return area
}

/** What a source's layers paint, measured from their geometry. */
export function measure(layers: Layer[]): Measurements {
  const fills = layers.filter(
    (l): l is Layer & { name: FillLayer } => l.name !== 'Stroke'
  )
  const stroke = layers.find((l) => l.name === 'Stroke')
  const fillPaths = fills.map((l) => {
    const p = parse(l.d)
    p.setFillType(PK.FillType.EVENODD)
    if (!p.simplify()) throw new Error(`${l.name} doesn't simplify`)
    return p
  })
  const strokePath = stroke ? strokeArea(stroke.d) : PK.NewPath()

  const painted = strokePath.copy()
  for (const p of fillPaths) painted.op(p, PK.PathOp.UNION)
  const total = region(painted).area

  const visible = fillPaths.map((p, i) => {
    const v = p.copy()
    for (const above of [...fillPaths.slice(i + 1), strokePath])
      v.op(above, PK.PathOp.DIFFERENCE)
    return v
  })
  const regions = visible.map(region)
  const shares: Measurements['shares'] = {}
  fills.forEach((l, i) => {
    shares[l.name] = (shares[l.name] ?? 0) + regions[i]!.area / total
  })
  if (stroke) shares.Stroke = region(strokePath).area / total

  const shadowAt = fills.findIndex((l) => l.name === 'Shadow')
  let shadowOffset: Point | null = null
  if (shadowAt !== -1 && regions[shadowAt]!.area > 0) {
    const rest = PK.NewPath()
    visible.forEach((v, i) => i !== shadowAt && rest.op(v, PK.PathOp.UNION))
    const r = region(rest)
    rest.delete()
    const s = regions[shadowAt]!
    if (r.area > 0) shadowOffset = [s.cx - r.cx, s.cy - r.cy]
  }

  const geometry = layers.map((l) => parse(l.d))
  const b = geometry.map((p) => p.computeTightBounds())
  const bounds = {
    minX: Math.min(...b.map((v) => v.fLeft)),
    minY: Math.min(...b.map((v) => v.fTop)),
    maxX: Math.max(...b.map((v) => v.fRight)),
    maxY: Math.max(...b.map((v) => v.fBottom))
  }
  const width = bounds.maxX - bounds.minX
  const height = bounds.maxY - bounds.minY
  const commands: Measurements['commands'] = {}
  layers.forEach((l, i) => {
    commands[l.name] = geometry[i]!.toCmds().length
  })

  for (const p of [...fillPaths, ...visible, ...geometry, strokePath, painted])
    p.delete()

  return {
    coverage: total / (BOX * BOX),
    shares,
    bounds,
    longSide: Math.max(width, height),
    shortSide: Math.min(width, height),
    shadowOffset,
    commands
  }
}
