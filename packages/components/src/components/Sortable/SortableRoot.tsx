'use client'

import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react'

import { useDirection } from '@base-ui/react/direction-provider'

import { useDevWarning } from '../../utils/useDevWarning'
import {
  SortableRootContext,
  type SortableRootContextValue
} from './SortableContext'
import { SortableHandle } from './SortableHandle'
import { SortableItem } from './SortableItem'
import {
  type SortableDrop,
  type SortableSource,
  createSortableGroup,
  sortableMonitor
} from './dnd'
import { dropIndex, moveAnnouncement, moveItem } from './order'

export type SortableMove = {
  /** The moved item's value. */
  value: string
  /** Its index before the move. */
  from: number
  /** Its index after the move. */
  to: number
}

export type SortableTransfer = {
  /** The moved item's value. */
  value: string
  /** The `value` of the list it left. */
  from: string
  /** The `value` of the list it joins. */
  to: string
  /** Its index in that list. */
  index: number
}

export type SortableRootProps = {
  /** Each item's `value`, in order. */
  items: readonly string[]
  /** Called with the new order after a drag or a Move menu choice. */
  onReorder: (next: string[], move: SortableMove) => void
  /** The direction items run in, which sets the drop edges and menu wording. @default 'vertical' */
  orientation?: 'vertical' | 'horizontal'
  /** Turns off dragging and the Move menu. @default false */
  disabled?: boolean
  /** Names the collection in announcements, as in "SKU moved to position 3 of 7 columns". */
  label?: string
  /** Connects lists: roots that share a `group` take each other's items by drag. Needs `value`. */
  group?: string
  /** Identifies this list in its `group`, as the transfer's `from` and `to`. */
  value?: string
  /** Called on the list an item from another list in its group is dropped into. Without it, the list takes no items from others. */
  onTransfer?: (transfer: SortableTransfer) => void
  /** Return false to refuse an item from another list. Called while it is dragged over this one. */
  canDrop?: (item: Pick<SortableTransfer, 'value' | 'from'>) => boolean
  children?: ReactNode
}

/**
 * Drag-to-reorder for a run of `Sortable.Item`s, with a Move menu on each
 * handle. Roots that share a `group` also drag items between each other.
 */
export function SortableRoot({
  items,
  onReorder,
  orientation: axis = 'vertical',
  disabled = false,
  label,
  group: shared,
  value: list,
  onTransfer,
  canDrop,
  children
}: SortableRootProps) {
  const dir = useDirection()
  const [locked] = useState(() => new Set<string>())
  // Kept across group and value changes, as a drag in flight carries it.
  const [identity] = useState(() => ({ locked }))
  const group = useMemo(
    () => createSortableGroup(shared, list, identity),
    [shared, list, identity]
  )
  const [announcement, setAnnouncement] = useState('')
  const props = {
    items,
    onReorder,
    axis,
    dir,
    label,
    disabled,
    list,
    onTransfer,
    canDrop
  }
  const latest = useRef(props)

  useEffect(() => {
    latest.current = props
  })

  useDevWarning(
    shared !== undefined &&
      list === undefined &&
      `Roadie: a Sortable in the "${shared}" group needs a value, or it can't take items from other lists.`
  )

  // Stable, so a re-render mid-drag never tears down the monitor.
  const [actions] = useState(() => {
    const names = new Map<string, string | undefined>()
    let focusTarget: string | null = null
    let frame = 0
    function move(itemValue: string, to: number, focus: boolean) {
      const { items, onReorder } = latest.current
      const from = items.indexOf(itemValue)
      if (from === -1 || from === to || to < 0 || to >= items.length) return
      focusTarget = focus ? itemValue : null
      onReorder(moveItem(items, from, to), { value: itemValue, from, to })
      announce(names.get(itemValue), to, items.length)
    }
    function announce(name: string | undefined, to: number, total: number) {
      const text = moveAnnouncement({
        name,
        to,
        total,
        collection: latest.current.label
      })
      // Emptied first, so the same message twice is still read twice. The
      // focus claim lapses with it, in case the move was never applied.
      setAnnouncement('')
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        focusTarget = null
        setAnnouncement(text)
      })
    }
    function transferFrom(source: SortableSource) {
      const { disabled, list, onTransfer, canDrop } = latest.current
      if (disabled || !onTransfer || list === undefined) return null
      if (source.list === undefined) return null
      const item = { value: source.value, from: source.list }
      return (canDrop?.(item) ?? true)
        ? { ...item, to: list, onTransfer }
        : null
    }
    function accepts(source: SortableSource) {
      return source.sameList || transferFrom(source) !== null
    }
    function drop({ source, target, edge }: SortableDrop) {
      // An item disabled mid-drag loses its draggable, but the drag in flight still lands here.
      if (source.locked) return
      const { items, axis, dir } = latest.current
      const from = source.sameList ? items.indexOf(source.value) : -1
      const to = dropIndex({
        from,
        target: items.indexOf(target),
        edge,
        axis,
        dir
      })
      if (source.sameList) return move(source.value, to, false)
      const transfer = transferFrom(source)
      if (!transfer) return
      const { onTransfer, ...item } = transfer
      onTransfer({ ...item, index: to })
      announce(source.label, to, items.length + 1)
    }
    return {
      move,
      drop,
      accepts,
      nameItem: (itemValue: string, name: string | undefined) => {
        names.set(itemValue, name)
        return () => {
          names.delete(itemValue)
        }
      },
      lockItem: (itemValue: string) => {
        locked.add(itemValue)
        return () => {
          locked.delete(itemValue)
        }
      },
      takeFocus: (itemValue: string) => {
        if (focusTarget !== itemValue) return false
        focusTarget = null
        return true
      }
    }
  })

  const value = useMemo<SortableRootContextValue>(
    () => ({
      items,
      axis,
      dir,
      disabled,
      group,
      move: actions.move,
      accepts: actions.accepts,
      nameItem: actions.nameItem,
      lockItem: actions.lockItem,
      takeFocus: actions.takeFocus,
      Item: SortableItem,
      Handle: SortableHandle
    }),
    [items, axis, dir, disabled, group, actions]
  )

  useEffect(() => {
    if (disabled) return
    return sortableMonitor({ group, axis, onDrop: actions.drop })
  }, [group, axis, disabled, actions])

  return (
    <SortableRootContext value={value}>
      {children}
      <span role='status' aria-live='polite' className='sr-only'>
        {announcement}
      </span>
    </SortableRootContext>
  )
}

SortableRoot.displayName = 'Sortable.Root'
