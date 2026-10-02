'use client'

import {
  type ComponentProps,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'

import { cn } from '@oztix/roadie-core/utils'

import {
  type RoadieRenderProp,
  resolveRender,
  setRef
} from '../../utils/resolveRender'
import { useDevWarning } from '../../utils/useDevWarning'
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
  /** Stops this item being dragged or moved from its own Move menu. Other items can still move past it. @default false */
  disabled?: boolean
  /** Swaps the default `<div>`, e.g. `<li />` inside a list. */
  render?: RoadieRenderProp
  children?: React.ReactNode
}

/** One reorderable item. Sets `data-dragging` and `data-drop-edge` for styling. */
export function SortableItem({
  value,
  label,
  disabled: itemDisabled = false,
  render,
  className,
  children,
  ref: forwarded,
  ...props
}: SortableItemProps) {
  const root = useSortableRoot('Sortable.Item')
  const { items, axis, dir, group, nameItem, lockItem } = root
  const index = items.indexOf(value)
  // An unlisted item would take drops at index -1, so it isn't registered.
  const listed = index !== -1
  const disabled = root.disabled || itemDisabled || !listed
  const [element, setElement] = useState<HTMLElement | null>(null)
  const [handle, setHandle] = useState<HTMLElement | null>(null)
  const [dragging, setDragging] = useState(false)
  const [dropEdge, setDropEdge] = useState<SortableEdge | null>(null)
  // Set from an effect: a ref passed through to the render prop counts as read during render.
  useIsomorphicLayoutEffect(() => {
    if (!element) return
    setRef(forwarded, element)
    return () => setRef(forwarded, null)
  }, [element, forwarded])

  useEffect(() => nameItem(value, label), [nameItem, value, label])
  useEffect(() => {
    if (disabled) return lockItem(value)
  }, [lockItem, value, disabled])

  const position = useRef({ items, index, dir })
  useEffect(() => {
    position.current = { items, index, dir }
  })

  useEffect(() => {
    if (!element || !handle || !listed) return
    const cleanup = sortableItem({
      element,
      handle,
      group,
      value,
      axis,
      draggable: !disabled,
      onDraggingChange: setDragging,
      onDropEdgeChange: setDropEdge,
      movesTo: (source, edge) => {
        const { items, index, dir } = position.current
        const from = items.indexOf(source)
        return dropIndex({ from, target: index, edge, axis, dir }) !== from
      }
    })
    // A drag torn down mid-flight never gets its drop, so reset here.
    return () => {
      cleanup()
      setDragging(false)
      setDropEdge(null)
    }
  }, [element, handle, group, value, axis, disabled, listed])

  useDevWarning(
    !listed &&
      `Roadie: Sortable.Item "${value}" is not in its Sortable's items, so it can't move.`
  )

  useIsomorphicLayoutEffect(() => {
    if (handle && root.takeFocus(value)) handle.focus()
  }, [root, handle, value, index])

  const context = useMemo<SortableItemContextValue>(
    () => ({ value, label, index, disabled, setHandle }),
    [value, label, index, disabled]
  )

  return (
    <SortableItemContext value={context}>
      {resolveRender(
        'div',
        {
          'data-slot': 'sortable-item',
          'data-dragging': dragging ? '' : undefined,
          'data-drop-edge': dropEdge ?? undefined,
          'data-disabled': disabled ? '' : undefined,
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
