import type { CategoryAxis } from './types'

type Steppable = { xValue: unknown; group: unknown; y: number }

const sameValue = (a: unknown, b: unknown) =>
  a instanceof Date && b instanceof Date ? a.getTime() === b.getTime() : a === b

const twins = (a: Steppable, b: Steppable) =>
  a === b || (a.group != null && a.group === b.group)

/** Steps to the series above (-1) or below (1) at the same x, top to bottom on screen. */
export function stepSeries<T extends Steppable>(
  points: readonly T[],
  current: T,
  direction: 1 | -1
): T | null {
  if (!points.includes(current)) return null
  // One stop per series, where a solid line and its forecast share a point.
  const column = points
    .filter((p) => sameValue(p.xValue, current.xValue))
    .sort((a, b) => a.y - b.y)
    .filter((p, i, all) => all.findIndex((other) => twins(other, p)) === i)
  const index = column.findIndex((p) => twins(p, current))
  return column[index + direction] ?? null
}

type Along = { markId: string; group: unknown; x: number }

// A series split across marks (solid then forecast) shares its `z` group.
const sameSeries = (a: Along, b: Along) =>
  a.group == null
    ? b.group == null && a.markId === b.markId
    : a.group === b.group

/** Steps to the previous (-1) or next (1) x of the same series. */
export function stepAlong<T extends Along>(
  points: readonly T[],
  current: T,
  direction: 1 | -1
): T | null {
  if (!points.includes(current)) return null
  const ahead = points
    .filter((p) => sameSeries(current, p) && (p.x - current.x) * direction > 0)
    .sort((a, b) => (a.x - b.x) * direction)
  return ahead[0] ?? null
}

type Banded = Along & { yValue: unknown; y: number }

function groupBy<T>(points: readonly T[], valueOf: (p: T) => unknown) {
  const groups: T[][] = []
  for (const p of points) {
    const group = groups.find((g) => sameValue(valueOf(g[0]!), valueOf(p)))
    if (group) group.push(p)
    else groups.push([p])
  }
  return groups
}

// Array#sort is stable, so segments tied on x keep the engine's series order.
function categoryRows<T extends Banded>(points: readonly T[]): T[][] {
  const rows = groupBy(points, (p) => p.yValue)
  for (const row of rows) row.sort((a, b) => a.x - b.x)
  return rows.sort((a, b) => a[0]!.y - b[0]!.y)
}

// Top first, so a stack or a set of lines starts on its top point, and a dodged
// group starts on its first series.
function categoryColumns<T extends Banded & { xValue: unknown }>(
  points: readonly T[]
): T[][] {
  const columns = groupBy(points, (p) => p.xValue)
  for (const column of columns) column.sort((a, b) => a.x - b.x || a.y - b.y)
  return columns.sort((a, b) => a[0]!.x - b[0]!.x)
}

/**
 * The first and last stops in visual order, for entering focus, Home and End.
 * Along x both ends are a column's first stop, the same stops the engine's
 * column focus walks.
 */
export function visualEnds<T extends Banded & { xValue: unknown }>(
  points: readonly T[],
  axis: CategoryAxis
): { first: T; last: T } | null {
  if (!points.length) return null
  if (axis === 'y') {
    const rows = categoryRows(points)
    return { first: rows[0]![0]!, last: rows.at(-1)!.at(-1)! }
  }
  const columns = categoryColumns(points)
  return { first: columns[0]![0]!, last: columns.at(-1)![0]! }
}

/** Steps to the category above (-1) or below (1) when categories run down y. */
export function stepCategory<T extends Banded>(
  points: readonly T[],
  current: T,
  direction: 1 | -1
): T | null {
  const rows = categoryRows(points)
  const index = rows.findIndex((row) => row.includes(current))
  if (index < 0) return null
  const next = rows[index + direction]
  if (!next) return null
  return next.find((p) => sameSeries(current, p)) ?? next[0]!
}

/** Steps to the segment left (-1) or right (1) within the same y category. */
export function stepWithin<T extends Banded>(
  points: readonly T[],
  current: T,
  direction: 1 | -1
): T | null {
  const row = categoryRows(points).find((r) => r.includes(current))
  return row?.[row.indexOf(current) + direction] ?? null
}
