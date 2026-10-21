'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'

import { MAX_RANGE_ROWS, type RecordsRange, rangesToLoad } from './ranges'
import type { RecordsGivenTotals } from './totals'

/** What `loadRange` resolves with: the range's rows, and the count once known. */
export type RecordsRangeResult<Row> = {
  /** The rows from the range's `start`, in order. Fewer than asked for ends a list with no count. */
  rows: readonly Row[]
  /** Every match. Leave it out when unknown, and the list keeps the last one, or grows a range at a time. */
  rowCount?: number
  /** False when `rowCount` is a floor the server stopped counting at. @default true */
  rowCountExact?: boolean
  /** Totals over every match, such as the server's sums. The list keeps the latest for the query. */
  totals?: RecordsGivenTotals
}

type Book<Row> = {
  key: string
  /** Tells apart two books for one key, as when a search changes and comes back. */
  token: object
  pending: number
  settledEnd: number
  failed: readonly RecordsRange[]
  attempt: number
  /** Each loaded row at its index; gaps are undefined. */
  rows: readonly (Row | undefined)[]
  /** Held from the last query until a range of this one returns, so the scrollbar keeps its length. */
  rowCount?: number
  rowCountExact: boolean
  totals?: RecordsGivenTotals
  /** A range of this query has returned, so its count is this query's. */
  counted: boolean
}

const freshBook = <Row>(key: string, last?: Book<Row>): Book<Row> => ({
  key,
  token: {},
  pending: 0,
  settledEnd: 0,
  failed: [],
  attempt: 0,
  rows: [],
  rowCount: last?.rowCount,
  rowCountExact: last?.rowCountExact ?? true,
  totals: last?.totals,
  counted: false
})

function place<Row>(
  rows: readonly (Row | undefined)[],
  start: number,
  placed: readonly Row[]
): (Row | undefined)[] {
  const next = rows.slice()
  if (next.length < start) next.length = start
  placed.forEach((row, offset) => {
    next[start + offset] = row
  })
  return next
}

function readResult<Row>(
  result: RecordsRangeResult<Row> | undefined,
  range: RecordsRange
): RecordsRangeResult<Row> {
  if (!result || !Array.isArray(result.rows))
    throw new TypeError('loadRange must resolve with { rows }')
  return { ...result, rows: result.rows.slice(0, range.end - range.start) }
}

