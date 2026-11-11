import type { Point } from '../geometry.ts'
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
