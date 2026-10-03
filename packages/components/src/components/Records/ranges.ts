import type { RecordQuery } from '@oztix/roadie-core/records'

import { matchKey } from './selection'

/** Rows `start` to `end`, end exclusive. */
export type RecordRange = { start: number; end: number }

export type RangePlan = {
  first: number
  last: number
  size: number
  rowCount?: number
  requested: ReadonlySet<number>
  failed: ReadonlySet<number>
  pending: number
  nextStart: number
  ended: boolean
  target?: number
  /** Every row of the range is already in `data`. */
  held?: (range: RecordRange) => boolean
}

// 48px rows stay under Firefox's ~17.9M px cap on an element's height.
export const MAX_RANGE_ROWS = 300_000

/**
 * The ranges to request for a window: with a count, the rows on screen plus a
 * screen either side; without one, the next range while the end is near.
 * Every range starts at a multiple of `size`, so it is one page.
 */
export function rangesToLoad(plan: RangePlan): RecordRange[] {
  const screen = Math.max(1, plan.last - plan.first + 1)
  const size = Math.max(1, Math.floor(plan.size) || 1)
  if (plan.rowCount === undefined) {
    if (plan.ended || plan.pending > 0 || plan.failed.size > 0) return []
    const want = Math.max(plan.last + screen, plan.target ?? 0)
    const start = Math.floor(plan.nextStart / size) * size
    if (start > want) return []
    return [{ start, end: start + size }]
  }
  const rowCount = Math.min(plan.rowCount, MAX_RANGE_ROWS)
  const from = Math.floor(Math.max(0, plan.first - screen) / size) * size
  const to = Math.min(rowCount, plan.last + screen + 1)
  const ranges: RecordRange[] = []
  for (let start = from; start < to; start += size) {
    if (plan.requested.has(start) || plan.failed.has(start)) continue
    const range = { start, end: Math.min(start + size, rowCount) }
    if (!plan.held?.(range)) ranges.push(range)
  }
  return ranges
}

/** What loaded rows belong to: a new search, filter, sort or zone starts over. */
export const rangeKey = (
  query: Pick<RecordQuery, 'search' | 'filters' | 'sort'>,
  timeZone: string
) => JSON.stringify([matchKey(query), query.sort, timeZone])
