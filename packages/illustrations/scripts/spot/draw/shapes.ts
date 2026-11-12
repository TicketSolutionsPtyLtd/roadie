import {
  type Cubic,
  type Point,
  inside,
  pointAt,
  polygons,
  split,
  tangentAt,
  toCubics
} from '../geometry.ts'
import { PK, type Path, parse } from '../pathkit.ts'

export type { Point }

// The cubic handle length that draws a quarter circle.
const KAPPA = 0.5522847498

const f = (n: number) => +n.toFixed(4)
const pt = ([x, y]: Point) => `${f(x)} ${f(y)}`

export function path(d: string) {
  return parse(d)
}

export function ellipse(cx: number, cy: number, rx: number, ry = rx) {
  const kx = rx * KAPPA
  const ky = ry * KAPPA
  return parse(
    `M${pt([cx + rx, cy])}` +
      `C${pt([cx + rx, cy + ky])} ${pt([cx + kx, cy + ry])} ${pt([cx, cy + ry])}` +
      `C${pt([cx - kx, cy + ry])} ${pt([cx - rx, cy + ky])} ${pt([cx - rx, cy])}` +
      `C${pt([cx - rx, cy - ky])} ${pt([cx - kx, cy - ry])} ${pt([cx, cy - ry])}` +
      `C${pt([cx + kx, cy - ry])} ${pt([cx + rx, cy - ky])} ${pt([cx + rx, cy])}Z`
  )
}

const towards = (a: Point, b: Point, by: number): Point => {
  const l = Math.hypot(b[0] - a[0], b[1] - a[1])
  const k = l ? Math.min(by, l / 2) / l : 0
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]
}

/**
 * A closed polygon, each corner rounded by its radius: how far the curve
 * starts back along each edge, capped at half the edge. A right angle rounds
 * to a quarter circle.
 */
export function polygon(points: Point[], radius: number | number[] = 0) {
  const radii = Array.isArray(radius) ? radius : points.map(() => radius)
  let d = ''
  points.forEach((p, i) => {
    const r = radii[i] ?? 0
    const prev = points[(i + points.length - 1) % points.length]!
    const next = points[(i + 1) % points.length]!
    if (!r) {
      d += `${i ? 'L' : 'M'}${pt(p)}`
      return
    }
    const a = towards(p, prev, r)
    const b = towards(p, next, r)
    const ca: Point = [
      a[0] + (p[0] - a[0]) * KAPPA,
      a[1] + (p[1] - a[1]) * KAPPA
    ]
    const cb: Point = [
      b[0] + (p[0] - b[0]) * KAPPA,
      b[1] + (p[1] - b[1]) * KAPPA
    ]
    d += `${i ? 'L' : 'M'}${pt(a)}C${pt(ca)} ${pt(cb)} ${pt(b)}`
  })
  return parse(`${d}Z`)
}

/** A rectangle; `radius` is one for every corner, or top-left, top-right, bottom-right, bottom-left. */
export function rect(
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number | [number, number, number, number] = 0
) {
  return polygon(
    [
      [x, y],
      [x + width, y],
      [x + width, y + height],
      [x, y + height]
    ],
    radius
  )
}

function op(paths: Path[], kind: number) {
  const [first, ...rest] = paths
  if (!first) return PK.NewPath()
  const out = first.copy()
  for (const p of rest)
    if (!out.op(p, kind))
      throw new Error(
        "Skia couldn't combine these shapes; nudge one so their edges don't run together"
      )
  out.simplify()
  return out
}

export const union = (...paths: Path[]) => op(paths, PK.PathOp.UNION)
export const subtract = (from: Path, ...cut: Path[]) =>
  op([from, ...cut], PK.PathOp.DIFFERENCE)
export const intersect = (a: Path, b: Path) => op([a, b], PK.PathOp.INTERSECT)

function transformed(
  p: Path,
  a: number,
  b: number,
  c: number,
  d: number,
  e: number,
  g: number
) {
  const out = p.copy()
  out.transform(a, c, e, b, d, g, 0, 0, 1)
  return out
}

export const translate = (p: Path, dx: number, dy: number) =>
  transformed(p, 1, 0, 0, 1, dx, dy)

export function rotate(p: Path, degrees: number, [cx, cy]: Point = [0, 0]) {
  const r = (degrees * Math.PI) / 180
  const cos = Math.cos(r)
  const sin = Math.sin(r)
  return transformed(
    p,
    cos,
    sin,
    -sin,
    cos,
    cx - cos * cx + sin * cy,
    cy - sin * cx - cos * cy
  )
}

export const scale = (p: Path, k: number, [cx, cy]: Point = [0, 0]) =>
  transformed(p, k, 0, 0, k, cx - k * cx, cy - k * cy)

/**
 * The two points where lines from `from` touch an ellipse, so a straight side
 * can meet a round part without a corner.
 */
