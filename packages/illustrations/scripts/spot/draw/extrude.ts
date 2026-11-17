import type { FillLayer } from '../format.ts'
import {
  type Cubic,
  type Point,
  filledLeft,
  inside,
  pointAt,
  polygons,
  split,
  tangentAt,
  toCubics
} from '../geometry.ts'
import { PK, type Path, parse } from '../pathkit.ts'

/** One side of the extrusion: a run of the front's edge between corners, swept. */
export type Face = {
  layer: FillLayer
  path: Path
  /** Whether the edge belongs to a hole in the front, like a letter's counter. */
  hole: boolean
  /** The edge's average outward normal, unit length. */
  normal: Point
  /**
   * Whether the edge mostly looks sideways across a gap at more of the
   * front, as the walls of a counter or a notch do, like those between an
   * H's stems.
   */
  notch: boolean
}

export type SideRule = (face: {
  hole: boolean
  notch: boolean
  normal: Point
}) => FillLayer

export type ExtrudeOptions = {
  /** Picks each side's layer. By default a hole's walls are Detail and the rest Shadow. */
  side?: SideRule
}

/** Turns sharper than this where two segments meet make a corner. */
const CORNER_TURN = (15 * Math.PI) / 180
/**
 * A curve shorter than this that turns more than ARC_TURN is a corner with its
 * edge eased, as the letters' are, so it gets a join line at its middle. A
 * wider rounding reads as a smooth turn and gets none.
 */
const CORNER_ARC = 1.6
const ARC_TURN = (30 * Math.PI) / 180

const defaultSide: SideRule = ({ hole }) => (hole ? 'Detail' : 'Shadow')

/**
 * The letters' rule: the walls of counters and notches, and the undersides,
 * are Detail; the sides facing right are Shadow.
 */
export const letterSide: SideRule = ({ hole, notch, normal }) =>
  hole || notch || normal[1] > normal[0] ? 'Detail' : 'Shadow'

const RAY_STEP = 0.25
const RAY_SAMPLES = 8

/** Whether a level ray out from `from`, on the side `normal` faces, meets the front again. */
function looksAcross(
  polys: Point[][],
  [minX, maxX]: [number, number],
  from: Point,
  [nx]: Point
) {
  if (Math.abs(nx) < 1e-6) return false
  const step = Math.sign(nx) * RAY_STEP
  for (let x = from[0] + step; x >= minX && x <= maxX; x += step)
    if (inside(polys, [x, from[1]])) return true
  return false
}

const sub = (a: Point, b: Point): Point => [a[0] - b[0], a[1] - b[1]]
const cross = (a: Point, b: Point) => a[0] * b[1] - a[1] * b[0]
const dot = (a: Point, b: Point) => a[0] * b[0] + a[1] * b[1]
const unit = ([x, y]: Point): Point => {
  const l = Math.hypot(x, y) || 1
  return [x / l, y / l]
}
const angle = (a: Point, b: Point) =>
  Math.acos(Math.max(-1, Math.min(1, dot(unit(a), unit(b)))))
const degenerate = (c: Cubic) =>
  c.every((p) => Math.hypot(p[0] - c[0][0], p[1] - c[0][1]) < 1e-6)
const chord = (c: Cubic) => Math.hypot(c[3][0] - c[0][0], c[3][1] - c[0][1])

/** Where a cubic's direction runs parallel to `v`: the sweep's silhouette. */
function parallelAt(c: Cubic, v: Point) {
  // The tangent is quadratic in t, so its cross with v is too.
  const [p0, p1, p2, p3] = c
  const d0 = cross(sub(p1, p0), v)
  const d1 = cross(sub(p2, p1), v)
  const d2 = cross(sub(p3, p2), v)
  const a = d0 - 2 * d1 + d2
  const b = 2 * (d1 - d0)
  const roots: number[] = []
  if (Math.abs(a) < 1e-12) {
    if (Math.abs(b) > 1e-12) roots.push(-d0 / b)
  } else {
    const disc = b * b - 4 * a * d0
    if (disc >= 0) {
      const s = Math.sqrt(disc)
      roots.push((-b - s) / (2 * a), (-b + s) / (2 * a))
    }
  }
  return roots.filter((t) => t > 1e-3 && t < 1 - 1e-3).sort((x, y) => x - y)
}

function splitAt(c: Cubic, ts: number[]): Cubic[] {
  const out: Cubic[] = []
  let rest = c
  let done = 0
  for (const t of ts) {
    const [a, b] = split(rest, (t - done) / (1 - done))
    out.push(a)
    rest = b
    done = t
  }
  out.push(rest)
  return out
}

type Piece = { cubic: Cubic; visible: boolean; corner: boolean }

function signedArea(poly: Point[]) {
  let a = 0
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++)
    a += cross(poly[j]!, poly[i]!)
  return a / 2
}

