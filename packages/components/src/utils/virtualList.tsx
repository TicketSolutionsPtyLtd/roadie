'use client'

import {
  type ReactNode,
  type Ref,
  type RefObject,
  Suspense,
  createContext,
  lazy,
  use,
  useEffect,
  useRef
} from 'react'

import { mergeRefs } from './mergeRefs'

type ScrollToIndex = (index: number) => void

/** Set by a virtualized Root, so its List windows rows and a keyboard highlight can reach one off screen. */
export const VirtualListContext =
  createContext<RefObject<ScrollToIndex | null> | null>(null)

type VirtualRow = { index: number; size: number; measure: Ref<HTMLElement> }

export const VirtualRowContext = createContext<VirtualRow | null>(null)

// Split out so a list that isn't virtualized never loads the virtualiser.
const loadRows = () => import('./virtualRows')
const FilteredRows = lazy(loadRows)

export function useVirtualListRoot(virtualized: boolean | undefined) {
  const scrollToIndex = useRef<ScrollToIndex | null>(null)
  useEffect(() => {
    if (virtualized) void loadRows()
  }, [virtualized])
  function handleHighlight(details: { reason: string; index: number }) {
    if (virtualized && details.reason !== 'pointer' && details.index >= 0)
      scrollToIndex.current?.(details.index)
  }
  return [virtualized ? scrollToIndex : null, handleHighlight] as const
}

/**
 * Props an item spreads so a windowed row keeps its index, its place in the
 * whole list for screen readers, and its measured height.
 */
export function useVirtualItem<T extends HTMLElement>(ref?: Ref<T>) {
  const row = use(VirtualRowContext)
  if (!row) return { ref }
  return {
    ref: mergeRefs<T>(ref, row.measure as Ref<T>),
    index: row.index,
    'data-index': row.index,
    'aria-posinset': row.index + 1,
    'aria-setsize': row.size
  }
}

export type RowRenderer = (item: unknown, index: number) => ReactNode

/** A List's children, windowed when its Root is virtualized and they're a row function. */
export function useListChildren<Children>(children: Children) {
  const virtualized = use(VirtualListContext)
  if (!virtualized || typeof children !== 'function') return children
  return (
    <Suspense>
      <FilteredRows>{children as RowRenderer}</FilteredRows>
    </Suspense>
  )
}
