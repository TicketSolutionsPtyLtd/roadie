'use client'

import {
  type RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState
} from 'react'

import { useVirtualizer, useWindowVirtualizer } from '@tanstack/react-virtual'

import type { WindowView } from './recordsWindow'
import {
  type Watched,
  rowPosition,
  useRowReport,
  useRowRestore
} from './rowPosition'
import { tableRowSize } from './rowSizing'
import { findScrollParent, findStickyContainer } from './scrollParent'
import { RECORDS_SCROLLER } from './tableFocus'
import type { RecordsRangeState } from './types'

const OVERSCAN = 10
// A first paint before the scroll element is known, on the server or in jsdom.
const INITIAL_RECT = { width: 1024, height: 900 }

/** The body's offset within its scroll element, as the virtualiser's `scrollMargin`. */
function marginOf(body: HTMLElement, element: HTMLElement | null) {
  const top = body.getBoundingClientRect().top
  return element
    ? top - element.getBoundingClientRect().top + element.scrollTop
    : top + window.scrollY
}

// TanStack rounds each measured row; over a hundred cards the rounding adds up to px off a restored row.
const exactHeight = (
  element: Element,
  entry: ResizeObserverEntry | undefined
) =>
  entry?.borderBoxSize?.[0]?.blockSize ?? element.getBoundingClientRect().height

const stuckBottom = (element: HTMLElement) =>
  (parseFloat(getComputedStyle(element).top) || 0) + element.offsetHeight

/** Px from the scroll element's top edge to the bottom of the stuck header, or of the toolbar over narrow rows. */
function stuckInset(body: HTMLElement): number {
  const head = body
    .closest('[data-slot="record-table-content"]')
    ?.querySelector<HTMLElement>('[data-slot="record-table-head"]')
  if (head) return stuckBottom(head)
  const toolbar = body
    .closest('[data-slot="records"]')
    ?.querySelector<HTMLElement>('[data-slot="records-toolbar"]')
  // From above the scroller, which is a sticky container itself; the toolbar covers the rows only when both stick in one box.
  const scroller = body.closest<HTMLElement>(RECORDS_SCROLLER)
  return toolbar &&
    findStickyContainer(toolbar) === findStickyContainer(scroller)
    ? stuckBottom(toolbar)
    : 0
}

type Scroller = { element: HTMLElement | null; ready: boolean }

/** How a window sizes its rows: fixed, or measured from an estimate. */
export type RowSizing = {
  /** Each row's height in rem, or its estimate when measured. */
  estimateRem?: number
  /** Measures each rendered row through `measureElement`, for rows that size to their content. */
  measure?: boolean
  /** Rem between rows. */
  gapRem?: number
}

export type RowWindowOptions = RowSizing & {
  count: number
  getItemKey: (index: number) => string
  onChange?: (virtualizer: Watched) => void
  /** Measures the px a scrolled-to row keeps clear at the top, as for a stuck header. */
  measureInset?: (body: HTMLElement) => number
}

