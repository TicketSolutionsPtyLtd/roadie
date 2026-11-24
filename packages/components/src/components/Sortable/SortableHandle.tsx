'use client'

import { use, useId, useMemo, useRef, useState } from 'react'

import { DotsSixIcon, DotsSixVerticalIcon } from '@phosphor-icons/react/ssr'

import { cn } from '@oztix/roadie-core/utils'

import { mergeRefs } from '../../utils/mergeRefs'
import type { ButtonHrefProps } from '../Button/Button'
import { IconButton, type IconButtonProps } from '../Button/IconButton'
import { SortableItemContext, useSortableRoot } from './SortableContext'
import type { SortableMenuOpening } from './SortableMoveMenu'
import { handleLabel } from './order'
import { sortableHandleVariants } from './variants'

export type SortableHandleProps = Omit<
  IconButtonProps,
  'aria-label' | 'children' | 'render' | 'disabled' | keyof ButtonHrefProps
> & {
  /** @default "Reorder {label}" from the item's `label` */
  'aria-label'?: string
}

type MoveMenuModule = typeof import('./SortableMoveMenu')

let loaded: MoveMenuModule | undefined
// Split out so a list nobody moves by menu never loads Base UI's menu.
const load = () =>
  import('./SortableMoveMenu').then((module) => (loaded = module))

/** Loads the Move menu ahead of its first open. A failed load is tried again by the next. */
export const preloadMoveMenu = () => void load().catch(() => {})

/**
 * Drags its item, and opens a Move menu on click or Enter for anyone not
 * dragging with a pointer.
 */
export function SortableHandle({
  className,
  size = 'sm',
  emphasis = 'subtler',
  onClick,
  onKeyDown,
  onPointerDown,
  ...props
}: SortableHandleProps) {
  const root = useSortableRoot('Sortable.Handle')
  const item = use(SortableItemContext)
  if (!item) throw new Error('Sortable.Handle must be inside a Sortable.Item')
  const id = useId()
  // The menu's code, once it has loaded and something has asked for the menu.
  const [menu, setMenu] = useState<
    (MoveMenuModule & { opening: SortableMenuOpening }) | null
  >(null)
  const asked = useRef<SortableMenuOpening | null>(null)
  const { setHandle } = item
  const ref = useMemo(
    () => mergeRefs(setHandle, props.ref),
    [setHandle, props.ref]
  )
  const DotsIcon = root.axis === 'vertical' ? DotsSixVerticalIcon : DotsSixIcon
  const shared = {
    id,
    'aria-label': handleLabel(item.label),
    size,
    emphasis,
    className: cn(sortableHandleVariants(), className),
    ...props
  }

  if (menu) {
    const { SortableMoveMenu, opening } = menu
    return (
      <SortableMoveMenu
        item={item}
        button={<IconButton {...shared} />}
        opening={opening}
        onClick={onClick}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
      >
        <DotsIcon weight='bold' />
      </SortableMoveMenu>
    )
  }

  function show(module: MoveMenuModule) {
    if (!asked.current) return
    setMenu({ ...module, opening: asked.current })
    asked.current = null
  }
  function ask(opening: SortableMenuOpening) {
    asked.current = opening
    if (loaded) show(loaded)
    else void load().then(show, () => {})
  }
  // A menu still loading would open over a drag or pull focus back, so what
  // asked for it lapses once the handle is pressed again or loses focus.
  const lapse = () => {
    asked.current = null
  }

  return (
    <IconButton
      {...shared}
      aria-haspopup='menu'
      aria-expanded={false}
      data-slot='sortable-handle'
      disabled={item.disabled}
      ref={ref}
      onPointerEnter={(event) => {
        props.onPointerEnter?.(event)
        preloadMoveMenu()
      }}
      onFocus={(event) => {
        props.onFocus?.(event)
        preloadMoveMenu()
      }}
      onBlur={(event) => {
        props.onBlur?.(event)
        lapse()
      }}
      onPointerDown={(event) => {
        onPointerDown?.(event)
        lapse()
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event)
        if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
        // As the menu's trigger does, or the key scrolls the page too.
        event.preventDefault()
        ask(event.key)
      }}
      onClick={(event) => {
        onClick?.(event)
        ask(event.detail === 0 ? 'click' : 'pointer')
      }}
    >
      <DotsIcon weight='bold' />
    </IconButton>
  )
}

SortableHandle.displayName = 'Sortable.Handle'
