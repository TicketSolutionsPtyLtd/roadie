type Steppable = { xValue: unknown; group: unknown; y: number }

const sameX = (a: unknown, b: unknown) =>
  a instanceof Date && b instanceof Date ? a.getTime() === b.getTime() : a === b

/** Steps to the series above (-1) or below (1) at the same x, top to bottom on screen. */
export function stepSeries<T extends Steppable>(
  points: readonly T[],
  current: T,
  direction: 1 | -1
): T | null {
  const column = points
    .filter((p) => sameX(p.xValue, current.xValue))
    .sort((a, b) => a.y - b.y)
  const index = column.indexOf(current)
  return index < 0 ? null : (column[index + direction] ?? null)
}

type Along = { markId: string; group: unknown; x: number }

/** Steps to the previous (-1) or next (1) point of the same series. */
export function stepAlong<T extends Along>(
  points: readonly T[],
  current: T,
  direction: 1 | -1
): T | null {
  const series = points
    .filter((p) => p.markId === current.markId && p.group === current.group)
    .sort((a, b) => a.x - b.x)
  const index = series.indexOf(current)
  return index < 0 ? null : (series[index + direction] ?? null)
}
