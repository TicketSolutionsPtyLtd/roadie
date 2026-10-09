'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'

import { type WindowItem, firstVisibleRow } from './recordsWindow'

const REPORT_EVERY_MS = 300
// Long enough for a pane header to compact after the jump on a slow device.
const SETTLE_MS = 1000
const GIVES_UP_ON = ['wheel', 'touchstart', 'pointerdown', 'keydown'] as const

export type Watched = {
  isScrolling: boolean
  scrollOffset: number | null
  options: { scrollPaddingStart: number }
  getVirtualItems: () => readonly WindowItem[]
}

type Restorable = {
  scrollRect: { height: number } | null
  getVirtualItems: () => readonly WindowItem[]
  scrollToIndex: (index: number, options: { align: 'start' }) => void
}

/** The rows the table reported since its last restore, and the row a restore is loading or holding. */
export function rowPosition() {
  const reported = new Set<number>()
  let target: number | undefined
  let released = () => {}
  return {
    isOwn: (row: number) => reported.has(row),
    /** Holds a row as the table's own, ending any restore. */
    own: (row: number) => {
      reported.add(row)
      target = undefined
    },
    restore: (row: number) => {
      reported.clear()
      reported.add(row)
      target = row
    },
    target: () => target,
    /** A new query: its rows owe nothing to the last one's. */
    forget: () => {
      reported.clear()
      target = undefined
    },
    /** Ends a restore the reader took over or that settled, so the reader's row is reported. */
    release: (row: number) => {
      if (target !== row) return
      target = undefined
      released()
    },
    onRelease: (listener: () => void) => {
      released = listener
    }
  }
}

export type RowPosition = ReturnType<typeof rowPosition>

/** The virtualiser's `onChange`: reports the first visible row at most every 300ms while scrolling, and when it stops. */
export function useRowReport({
  position,
  onRow
}: {
  position: RowPosition
  onRow: (row: number) => void
}) {
  const latest = useRef(onRow)
  useLayoutEffect(() => {
    latest.current = onRow
  })
  const [reporter] = useState(() => {
    const now = {
      last: -Infinity,
      row: undefined as number | undefined,
      scrolling: false,
      timer: undefined as ReturnType<typeof setTimeout> | undefined,
      seen: undefined as Watched | undefined
    }
    const report = () => {
      clearTimeout(now.timer)
      now.timer = undefined
      // A restore owns the position until released; a clamped scroll meanwhile isn't the reader's.
      if (!now.seen || position.target() !== undefined) return
      const row = firstVisibleRow(
        now.seen.getVirtualItems(),
        now.seen.scrollOffset ?? 0,
        // The measured stuckInset, threaded through as the virtualiser's padding.
        now.seen.options.scrollPaddingStart
      )
      if (row === undefined || (row === now.row && position.isOwn(row))) return
      now.last = Date.now()
      now.row = row
      position.own(row)
      latest.current(row)
    }
    const onChange = (virtualizer: Watched) => {
      now.seen = virtualizer
      if (virtualizer.isScrolling) {
        now.scrolling = true
        const wait = now.last + REPORT_EVERY_MS - Date.now()
        if (wait <= 0) report()
        else now.timer ??= setTimeout(report, wait)
        return
      }
      if (!now.scrolling) return
      now.scrolling = false
      report()
    }
    return { onChange, report, stop: () => clearTimeout(now.timer) }
  })
  useEffect(() => {
    position.onRelease(reporter.report)
    return reporter.stop
  }, [position, reporter])
  return reporter.onChange
}

const offsetOf = (scrollElement: HTMLElement | null) =>
  scrollElement ? scrollElement.scrollTop : window.scrollY

/**
 * Scrolls `row` under the stuck header when it changes from outside. A row
 * the table reported itself is an echo and never restores, so an async
 * router replaying an older row can't jump the table back.
 */
export function useRowRestore({
  virtualizer,
  measured,
  scrollElement,
  query,
  row,
  total,
  loaded,
  inset,
  margin,
  position,
  view
}: {
  virtualizer: Restorable
  measured: boolean
  scrollElement: HTMLElement | null
  /** What the rows belong to; a new one starts the position over. */
  query: string
  row: number
  total?: number
  loaded: (index: number) => boolean
  /** The virtualiser's `scrollPaddingStart`. */
  inset: number
  /** The virtualiser's `scrollMargin`; a change while holding scrolls again. */
  margin: number
  position: RowPosition
  view: (first: number, last: number, target?: number) => void
}) {
  const shown = useRef(query)
  const scrolled = useRef<{ row: number; geometry: string } | undefined>(
    undefined
  )
  // Jumped but not yet arrived: windows between are from before the jump.
  const jumped = useRef(false)
  const seen = useRef<[number, number] | undefined>(undefined)
  const hold = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(
    () => () => {
      clearTimeout(hold.current)
      // A remount (StrictMode, Activity) must start the hold again.
      hold.current = undefined
    },
    []
  )

  useLayoutEffect(() => {
    if (!measured) return
    if (shown.current !== query) {
      shown.current = query
      position.forget()
    }
    if (position.target() !== row) {
      clearTimeout(hold.current)
      hold.current = undefined
      // Already there is held as the table's own, else a scroll that never reaches the URL would snap back here.
      if (
        position.isOwn(row) ||
        firstVisibleRow(
          virtualizer.getVirtualItems(),
          offsetOf(scrollElement),
          inset
        ) === row
      ) {
        position.own(row)
        return
      }
      position.restore(row)
      scrolled.current = undefined
    }
    const release = () => {
      clearTimeout(hold.current)
      hold.current = undefined
      if (jumped.current && seen.current) view(...seen.current)
      jumped.current = false
      position.release(row)
    }
    const input = scrollElement ?? window
    for (const type of GIVES_UP_ON)
      input.addEventListener(type, release, { passive: true })
    if (total !== undefined || loaded(row)) {
      const geometry = `${inset} ${margin}`
      // Scrolls once, then again only if the header or margin moves, never against a reader's scrollbar.
      if (scrolled.current?.row !== row) jumped.current = true
      const moved =
        scrolled.current?.row === row && scrolled.current.geometry !== geometry
      if (scrolled.current?.row !== row || moved)
        virtualizer.scrollToIndex(row, { align: 'start' })
      scrolled.current = { row, geometry }
      // Held while the header and margin settle after mount; each move they
      // make starts the wait again, as a slow page settles in steps.
      if (moved) {
        clearTimeout(hold.current)
        hold.current = undefined
      }
      hold.current ??= setTimeout(release, SETTLE_MS)
    }
    return () => {
      for (const type of GIVES_UP_ON) input.removeEventListener(type, release)
    }
  }, [
    virtualizer,
    measured,
    scrollElement,
    query,
    row,
    total,
    loaded,
    inset,
    margin,
    position,
    view
  ])

  const [plan] = useState(() => (first: number, last: number) => {
    seen.current = [first, last]
    const target = position.target()
    if (jumped.current) {
      if (target !== undefined && (target < first || target > last)) return
      jumped.current = false
    }
    view(first, last, target)
  })
  return plan
}
