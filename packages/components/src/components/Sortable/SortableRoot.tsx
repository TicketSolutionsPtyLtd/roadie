'use client'

import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react'

import { useDirection } from '@base-ui/react/direction-provider'

import {
  SortableRootContext,
  type SortableRootContextValue
} from './SortableContext'
import { SortableHandle } from './SortableHandle'
import { SortableItem } from './SortableItem'
import { createSortableGroup, sortableMonitor } from './dnd'
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
  const [announcement, setAnnouncement] = useState({ text: '', count: 0 })
  const focusRef = useRef<string | null>(null)
  const namesRef = useRef(new Map<string, string | undefined>())
  const latest = useRef({ items, onReorder, axis, dir, label })

  useEffect(() => {
    latest.current = { items, onReorder, axis, dir, label }
  })

  const value = useMemo<SortableRootContextValue>(() => {
    function move(itemValue: string, to: number, focus: boolean) {
      const { items, onReorder, label } = latest.current
      const from = items.indexOf(itemValue)
      if (from === -1 || from === to || to < 0 || to >= items.length) return
      if (focus) focusRef.current = itemValue
      onReorder(moveItem(items, from, to), { value: itemValue, from, to })
      const name = namesRef.current.get(itemValue)
      setAnnouncement((previous) => ({
        text: moveAnnouncement({
          name,
          to,
          total: items.length,
          collection: label
        }),
        count: previous.count + 1
      }))
    }
    return {
      items,
      axis,
      dir,
      disabled,
      group,
      move,
      nameItem: (itemValue, name) => {
        namesRef.current.set(itemValue, name)
        return () => {
          namesRef.current.delete(itemValue)
        }
      },
      takeFocus: (itemValue) => {
        if (focusRef.current !== itemValue) return false
        focusRef.current = null
        return true
      },
      Item: SortableItem,
      Handle: SortableHandle
    }
  }, [items, axis, dir, disabled, group])

  useEffect(() => {
    if (disabled) return
    return sortableMonitor({
      group,
      axis,
      onDrop: ({ value: dragged, target, edge }) => {
        const { items, axis, dir } = latest.current
        const to = dropIndex({
          from: items.indexOf(dragged),
          target: items.indexOf(target),
          edge,
          axis,
          dir
        })
        value.move(dragged, to, false)
      }
    })
  }, [group, axis, disabled, value])

  return (
    <SortableRootContext value={value}>
      {children}
      <span role='status' aria-live='polite' className='sr-only'>
        {/* A trailing space alternates so a repeated message is read again. */}
        {announcement.text
          ? `${announcement.text}${announcement.count % 2 ? '' : ' '}`
          : null}
      </span>
    </SortableRootContext>
  )
}

SortableRoot.displayName = 'Sortable.Root'
