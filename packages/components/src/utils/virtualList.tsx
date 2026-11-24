'use client'

import {
  type ReactNode,
  type Ref,
  type RefCallback,
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

/**
 * One windowed item: `index` is Base UI's, counted across groups, `row` the
 * virtualiser's, which counts group labels too, and `position` and `size`
 * its place in its set (its group, or the whole list).
 */
export type VirtualRow = {
  index: number
  row: number
  position: number
  size: number
  measure: Ref<HTMLElement>
}

export const VirtualRowContext = createContext<VirtualRow | null>(null)

/** A group in a windowed list: its label's row, and its items' rows by item. */
export type VirtualGroup = {
  first: boolean
  label: { row: number; measure: Ref<HTMLElement> }
  rows: ReadonlyMap<unknown, VirtualRow>
}

export const VirtualGroupContext = createContext<VirtualGroup | null>(null)

// Split out so a list that isn't virtualized never loads the virtualiser.
const loadRows = () => import('./virtualRows')
const FilteredRows = lazy(loadRows)

export function useVirtualListRoot(virtualized: boolean | undefined) {
  const scrollToIndex = useRef<ScrollToIndex | null>(null)
  // Base UI clears a pointer's highlight when its row scrolls out of the
  // window and unmounts, or the pointer leaves, then in the same task
  // highlights the first row again with no reason. Following that would snap
  // the list back to its top as someone scrolls it, so a highlight just after
  // a pointer clears one is let be, unless it's the keyboard's. The hold lasts
  // two frames at most, a margin, so it can't outlast the pointer.
  const held = useRef(false)
  const holds = useRef(0)
  useEffect(() => {
    if (virtualized) void loadRows()
  }, [virtualized])
  function handleHighlight(details: { reason: string; index: number }) {
    if (details.reason === 'pointer') {
      if (details.index < 0) holdAfterClear()
      return
    }
    const skip = held.current && details.reason !== 'keyboard'
    held.current = false
    if (virtualized && !skip && details.index >= 0)
      scrollToIndex.current?.(details.index)
  }
  function holdAfterClear() {
    const hold = (holds.current += 1)
    held.current = true
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        if (holds.current === hold) held.current = false
      })
    )
  }
  /**
   * Call on a typed query. Base UI returns a list it doesn't window to its
   * top, where the first match is, but leaves a windowed one where it was.
   */
  function handleTyped() {
    if (virtualized) scrollToIndex.current?.(0)
  }
  return [
    virtualized ? scrollToIndex : null,
    { handleHighlight, handleTyped }
  ] as const
}

/**
 * Props an item spreads so a windowed row keeps its index, its place in its
 * set for screen readers, and its measured height. In a group it's found by
 * `value` when no `Collection` around it says which row it is.
 */
export function useVirtualItem<T extends HTMLElement>(
  ref?: Ref<T>,
  value?: unknown
) {
  const own = use(VirtualRowContext)
  const group = use(VirtualGroupContext)
  const row = own ?? group?.rows.get(value)
  if (!row) return { ref }
  return {
    ref: mergeRefs<T>(ref, row.measure as Ref<T>),
    index: row.index,
    'data-index': row.row,
    'aria-posinset': row.position,
    'aria-setsize': row.size
  }
}

/**
 * Props a group spreads in a windowed list. Every group but the first takes
 * its top margin, whatever comes before it, so the space the virtualiser
 * measured doesn't change as the window moves.
 */
export function useVirtualGroup<T extends HTMLElement>(ref?: Ref<T>) {
  const group = use(VirtualGroupContext)
  if (!group) return { ref }
  const { row, measure } = group.label
  // A group with no label sizes its label's row itself.
  const unlabelled: RefCallback<T> = (element) => {
    if (!element || element.querySelector('[data-virtual-label]')) return
    if (typeof measure !== 'function') return
    element.setAttribute('data-index', String(row))
    measure(element)
    return () => {
      measure(null)
    }
  }
  return {
    ref: mergeRefs<T>(ref, unlabelled),
    'data-virtual-group': group.first ? 'first' : 'rest'
  }
}

/** Props a group label spreads in a windowed list, so it's measured and sticks to the top. */
export function useVirtualGroupLabel<T extends HTMLElement>(ref?: Ref<T>) {
  const group = use(VirtualGroupContext)
  if (!group) return { ref }
  return {
    ref: mergeRefs<T>(ref, group.label.measure as Ref<T>),
    'data-index': group.label.row,
    'data-virtual-label': ''
  }
}

/** A `Collection`'s child function, given each item's row and its index in the whole group. */
export function useCollectionChildren<Item>(
  children: (item: Item, index: number) => ReactNode
) {
  const group = use(VirtualGroupContext)
  if (!group) return children
  return (item: Item, index: number) => {
    const row = group.rows.get(item)
    if (!row) return children(item, index)
    return (
      <VirtualRowContext key={row.row} value={row}>
        {children(item, row.position - 1)}
      </VirtualRowContext>
    )
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