export function useRowWindow<Body extends HTMLElement = HTMLDivElement>({
  count,
  getItemKey,
  onChange,
  measureInset,
  estimateRem = tableRowSize.estimateRem,
  measure: measureRows = false,
  gapRem = 0
}: RowWindowOptions) {
  const bodyRef = useRef<Body>(null)
  const [scroller, setScroller] = useState<Scroller>({
    element: null,
    ready: false
  })
  const [margin, setMargin] = useState(0)
  const [inset, setInset] = useState(0)
  // Rows are sized in rem, so a larger root font makes them taller.
  const [rootFont, setRootFont] = useState(16)
  const rowHeight = estimateRem * rootFont
  const gap = gapRem * rootFont

  useLayoutEffect(() => {
    const body = bodyRef.current
    if (!body) return
    const tableScroller = body.closest<HTMLElement>(RECORDS_SCROLLER)
    const element = findScrollParent(tableScroller)
    setScroller({ element, ready: true })
    const measure = () => {
      const current = bodyRef.current
      if (current) setMargin(marginOf(current, element))
      const root = parseFloat(
        getComputedStyle(document.documentElement).fontSize
      )
      if (root > 0) setRootFont(root)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element ?? document.documentElement)
    if (body.parentElement?.parentElement)
      observer.observe(body.parentElement.parentElement)
    return () => observer.disconnect()
  }, [])

  const usesWindow = scroller.ready && scroller.element === null
  // Both hooks stay mounted so the body never remounts mid-measurement. The
  // compiler skips this hook; callers get items read fresh each render.
  // eslint-disable-next-line react-hooks/incompatible-library
  const elementVirtualizer = useVirtualizer({
    count,
    getScrollElement: () => scroller.element,
    estimateSize: () => rowHeight,
    overscan: OVERSCAN,
    scrollMargin: margin,
    initialRect: INITIAL_RECT,
    getItemKey,
    onChange,
    scrollPaddingStart: inset,
    gap,
    measureElement: exactHeight,
    // Enabled before the scroll element is known so INITIAL_RECT paints a first window.
    enabled: !usesWindow
  })
  const windowVirtualizer = useWindowVirtualizer({
    count,
    estimateSize: () => rowHeight,
    overscan: OVERSCAN,
    scrollMargin: margin,
    initialRect: INITIAL_RECT,
    getItemKey,
    onChange,
    scrollPaddingStart: inset,
    gap,
    measureElement: exactHeight,
    enabled: usesWindow
  })
  const virtualizer = usesWindow ? windowVirtualizer : elementVirtualizer

  useLayoutEffect(() => {
    virtualizer.measure()
  }, [virtualizer, rowHeight, gap])

  const { isScrolling } = virtualizer
  // Again once settled: a pane header or sticky top lands a render after mount, with no resize.
  useLayoutEffect(() => {
    const body = bodyRef.current
    if (!body || !scroller.ready || isScrolling) return
    // A tolerance, so subpixel rounding can't loop renders.
    const nextMargin = marginOf(body, scroller.element)
    if (Math.abs(nextMargin - margin) > 0.5) setMargin(nextMargin)
    const nextInset = measureInset?.(body) ?? 0
    if (Math.abs(nextInset - inset) > 0.5) setInset(nextInset)
  }, [scroller, isScrolling, count, margin, inset, measureInset])
  // Read here, not by callers: the compiler would cache them on the one mutable instance.
  const items = virtualizer.getVirtualItems()
  // Set by getVirtualItems: the rows on screen, without overscan.
  const visible = virtualizer.range
  const view: WindowView = {
    items,
    total: virtualizer.getTotalSize(),
    margin,
    offset: virtualizer.scrollOffset ?? 0,
    inset,
    visibleStart: visible?.startIndex,
    fixed: !measureRows
  }

  return {
    bodyRef,
    virtualizer,
    view,
    visible,
    margin,
    inset,
    scrollElement: scroller.element,
    /** A ref for each rendered row, which needs `data-index`; undefined unless measuring. */
    measureElement: measureRows ? virtualizer.measureElement : undefined,
    // The margin and inset are measured in the same layout effect that finds the scroller.
    measured: scroller.ready
  }
}

// Range rows key by index: ids would change the key function on every load.
const indexKey = (index: number) => `@${index}`

/** Range mode's window: reports the first row on screen, restores `row`, and asks for the ranges in view. */
export function useRangeWindow<Body extends HTMLElement = HTMLDivElement>({
  range,
  row,
  onRow,
  ...sizing
}: RowSizing & {
  range: RecordsRangeState
  row: number
  onRow?: (row: number) => void
}) {
  const { rowAt, show, count, total: rowTotal, loading } = range
  // Measured rows key by query too, so a new query's rows start from the
  // estimate instead of the last query's heights at the same index.
  const queryKey = useCallback(
    (index: number) => `${range.key}${indexKey(index)}`,
    [range.key]
  )
  const loaded = useCallback(
    (index: number) => rowAt(index) !== undefined,
    [rowAt]
  )
  const [position] = useState(rowPosition)
  const onChange = useRowReport({
    position,
    onRow: (next) => onRow?.(next)
  })
  const {
    bodyRef,
    virtualizer,
    view,
    visible,
    margin,
    inset,
    scrollElement,
    measured,
    measureElement
  } = useRowWindow<Body>({
    count,
    getItemKey: sizing.measure ? queryKey : indexKey,
    onChange,
    measureInset: stuckInset,
    ...sizing
  })
  const first = visible?.startIndex
  const last = visible?.endIndex
  // A layout effect, before the plan below, so a first plan knows its target.
  const plan = useRowRestore({
    virtualizer,
    measured,
    scrollElement,
    query: range.key,
    row,
    total: rowTotal,
    loaded,
    inset,
    margin,
    position,
    view: show
  })
  // Loading is a dep so a settled range plans again; row, so a new target
  // does; the key, so a new query plans even when the window hasn't moved.
  useEffect(() => {
    if (measured && first !== undefined && last !== undefined) plan(first, last)
  }, [measured, first, last, count, loading, row, range.key, plan])
  return { bodyRef, measureElement, view }
}

/**
 * Holds measured rows' body at its last committed height. React removes
 * swapped rows before inserting their replacements, and WebKit clamps the
 * scroll to the shorter body in between; fixed rows hold their total instead.
 */
export function useHeldHeight(
  bodyRef: RefObject<HTMLElement | null>,
  enabled: boolean
) {
  useLayoutEffect(() => {
    const body = bodyRef.current
    if (!body || !enabled) return
    body.style.minBlockSize = ''
    // Floored, so the hold never outgrows the rows.
    body.style.minBlockSize = `${Math.floor(body.getBoundingClientRect().height)}px`
  })
}
