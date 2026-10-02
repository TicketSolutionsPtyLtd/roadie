'use client'

import { type ComponentProps, useEffect, useMemo, useState } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { type RoadieRenderProp, resolveRender } from '../../utils/resolveRender'
import { useIsomorphicLayoutEffect } from '../../utils/useIsomorphicLayoutEffect'
import {
  SortableItemContext,
  type SortableItemContextValue,
  useSortableRoot
} from './SortableContext'
import { sortableItem } from './dnd'
import { type SortableEdge, dropIndex } from './order'
import { sortableDropIndicatorVariants, sortableItemVariants } from './variants'

export type SortableItemProps = Omit<ComponentProps<'div'>, 'children'> & {
  /** Identifies the item; one of the root's `items`. */
  value: string
  /** The item's name in the Move menu and announcements, as in "Move SKU down". */
  label?: string
  /** Swaps the default `<div>`, e.g. `<li />` inside a list. */
  render?: RoadieRenderProp
  children?: React.ReactNode
}

/** One reorderable item. Sets `data-dragging` and `data-drop-edge` for styling. */
export function SortableItem({
  value,
  label,
  render,
  className,
  children,
  ...props
}: SortableItemProps) {
  const root = useSortableRoot('Sortable.Item')
  const { items, axis, dir, disabled, group, nameItem } = root
  const index = items.indexOf(value)
  const [element, setElement] = useState<HTMLElement | null>(null)
  const [handle, setHandle] = useState<HTMLElement | null>(null)
  const [dragging, setDragging] = useState(false)
  const [dropEdge, setDropEdge] = useState<SortableEdge | null>(null)

  useEffect(() => nameItem(value, label), [nameItem, value, label])

  useEffect(() => {
    if (!element || !handle) return
    return sortableItem({
      element,
      handle,
      group,
      value,
      axis,
      draggable: !disabled,
      onDraggingChange: setDragging,
      onDropEdgeChange: setDropEdge,
      movesTo: (source, edge) => {
        const from = items.indexOf(source)
        return dropIndex({ from, target: index, edge, axis, dir }) !== from
      }
    })
  }, [element, handle, group, value, axis, dir, disabled, items, index])

  useIsomorphicLayoutEffect(() => {
    if (handle && root.takeFocus(value)) handle.focus()
  }, [root, handle, value, index])

  const context = useMemo<SortableItemContextValue>(
    () => ({ value, label, index, setHandle }),
    [value, label, index]
  )

  return (
    <SortableItemContext value={context}>
      {resolveRender(
        'div',
        {
          'data-slot': 'sortable-item',
          'data-dragging': dragging ? '' : undefined,
          'data-drop-edge': dropEdge ?? undefined,
          ...props,
          ref: setElement,
          className: cn(sortableItemVariants(), className),
          children: (
            <>
              {children}
              {dropEdge ? (
                <span
                  aria-hidden='true'
                  data-slot='sortable-drop-indicator'
                  className={sortableDropIndicatorVariants({ edge: dropEdge })}
                />
              ) : null}
            </>
          )
        },
        render
      )}
    </SortableItemContext>
  )
}

SortableItem.displayName = 'Sortable.Item'