const fmt = ([x, y]: Point) => `${+x.toFixed(5)} ${+y.toFixed(5)}`
const add = (a: Point, b: Point): Point => [a[0] + b[0], a[1] + b[1]]

function strip([p0, p1, p2, p3]: Cubic, v: Point) {
  return parse(
    `M${fmt(p0)}C${fmt(p1)} ${fmt(p2)} ${fmt(p3)}L${fmt(add(p3, v))}C${fmt(add(p2, v))} ${fmt(add(p1, v))} ${fmt(add(p0, v))}Z`
  )
}

/**
 * Sweeps a front outline back along `vector`, as the set draws depth.
 *
 * The outline is cut into faces at its corners (an eased corner counts) and
 * where it turns away from view, and each face that shows is swept on its own.
 * So each face is a region with its own edges: drawn and stroked in order, its
 * ends are the join lines at corners and creases, and a smooth turn gets none.
 * `back` is the front moved by the vector, to paint behind the faces.
 */
export function extrude(
  front: Path,
  vector: Point,
  { side = defaultSide }: ExtrudeOptions = {}
) {
  const outline = front.copy()
  outline.simplify()
  const polys = polygons(outline)
  const xs = polys.flat().map((p) => p[0])
  const span: [number, number] = [
    xs.reduce((a, b) => Math.min(a, b), Infinity),
    xs.reduce((a, b) => Math.max(a, b), -Infinity)
  ]
  const faces: (Face & { depth: number })[] = []

  for (const contour of toCubics(outline)) {
    const segments = contour.filter((c) => !degenerate(c))
    if (!segments.length) continue
    const materialLeft = filledLeft(segments, polys)
    const poly = segments.flatMap((c) =>
      [0, 0.25, 0.5, 0.75].map((t) => pointAt(c, t))
    )
    const hole = signedArea(poly) > 0 !== materialLeft
    const outward = (c: Cubic, t: number) => {
      const [dx, dy] = tangentAt(c, t)
      return unit(materialLeft ? [dy, -dx] : [-dy, dx])
    }

    const pieces: Piece[] = []
    for (const c of segments) {
      const eased =
        chord(c) < CORNER_ARC &&
        angle(tangentAt(c, 0.001), tangentAt(c, 0.999)) > ARC_TURN
      const halves = eased ? split(c, 0.5) : [c]
      halves.forEach((h, i) => {
        for (const [k, piece] of splitAt(h, parallelAt(h, vector)).entries())
          pieces.push({
            cubic: piece,
            visible: dot(outward(piece, 0.5), vector) > 0,
            corner: eased && i === 1 && k === 0
          })
      })
    }

    const breaks = pieces.map((p, i) => {
      const prev = pieces[(i + pieces.length - 1) % pieces.length]!
      return (
        p.corner ||
        p.visible !== prev.visible ||
        angle(tangentAt(prev.cubic, 0.999), tangentAt(p.cubic, 0.001)) >
          CORNER_TURN
      )
    })
    const start = breaks.indexOf(true)
    if (start === -1) continue
    const runs: Piece[][] = []
    for (let k = 0; k < pieces.length; k++) {
      const i = (start + k) % pieces.length
      if (breaks[i]) runs.push([])
      runs.at(-1)!.push(pieces[i]!)
    }

    for (const run of runs.filter((r) => r[0]!.visible)) {
      const region = PK.NewPath()
      let normal: Point = [0, 0]
      let depth = 0
      let weight = 0
      let across = 0
      for (const { cubic } of run) {
        const s = strip(cubic, vector)
        region.op(s, PK.PathOp.UNION)
        s.delete()
        const w = chord(cubic) || 1e-6
        normal = add(normal, outward(cubic, 0.5).map((n) => n * w) as Point)
        depth += dot(pointAt(cubic, 0.5), vector) * w
        weight += w
        for (let k = 0; k < RAY_SAMPLES; k++) {
          const t = (k + 0.5) / RAY_SAMPLES
          if (looksAcross(polys, span, pointAt(cubic, t), outward(cubic, t)))
            across += w / RAY_SAMPLES
        }
      }
      region.simplify()
      const n = unit(normal)
      const notch = across * 2 > weight
      faces.push({
        layer: side({ hole, notch, normal: n }),
        path: region,
        hole,
        notch,
        normal: n,
        depth: depth / weight
      })
    }
  }

  const back = outline.copy()
  back.transform(1, 0, vector[0], 0, 1, vector[1], 0, 0, 1)
  outline.delete()
  // A face further along the vector sits nearer the viewer where faces overlap, so it's painted later.
  faces.sort((a, b) => a.depth - b.depth)
  return {
    back,
    faces: faces.map(({ depth: _, ...face }) => face)
  }
}
