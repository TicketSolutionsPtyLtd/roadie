'use client'

import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react'

import { useDirection } from '@base-ui/react/direction-provider'

import {
  SortableRootContext,
  type SortableRootContextValue
} from './SortableContext'
import { SortableHandle } from './SortableHandle'
import { SortableItem } from './SortableItem'
import { type SortableDrop, createSortableGroup, sortableMonitor } from './dnd'
import { dropIndex, moveAnnouncement, moveItem } from './order'

export type SortableMove = {
  /** The moved item's value. */
  value: string
  /** Its index before the move. */
  from: number
  /** Its index after the move. */
  to: number
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
  children?: ReactNode
}

/** Drag-to-reorder for a run of `Sortable.Item`s, with a Move menu on each handle. */
export function SortableRoot({
  items,
  onReorder,
  orientation: axis = 'vertical',
  disabled = false,
  label,
  children
}: SortableRootProps) {
  const dir = useDirection()
  const [group] = useState(createSortableGroup)
  const [announcement, setAnnouncement] = useState('')
  const latest = useRef({ items, onReorder, axis, dir, label })

  useEffect(() => {
    latest.current = { items, onReorder, axis, dir, label }
  })

  // Stable, so a re-render mid-drag never tears down the monitor.
  const [actions] = useState(() => {
    const names = new Map<string, string | undefined>()
    let focusTarget: string | null = null
    let frame = 0
    function move(itemValue: string, to: number, focus: boolean) {
      const { items, onReorder, label } = latest.current
      const from = items.indexOf(itemValue)
      if (from === -1 || from === to || to < 0 || to >= items.length) return
      focusTarget = focus ? itemValue : null
      onReorder(moveItem(items, from, to), { value: itemValue, from, to })
      const text = moveAnnouncement({
        name: names.get(itemValue),
        to,
        total: items.length,
        collection: label
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
    function drop({ value: dragged, target, edge }: SortableDrop) {
      const { items, axis, dir } = latest.current
      const to = dropIndex({
        from: items.indexOf(dragged),
        target: items.indexOf(target),
        edge,
        axis,
        dir
      })
      move(dragged, to, false)
    }
    return {
      move,
      drop,
      nameItem: (itemValue: string, name: string | undefined) => {
        names.set(itemValue, name)
        return () => {
          names.delete(itemValue)
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
      nameItem: actions.nameItem,
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
