'use client'

import { useLayoutEffect, useRef, useState } from 'react'

import { useVirtualizer, useWindowVirtualizer } from '@tanstack/react-virtual'

import { findScrollParent } from '../Records/scrollParent'
import { ROW_REM } from './RecordTableRow'
import { type Watched, firstClearRow } from './rowPosition'
import { RECORDS_SCROLLER } from './tableFocus'

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

type Scroller = { element: HTMLElement | null; ready: boolean }

export type RowWindowOptions = {
  count: number
  getItemKey: (index: number) => string
  onChange?: (virtualizer: Watched) => void
  /** Measures the px a scrolled-to row keeps clear at the top, as for a stuck header. */
  measureInset?: (body: HTMLElement) => number
  /** Each row's height in rem, or its estimate when measured. */
  estimateRem?: number
  /** Measures each rendered row through `measureElement`, for rows that size to their content. */
  measure?: boolean
  /** Rem between rows. */
  gapRem?: number
}

export function useRowWindow<Body extends HTMLElement = HTMLDivElement>({
  count,
  getItemKey,
  onChange,
  measureInset,
  estimateRem = ROW_REM,
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

  return {
    bodyRef,
    virtualizer,
    items,
    total: virtualizer.getTotalSize(),
    /** The rows on screen, without overscan; set by getVirtualItems. */
    visible: virtualizer.range,
    /** The first row wholly below the stuck header. */
    firstClear: firstClearRow(items, virtualizer.scrollOffset ?? 0, inset),
    margin,
    inset,
    scrollElement: scroller.element,
    /** A ref for each rendered row, which needs `data-index`; undefined unless measuring. */
    measureElement: measureRows ? virtualizer.measureElement : undefined,
    // The margin and inset are measured in the same layout effect that finds the scroller.
    measured: scroller.ready
  }
}
