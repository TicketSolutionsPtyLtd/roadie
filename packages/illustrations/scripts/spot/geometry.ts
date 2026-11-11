import { PK, type Path } from './pathkit.ts'

type Point = [number, number]
type Cubic = [Point, Point, Point, Point]

const lerp = (a: Point, b: Point, t: number): Point => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t
]

// Matches the conic's end tangents: the standard fit for arcs of up to a quarter turn.
function conicAsCubic(p0: Point, p1: Point, p2: Point, w: number): Cubic {
  const k = (4 / 3) * (w / (1 + w))
  return [p0, lerp(p0, p1, k), lerp(p2, p1, k), p2]
}

/** A path's segments as cubic Béziers, one array per subpath. */
export function toCubics(path: Path): Cubic[][] {
  const subpaths: Cubic[][] = []
  let current: Cubic[] = []
  let start: Point = [0, 0]
  let at: Point = [0, 0]
  for (const [verb, ...c] of path.toCmds()) {
    const n = c as number[]
    if (verb === PK.MOVE_VERB) {
      start = at = [n[0]!, n[1]!]
      current = []
      subpaths.push(current)
    } else if (verb === PK.LINE_VERB) {
      const p: Point = [n[0]!, n[1]!]
      current.push([at, lerp(at, p, 1 / 3), lerp(at, p, 2 / 3), p])
      at = p
    } else if (verb === PK.QUAD_VERB) {
      const q: Point = [n[0]!, n[1]!]
      const p: Point = [n[2]!, n[3]!]
      current.push([at, lerp(at, q, 2 / 3), lerp(p, q, 2 / 3), p])
      at = p
    } else if (verb === PK.CUBIC_VERB) {
      const p: Point = [n[4]!, n[5]!]
      current.push([at, [n[0]!, n[1]!], [n[2]!, n[3]!], p])
      at = p
    } else if (verb === PK.CONIC_VERB) {
      const p: Point = [n[2]!, n[3]!]
      current.push(conicAsCubic(at, [n[0]!, n[1]!], p, n[4]!))
      at = p
    } else if (verb === PK.CLOSE_VERB) {
      if (Math.hypot(at[0] - start[0], at[1] - start[1]) > 1e-6)
        current.push([
          at,
          lerp(at, start, 1 / 3),
          lerp(at, start, 2 / 3),
          start
        ])
      at = start
    }
  }
  return subpaths
}

function pointAt([a, b, c, d]: Cubic, t: number): Point {
  const u = 1 - t
  const mix = (i: 0 | 1) =>
    u * u * u * a[i] +
    3 * u * u * t * b[i] +
    3 * u * t * t * c[i] +
    t * t * t * d[i]
  return [mix(0), mix(1)]
}

function split([a, b, c, d]: Cubic, t: number): [Cubic, Cubic] {
  const ab = lerp(a, b, t)
  const bc = lerp(b, c, t)
  const cd = lerp(c, d, t)
  const abc = lerp(ab, bc, t)
  const bcd = lerp(bc, cd, t)
  const m = lerp(abc, bcd, t)
  return [
    [a, ab, abc, m],
    [m, bcd, cd, d]
  ]
}

function slice(cubic: Cubic, t0: number, t1: number): Cubic {
  const right = t0 > 0 ? split(cubic, t0)[1] : cubic
  return t1 < 1 ? split(right, (t1 - t0) / (1 - t0))[0] : right
}

const SAMPLES_PER_SEGMENT = 48

/** A filled path as polygons, for an even-odd inside test. PathKit has no hit test. */
function polygons(path: Path): Point[][] {
  return toCubics(path).map((segments) =>
    segments.flatMap((s) =>
      Array.from({ length: SAMPLES_PER_SEGMENT }, (_, k) =>
        pointAt(s, k / SAMPLES_PER_SEGMENT)
      )
    )
  )
}

function inside(polys: Point[][], [x, y]: Point) {
  let hit = false
  for (const poly of polys)
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i]!
      const [xj, yj] = poly[j]!
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)
        hit = !hit
    }
  return hit
}

const STEPS = 64
const BISECTIONS = 24

/** The parts of a line that fall outside a filled area, as SVG path data. */
export function clipOutside(line: Path, area: Path): string {
  const polys = polygons(area)
  const visible = (cubic: Cubic, t: number) => !inside(polys, pointAt(cubic, t))
  const fmt = (p: Point) => p.map((v) => +v.toFixed(4)).join(' ')
  const out: string[] = []

  for (const segments of toCubics(line)) {
    let joined = false
    for (const cubic of segments) {
      const states = Array.from({ length: STEPS + 1 }, (_, k) =>
        visible(cubic, k / STEPS)
      )
      const crossing = (k: number) => {
        let lo = (k - 1) / STEPS
        let hi = k / STEPS
        for (let n = 0; n < BISECTIONS; n++) {
          const mid = (lo + hi) / 2
          if (visible(cubic, mid) === states[k - 1]) lo = mid
          else hi = mid
        }
        return (lo + hi) / 2
      }
      let runStart: number | null = states[0] ? 0 : null
      for (let k = 1; k <= STEPS + 1; k++) {
        const isVisible = k <= STEPS ? states[k]! : false
        if (k <= STEPS && isVisible === states[k - 1]) continue
        if (runStart === null && isVisible) {
          runStart = crossing(k)
        } else if (runStart !== null && !isVisible) {
          const end = k <= STEPS ? crossing(k) : 1
          const piece = slice(cubic, runStart, end)
          if (!(joined && runStart === 0)) out.push(`M${fmt(piece[0])}`)
          out.push(`C${fmt(piece[1])} ${fmt(piece[2])} ${fmt(piece[3])}`)
          joined = end === 1
          runStart = null
        }
      }
      if (!states[STEPS]) joined = false
    }
  }
  return out.join('')
}

/** Whether a line's centre runs inside a filled area anywhere. */
export function runsInside(line: Path, area: Path) {
  const polys = polygons(area)
  return toCubics(line).some((segments) =>
    segments.some((cubic) =>
      Array.from({ length: STEPS + 1 }, (_, k) => k / STEPS).some((t) =>
        inside(polys, pointAt(cubic, t))
      )
    )
  )
}

export function overlaps(a: Path, b: Path) {
  const shared = a.copy()
  shared.op(b, PK.PathOp.INTERSECT)
  const empty = shared.toSVGString() === ''
  shared.delete()
  return !empty
}

/** The area within `by` of a path's edge, inside and out. */
function band(path: Path, by: number) {
  const ring = path.copy()
  ring.stroke({ width: by * 2, join: PK.StrokeJoin.ROUND })
  return ring
}

export function grow(path: Path, by: number) {
  const ring = band(path, by)
  path.op(ring, PK.PathOp.UNION)
  ring.delete()
  path.simplify()
  return path
}

export function shrink(path: Path, by: number) {
  const ring = band(path, by)
  path.op(ring, PK.PathOp.DIFFERENCE)
  ring.delete()
  path.simplify()
  return path
}

export function union(paths: Path[]) {
  const [first, ...rest] = paths
  if (!first) return null
  for (const p of rest) {
    first.op(p, PK.PathOp.UNION)
    p.delete()
  }
  first.simplify()
  return first
}
