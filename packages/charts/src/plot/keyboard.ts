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

// Array#sort is stable, so segments tied on x keep the engine's series order.
function categoryRows<T extends Banded>(points: readonly T[]): T[][] {
  const rows: T[][] = []
  for (const p of points) {
    const row = rows.find((r) => sameValue(r[0]!.yValue, p.yValue))
    if (row) row.push(p)
    else rows.push([p])
  }
  for (const row of rows) row.sort((a, b) => a.x - b.x)
  return rows.sort((a, b) => a[0]!.y - b[0]!.y)
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
