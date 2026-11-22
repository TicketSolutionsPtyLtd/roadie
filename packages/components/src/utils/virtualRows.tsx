'use client'

import { use, useLayoutEffect, useRef, useState } from 'react'

import { Combobox } from '@base-ui/react/combobox'
import { useVirtualizer } from '@tanstack/react-virtual'

import { findScrollParent } from '../components/Records/scrollParent'
import {
  type RowRenderer,
  VirtualListContext,
  VirtualRowContext
} from './virtualList'

const OVERSCAN = 8
// One `text-sm` option with `py-1.5`; each row is measured once it mounts.
const ROW_ESTIMATE = 32

/** The `top` of `element` within `scroller`'s content, as the virtualiser's `scrollMargin`. */
function offsetWithin(element: HTMLElement, scroller: HTMLElement) {
  return (
    element.getBoundingClientRect().top -
    scroller.getBoundingClientRect().top +
    scroller.scrollTop
  )
}

/** The filtered items of the Combobox or Autocomplete around it, drawn as a window of rows. */
export default function VirtualRows({ children }: { children: RowRenderer }) {
  const items = Combobox.useFilteredItems<unknown>()
  const scrollToIndex = use(VirtualListContext)
  const start = useRef<HTMLDivElement>(null)
  const [scroller, setScroller] = useState<HTMLElement | null>(null)
  const [margin, setMargin] = useState(0)
  const [gap, setGap] = useState(0)
  const empty = items.length === 0
  useLayoutEffect(() => {
    if (!start.current) return
    const parent = findScrollParent(start.current)
    // A list with a row gap puts one after the leading spacer too, so it counts as margin.
    const rowGap =
      parseFloat(getComputedStyle(start.current.parentElement!).rowGap) || 0
    setScroller(parent)
    setGap(rowGap)
    if (parent) setMargin(offsetWithin(start.current, parent) + rowGap)
  }, [empty])
  // eslint-disable-next-line react/incompatible-library
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scroller,
    estimateSize: () => ROW_ESTIMATE,
    overscan: OVERSCAN,
    scrollMargin: margin,
    gap
  })
  useLayoutEffect(() => {
    if (!scrollToIndex) return
    scrollToIndex.current = (index) =>
      virtualizer.scrollToIndex(index, { align: 'auto' })
    return () => {
      scrollToIndex.current = null
    }
  }, [scrollToIndex, virtualizer])
  const rows = virtualizer.getVirtualItems()
  const before = (rows[0]?.start ?? margin) - margin
  const after =
    virtualizer.getTotalSize() - (rows.at(-1)?.end ?? margin) + margin - gap
  // Leaves the list empty, so its `:empty` styles still apply.
  if (empty) return null
  return (
    <>
      <div ref={start} aria-hidden style={{ height: before }} />
      {rows.map((row) => (
        <VirtualRowContext
          key={row.key}
          value={{
            index: row.index,
            size: items.length,
            measure: virtualizer.measureElement
          }}
        >
          {children(items[row.index], row.index)}
        </VirtualRowContext>
      ))}
      <div aria-hidden style={{ height: Math.max(0, after) }} />
    </>
  )
}
