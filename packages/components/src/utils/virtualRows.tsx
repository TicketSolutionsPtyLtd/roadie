'use client'

import {
  type RefObject,
  use,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from 'react'

import { Combobox } from '@base-ui/react/combobox'
import {
  type VirtualItem,
  type Virtualizer,
  measureElement as measureSize,
  useVirtualizer
} from '@tanstack/react-virtual'

import { findScrollParent } from '../components/Records/scrollParent'
import {
  type RowRenderer,
  type VirtualGroup,
  VirtualGroupContext,
  VirtualListContext,
  type VirtualRow,
  VirtualRowContext
} from './virtualList'

const OVERSCAN = 8
// One `text-sm` option with `py-1.5`; each row is measured once it mounts.
const ROW_ESTIMATE = 32
// One `text-xs` group label with `py-1.5`.
const LABEL_ESTIMATE = 28

type Group = { items: readonly unknown[] }

// As Base UI decides it: a list is grouped when its first item has an `items` array.
const isGroup = (item: unknown): item is Group =>
  typeof item === 'object' &&
  item !== null &&
  'items' in item &&
  Array.isArray(item.items)

/** Each group's label row, and the index of its first item across groups. */
type GroupLayout = { group: Group; label: number; first: number }

function layOut(groups: readonly Group[]) {
  let row = 0
  let first = 0
  const layout = groups.map((group) => {
    const entry = { group, label: row, first }
    row += 1 + group.items.length
    first += group.items.length
    return entry
  })
  return { layout, count: row }
}

/** The last entry whose `key` is at or before `value`. */
function lastAtOrBefore(
  layout: readonly GroupLayout[],
  value: number,
  key: 'label' | 'first'
) {
  let low = 0
  let high = layout.length - 1
  while (low < high) {
    const middle = (low + high + 1) >> 1
    if (layout[middle]![key] <= value) low = middle
    else high = middle - 1
  }
  return low
}

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
  const grouped = isGroup(items[0])
  const { layout, count } = useMemo(
    () =>
      grouped
        ? layOut(items as readonly Group[])
        : { layout: [], count: items.length },
    [grouped, items]
  )
  const scrollToIndex = use(VirtualListContext)
  const start = useRef<HTMLDivElement>(null)
  const [scroller, setScroller] = useState<HTMLElement | null>(null)
  const [margin, setMargin] = useState(0)
  const [gap, setGap] = useState(0)
  const [labelHeight, setLabelHeight] = useState(0)
  const empty = count === 0
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
    count,
    getScrollElement: () => scroller,
    estimateSize: grouped
      ? (row) =>
          layout[lastAtOrBefore(layout, row, 'label')]!.label === row
            ? LABEL_ESTIMATE
            : ROW_ESTIMATE
      : () => ROW_ESTIMATE,
    overscan: OVERSCAN,
    scrollMargin: margin,
    // A group's items aren't the list's children, so its gaps go in the labels.
    gap: grouped ? 0 : gap,
    scrollPaddingStart: grouped ? labelHeight : 0,
    measureElement: grouped
      ? (element, entry, instance) =>
          element.hasAttribute('data-virtual-label')
            ? measureLabel(element as HTMLElement, gap, setLabelHeight)
            : element.hasAttribute('data-virtual-group')
              ? lead(element, gap)
              : measureSize(element, entry, instance)
      : measureSize
  })
  useLayoutEffect(() => {
    if (!scrollToIndex) return
    scrollToIndex.current = (index) =>
      virtualizer.scrollToIndex(
        grouped ? index + lastAtOrBefore(layout, index, 'first') + 1 : index,
        { align: 'auto' }
      )
    return () => {
      scrollToIndex.current = null
    }
  }, [scrollToIndex, virtualizer, grouped, layout])
  // A sticky label pins inside the scroller's padding, so it's lifted over it.
  useLayoutEffect(() => {
    if (!scroller || !grouped || !labelHeight) return
    const { style } = scroller
    const before = style.scrollPaddingTop
    const padding = parseFloat(getComputedStyle(scroller).paddingTop) || 0
    style.scrollPaddingTop = `${labelHeight}px`
    style.setProperty('--virtual-label-top', `${-padding}px`)
    return () => {
      style.scrollPaddingTop = before
      style.removeProperty('--virtual-label-top')
    }
  }, [scroller, grouped, labelHeight])
  // Leaves the list empty, so its `:empty` styles still apply.
  if (empty) return null
  const rows = virtualizer.getVirtualItems()
  if (grouped) {
    return (
      <GroupedRows
        rows={rows}
        layout={layout}
        virtualizer={virtualizer}
        margin={margin}
        gap={gap}
        start={start}
      >
        {children}
      </GroupedRows>
    )
  }
  const before = (rows[0]?.start ?? margin) - margin
  const after =
    virtualizer.getTotalSize() - (rows.at(-1)?.end ?? margin) + margin - gap
  return (
    <>
      <div ref={start} aria-hidden style={{ height: before }} />
      {rows.map((row) => (
        <VirtualRowContext
          key={row.key}
          value={{
            index: row.index,
            row: row.index,
            position: row.index + 1,
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

/**
 * The space a label row takes above its label: the list's gap and the
 * group's top margin, then the group's top padding and border. A group with
 * no label is measured as this alone.
 */
function lead(group: Element, gap: number) {
  const style = getComputedStyle(group)
  const between =
    group.getAttribute('data-virtual-group') === 'first'
      ? 0
      : gap + (parseFloat(style.marginTop) || 0)
  return (
    between +
    (parseFloat(style.paddingTop) || 0) +
    (parseFloat(style.borderTopWidth) || 0)
  )
}

/**
 * A label row is its group's lead, then the label. Its box is read from its
 * size, not its place, since a stuck label sits wherever the scroll put it.
 */
function measureLabel(
  label: HTMLElement,
  gap: number,
  onHeight: (height: number) => void
) {
  const height = label.getBoundingClientRect().height
  // A label sticks over the top of the list, so a row scrolled into view stops below it.
  onHeight(height)
  const group = label.closest('[data-virtual-group]')
  return height + (group ? lead(group, gap) : 0)
}

/**
 * The groups with a row in the window, each with only those items. A group's
 * label renders whenever any of its items does, so the group keeps its name,
 * and sits right above them when its own row has scrolled past, where it
 * sticks to the top.
 */
function GroupedRows({
  rows,
  layout,
  virtualizer,
  margin,
  gap,
  start,
  children
}: {
  rows: VirtualItem[]
  layout: readonly GroupLayout[]
  virtualizer: Virtualizer<HTMLElement, Element>
  margin: number
  gap: number
  start: RefObject<HTMLDivElement | null>
  children: RowRenderer
}) {
  const shown: { at: number; items: VirtualItem[]; label: boolean }[] = []
  for (const row of rows) {
    const at = lastAtOrBefore(layout, row.index, 'label')
    let entry = shown.at(-1)
    if (entry?.at !== at) {
      entry = { at, items: [], label: false }
      shown.push(entry)
    }
    if (layout[at]!.label === row.index) entry.label = true
    else entry.items.push(row)
  }
  const firstShown = shown[0]
  const lastRow = rows.at(-1)
  let before = 0
  if (firstShown) {
    const { label } = layout[firstShown.at]!
    const top = firstShown.label
      ? virtualizer.measurementsCache[label]!.start
      : firstShown.items[0]!.start - virtualizer.measurementsCache[label]!.size
    before = top - margin + (firstShown.at > 0 ? gap : 0)
  }
  const after =
    virtualizer.getTotalSize() + margin - (lastRow?.end ?? margin) - gap
  return (
    <>
      <div ref={start} aria-hidden style={{ height: Math.max(0, before) }} />
      {shown.map(({ at, items }) => {
        const { group, label, first } = layout[at]!
        const byItem = new Map<unknown, VirtualRow>()
        for (const row of items) {
          const local = row.index - label - 1
          byItem.set(group.items[local], {
            index: first + local,
            row: row.index,
            position: local + 1,
            size: group.items.length,
            measure: virtualizer.measureElement
          })
        }
        const from = items.length > 0 ? items[0]!.index - label - 1 : 0
        const value: VirtualGroup = {
          first: at === 0,
          label: { row: label, measure: virtualizer.measureElement },
          rows: byItem
        }
        return (
          <VirtualGroupContext key={at} value={value}>
            {children(
              { ...group, items: group.items.slice(from, from + items.length) },
              at
            )}
          </VirtualGroupContext>
        )
      })}
      <div aria-hidden style={{ height: Math.max(0, after) }} />
    </>
  )
}
