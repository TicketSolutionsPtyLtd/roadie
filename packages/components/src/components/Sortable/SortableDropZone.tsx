'use client'

import { type ComponentProps, useEffect, useState } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import {
  type RoadieRenderProp,
  resolveRender,
  setRef
} from '../../utils/resolveRender'
import { useIsomorphicLayoutEffect } from '../../utils/useIsomorphicLayoutEffect'
import { useSortableRoot } from './SortableContext'
import { sortableDropZone } from './dnd'
import { sortableDropZoneVariants } from './variants'

export type SortableDropZoneProps = ComponentProps<'div'> & {
  /** Swaps the default `<div>`, e.g. `<ul />` for a list of items. */
  render?: RoadieRenderProp
}

/**
 * The list's area, so an item from another list can land past its last item
 * or in it while it is empty. Sets `data-drop-target` while one is over it.
 */
export function SortableDropZone({
  render,
  className,
  ref,
  ...props
}: SortableDropZoneProps) {
  const { group, axis, accepts, disabled } =
    useSortableRoot('Sortable.DropZone')
  const [element, setElement] = useState<HTMLElement | null>(null)
  const [active, setActive] = useState(false)
  // Set from an effect: a ref passed through to the render prop counts as read during render.
  useIsomorphicLayoutEffect(() => {
    if (!element) return
    setRef(ref, element)
    return () => setRef(ref, null)
  }, [element, ref])

  useEffect(() => {
    if (!element || disabled) return
    const cleanup = sortableDropZone({
      element,
      group,
      axis,
      accepts,
      onActiveChange: setActive
    })
    return () => {
      cleanup()
      setActive(false)
    }
  }, [element, group, axis, accepts, disabled])

  return resolveRender(
    'div',
    {
      'data-slot': 'sortable-drop-zone',
      'data-drop-target': active ? '' : undefined,
      ...props,
      ref: setElement,
      className: cn(sortableDropZoneVariants(), className)
    },
    render
  )
}

SortableDropZone.displayName = 'Sortable.DropZone'
