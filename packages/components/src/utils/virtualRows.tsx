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
  useLayoutEffect(() => {
    const parent = findScrollParent(start.current)
    setScroller(parent)
    if (parent && start.current) setMargin(offsetWithin(start.current, parent))
  }, [])
  // eslint-disable-next-line react/incompatible-library
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scroller,
    estimateSize: () => ROW_ESTIMATE,
    overscan: OVERSCAN,
    scrollMargin: margin
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
    virtualizer.getTotalSize() - (rows.at(-1)?.end ?? margin) + margin
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