export function tangent(
  from: Point,
  [cx, cy]: Point,
  rx: number,
  ry = rx
): [Point, Point] {
  const u = (from[0] - cx) / rx
  const v = (from[1] - cy) / ry
  const d = u * u + v * v
  if (d <= 1) throw new Error('the point is inside the ellipse')
  const h = Math.sqrt(d - 1)
  return [1, -1].map((s) => {
    const x = (u - s * v * h) / d
    const y = (v + s * u * h) / d
    return [cx + x * rx, cy + y * ry] as Point
  }) as [Point, Point]
}

/** Turns sharper than this where two segments meet make a corner to ease. */
const EASE_TURN = (10 * Math.PI) / 180
const LENGTH_SAMPLES = 64

const unitOf = ([x, y]: Point): Point => {
  const l = Math.hypot(x, y) || 1
  return [x / l, y / l]
}

function lengths(c: Cubic) {
  const out = [0]
  let at = c[0]
  for (let k = 1; k <= LENGTH_SAMPLES; k++) {
    const p = pointAt(c, k / LENGTH_SAMPLES)
    out.push(out[k - 1]! + Math.hypot(p[0] - at[0], p[1] - at[1]))
    at = p
  }
  return out
}

/** The parameter `by` along a cubic's length, or back from its end when `by` is negative. */
function tAtLength(c: Cubic, by: number) {
  const ls = lengths(c)
  const total = ls.at(-1)!
  const target = by >= 0 ? by : total + by
  const k = ls.findIndex((l) => l >= target)
  if (k <= 0) return 0
  const span = ls[k]! - ls[k - 1]!
  return (k - 1 + (span ? (target - ls[k - 1]!) / span : 0)) / LENGTH_SAMPLES
}

function sliced(c: Cubic, t0: number, t1: number): Cubic {
  const right = t0 > 0 ? split(c, t0)[1] : c
  return t1 < 1 ? split(right, (t1 - t0) / (1 - t0))[0] : right
}

const straight = ([a, b, c, d]: Cubic) => {
  const l = Math.hypot(d[0] - a[0], d[1] - a[1])
  const off = ([x, y]: Point) =>
    Math.abs((d[0] - a[0]) * (y - a[1]) - (d[1] - a[1]) * (x - a[0])) / l
  return l > 0 && off(b) < 1e-6 && off(c) < 1e-6
}

/**
 * A shape with every corner eased, as the letters have them: each convex
 * corner by `convex` and each concave one by `concave`, measured back along
 * both edges and capped at half of each. So shapes can be cut and joined
 * sharp, then eased once.
 */
export function ease(shape: Path, convex: number, concave = convex) {
  const outline = shape.copy()
  outline.simplify()
  const polys = polygons(outline)
  let d = ''
  for (const contour of toCubics(outline)) {
    const segs = contour.filter(
      (c) => Math.hypot(c[3][0] - c[0][0], c[3][1] - c[0][1]) > 1e-6
    )
    const n = segs.length
    if (!n) continue
    const total = segs.map((c) => lengths(c).at(-1)!)
    // The ease at the corner each segment starts from.
    const radii = segs.map((c, i) => {
      const prev = segs[(i + n - 1) % n]!
      const a = unitOf(tangentAt(prev, 1))
      const b = unitOf(tangentAt(c, 0))
      const turn = Math.acos(
        Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1]))
      )
      if (turn < EASE_TURN) return 0
      const r = Math.min(
        convex,
        concave,
        total[(i + n - 1) % n]! / 2,
        total[i]! / 2
      )
      const across: Point = [
        (pointAt(prev, tAtLength(prev, -r))[0] +
          pointAt(c, tAtLength(c, r))[0]) /
          2,
        (pointAt(prev, tAtLength(prev, -r))[1] +
          pointAt(c, tAtLength(c, r))[1]) /
          2
      ]
      const want = inside(polys, across) ? convex : concave
      return Math.min(want, total[(i + n - 1) % n]! / 2, total[i]! / 2)
    })
    const trims = segs.map((c, i) => {
      const r1 = radii[(i + 1) % n]!
      return [
        radii[i] ? tAtLength(c, radii[i]!) : 0,
        r1 ? tAtLength(c, -r1) : 1
      ] as const
    })
    const pieces = segs.map((c, i) => sliced(c, ...trims[i]!))
    d += `M${pt(pieces[0]![0])}`
    pieces.forEach((c, i) => {
      d += straight(c) ? `L${pt(c[3])}` : `C${pt(c[1])} ${pt(c[2])} ${pt(c[3])}`
      const j = (i + 1) % n
      const r = radii[j]!
      if (!r) return
      // Taken from the whole segments: an ease can use up a short edge entirely.
      const a = unitOf(tangentAt(segs[i]!, trims[i]![1]))
      const b = unitOf(tangentAt(segs[j]!, trims[j]![0]))
      const next = pieces[j]![0]
      const k = r * KAPPA
      d += `C${pt([c[3][0] + a[0] * k, c[3][1] + a[1] * k])} ${pt([next[0] - b[0] * k, next[1] - b[1] * k])} ${pt(next)}`
    })
    d += 'Z'
  }
  outline.delete()
  return parse(d)
}
