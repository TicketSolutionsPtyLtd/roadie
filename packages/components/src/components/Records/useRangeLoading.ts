'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'

import { MAX_RANGE_ROWS, type RecordRange, rangesToLoad } from './ranges'

type Book = {
  key: string
  /** Tells apart two books for one key, as when a search changes and comes back. */
  token: object
  pending: number
  settledEnd: number
  failed: readonly RecordRange[]
  attempt: number
  /** Started because `data` lost rows, so it plans from the last window itself. */
  refill: boolean
}

const freshBook = (key: string, refill = false): Book => ({
  key,
  token: {},
  pending: 0,
  settledEnd: 0,
  failed: [],
  attempt: 0,
  refill
})

export function useRangeLoading({
  loadRange,
  key,
  rowCount,
  size,
  data,
  held
}: {
  loadRange?: (range: RecordRange) => Promise<void> | void
  key: string
  rowCount?: number
  size: number
  data: readonly unknown[]
  /** Rows loaded in `data`. */
  held: number
}) {
  const loadedLength = data.length
  const [stored, setStored] = useState(() => freshBook(key))
  const book = stored.key === key ? stored : freshBook(key)
  if (stored.key !== key) setStored(book)

  // A consumer key the table can't see, like a trailing space, clears `data`
  // under the same key; the ranges it requested must load again.
  const seen = useRef({ key, held })
  useLayoutEffect(() => {
    const before = seen.current
    seen.current = { key, held }
    if (before.key === key && held < before.held)
      setStored(freshBook(key, true))
  }, [key, held])

  const ended =
    rowCount === undefined &&
    book.pending === 0 &&
    book.settledEnd > 0 &&
    loadedLength < book.settledEnd
  const count =
    rowCount === undefined
      ? ended
        ? loadedLength
        : loadedLength + size
      : Math.min(rowCount, MAX_RANGE_ROWS)
  const total = rowCount ?? (ended ? loadedLength : undefined)

  // Requests dedupe synchronously; state only drives what renders.
  const requested = useRef({
    token: book.token,
    starts: new Set<number>(),
    nextStart: 0
  })
  const latest = useRef({ loadRange, rowCount, size, book, ended, data })
  useLayoutEffect(() => {
    latest.current = { loadRange, rowCount, size, book, ended, data }
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
          starts: new Set(),
          nextStart: 0
        }
      const mine = requested.current
      const ranges = rangesToLoad({
        first,
        last,
        size: now.size,
        rowCount: now.rowCount,
        requested: mine.starts,
        failed: new Set(now.book.failed.map((range) => range.start)),
        pending: now.book.pending,
        // Rows already in `data`, as from a cache or a remount, aren't fetched again.
        nextStart: Math.max(mine.nextStart, now.data.length),
        ended: now.ended,
        target,
        held: ({ start, end }) => {
          for (let index = start; index < end; index++)
            if (now.data[index] === undefined) return false
          return true
        }
      })
      if (ranges.length === 0) return
      const forBook = (update: (book: Book) => Book) =>
        setStored((current) =>
          current.token === mine.token ? update(current) : current
        )
      for (const range of ranges) {
        mine.starts.add(range.start)
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
          .then(
            () =>
              forBook((current) => ({
                ...current,
                pending: current.pending - 1,
                settledEnd: Math.max(current.settledEnd, range.end)
              })),
            () => {
              mine.starts.delete(range.start)
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
    const retried = book.attempt > 0 && last.token === book.token
    if (retried || book.refill) view(...last.window)
  }, [book.attempt, book.token, book.refill, view])

  return {
    count,
    total,
    loading: book.pending > 0,
    failed: book.failed,
    attempt: book.attempt,
    view,
    retry
  }
}