export function useRangeLoading<Row>({
  loadRange,
  key,
  size
}: {
  loadRange?: (range: RecordsRange) => Promise<RecordsRangeResult<Row>>
  key: string
  size: number
}) {
  const [stored, setStored] = useState(() => freshBook<Row>(key))
  const book = stored.key === key ? stored : freshBook<Row>(key, stored)
  if (stored.key !== key) setStored(book)
  const data = book.rows
  const loadedLength = data.length

  // A last query's 0 would show an empty list that never asks for a range.
  const known =
    book.rowCount === undefined ||
    !Number.isFinite(book.rowCount) ||
    (book.rowCount === 0 && !book.counted)
      ? undefined
      : Math.max(0, Math.floor(book.rowCount))
  const capped = loadedLength >= MAX_RANGE_ROWS
  const ended =
    known === undefined &&
    (capped ||
      (book.pending === 0 &&
        book.settledEnd > 0 &&
        loadedLength < book.settledEnd))
  const count =
    known === undefined
      ? ended
        ? Math.min(loadedLength, MAX_RANGE_ROWS)
        : loadedLength + size
      : Math.min(known, MAX_RANGE_ROWS)
  const total = known ?? (ended && !capped ? loadedLength : undefined)

  // Requests dedupe synchronously; state only drives what renders.
  const requested = useRef({
    token: book.token,
    starts: new Map<number, number>(),
    pending: new Set<number>(),
    nextStart: 0
  })
  const floor = book.rowCountExact ? undefined : known
  const latest = useRef({
    loadRange,
    rowCount: known,
    floor,
    size,
    book,
    ended,
    data
  })
  useLayoutEffect(() => {
    latest.current = {
      loadRange,
      rowCount: known,
      floor,
      size,
      book,
      ended,
      data
    }
  })

  const lastView = useRef<{
    token: object
    window: [number, number, number?]
  } | null>(null)
  const [view] = useState(
    () => (first: number, last: number, target?: number) => {
      const now = latest.current
      lastView.current = {
        token: now.book.token,
        window: [first, last, target]
      }
      if (!now.loadRange) return
      if (requested.current.token !== now.book.token)
        requested.current = {
          token: now.book.token,
          starts: new Map(),
          pending: new Set(),
          nextStart: 0
        }
      const mine = requested.current
      const ranges = rangesToLoad({
        first,
        last,
        size: now.size,
        rowCount: now.rowCount,
        // A count that grew since a page was asked for may hold more of it.
        requested:
          now.rowCount === undefined
            ? mine.pending
            : new Set(
                [...mine.starts]
                  .filter(
                    ([start, count]) =>
                      mine.pending.has(start) || count >= (now.rowCount ?? -1)
                  )
                  .map(([start]) => start)
              ),
        failed: new Set(now.book.failed.map((range) => range.start)),
        pending: now.book.pending,
        // Rows already in `data`, as from a cache or a remount, aren't fetched again.
        nextStart: Math.max(mine.nextStart, now.data.length),
        ended: now.ended,
        target,
        floor: now.floor,
        held: ({ start, end }) => {
          const last = Math.min(end, now.rowCount ?? end)
          for (let index = start; index < last; index++)
            if (now.data[index] === undefined) return false
          return true
        }
      })
      if (ranges.length === 0) return
      const forBook = (update: (book: Book<Row>) => Book<Row>) =>
        setStored((current) =>
          current.token === mine.token ? update(current) : current
        )
      for (const range of ranges) {
        mine.starts.set(range.start, now.rowCount ?? -1)
        mine.pending.add(range.start)
        mine.nextStart = Math.max(mine.nextStart, range.end)
      }
      forBook((current) => ({
        ...current,
        pending: current.pending + ranges.length
      }))
      const load = now.loadRange
      for (const range of ranges) {
        // A synchronous throw becomes a rejection like any other.
        Promise.resolve()
          .then(() => load(range))
          .then((result) => readResult(result, range))
          .then(
            ({ rows, rowCount, rowCountExact = true, totals }) => {
              mine.pending.delete(range.start)
              forBook((current) => ({
                ...current,
                pending: current.pending - 1,
                settledEnd: Math.max(current.settledEnd, range.end),
                rows: place(current.rows, range.start, rows),
                counted: true,
                // A first reply with no count drops the last query's.
                ...(rowCount !== undefined
                  ? { rowCount, rowCountExact }
                  : !current.counted && {
                      rowCount: undefined,
                      rowCountExact: true
                    }),
                ...(totals !== undefined
                  ? { totals }
                  : !current.counted && { totals: undefined })
              }))
            },
            () => {
              mine.starts.delete(range.start)
              mine.pending.delete(range.start)
              mine.nextStart = Math.min(mine.nextStart, range.start)
              forBook((current) => ({
                ...current,
                pending: current.pending - 1,
                failed: [...current.failed, range]
              }))
            }
          )
      }
    }
  )

  // Stable, so the range state memoised on it holds between renders.
  const [retry] = useState(() => () => {
    const token = latest.current.book.token
    setStored((current) =>
      current.token === token
        ? { ...current, failed: [], attempt: current.attempt + 1 }
        : current
    )
  })

  // An error state may have unmounted the rows, so Retry plans from the last window itself.
  useEffect(() => {
    const last = lastView.current
    if (!last) return
    if (book.attempt > 0 && last.token === book.token) view(...last.window)
  }, [book.attempt, book.token, view])

  return {
    rows: data,
    rowCount: known,
    rowCountExact: book.rowCountExact,
    totals: book.totals,
    capped,
    count,
    total,
    loading: book.pending > 0,
    failed: book.failed,
    attempt: book.attempt,
    view,
    retry
  }
}
