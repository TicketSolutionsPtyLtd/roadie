'use client'

import { use, useId, useMemo, useRef, useState } from 'react'

import { DotsSixIcon, DotsSixVerticalIcon } from '@phosphor-icons/react/ssr'

import { cn } from '@oztix/roadie-core/utils'

import { mergeRefs } from '../../utils/mergeRefs'
import { IconButton } from '../Button/IconButton'
import {
  SortableItemContext,
  type SortableMenuOpening,
  SortableOpeningContext,
  useSortableRoot
} from './SortableContext'
import type { SortableHandleProps } from './SortableHandle'
import { handleLabel } from './order'
import { sortableHandleVariants } from './variants'

type HandleModule = typeof import('./SortableHandle')

let loaded: HandleModule | undefined
// The handle with the menu loads on `preload` or the first press or key that
// asks for one, so a list nobody moves by menu never loads Base UI's menu.
const load = () =>
  import('./SortableHandle').then((module) => (loaded = module))

/**
 * `Sortable.Handle`: a plain menu button until something asks for its Move
 * menu, then the handle that has one.
 */
export function SortableHandleLazy(props: SortableHandleProps) {
  const root = useSortableRoot('Sortable.Handle')
  const item = use(SortableItemContext)
  if (!item) throw new Error('Sortable.Handle must be inside a Sortable.Item')
  const id = useId()
  const [menu, setMenu] = useState<
    (HandleModule & { opening: SortableMenuOpening }) | null
  >(null)
  // What asked for a menu that is still loading. It lapses once the handle
  // is pressed again or loses focus, or the menu would open over a drag or
  // pull focus back.
  const asked = useRef<SortableMenuOpening | null>(null)
  const pressed = useRef<Event | null>(null)
  const { setHandle } = item
  const { ref: forwarded } = props
  const ref = useMemo(
    () => mergeRefs(setHandle, forwarded),
    [setHandle, forwarded]
  )

  if (menu)
    return (
      <SortableOpeningContext value={menu.opening}>
        <menu.SortableHandle id={id} {...props} />
      </SortableOpeningContext>
    )

  const {
    className,
    size = 'sm',
    emphasis = 'subtler',
    onClick,
    onKeyDown,
    onPointerDown,
    ...rest
  } = props
  const DotsIcon = root.axis === 'vertical' ? DotsSixVerticalIcon : DotsSixIcon
  function show(module: HandleModule) {
    if (!asked.current) return
    setMenu({ ...module, opening: asked.current })
    asked.current = null
  }
  function ask(opening: SortableMenuOpening) {
    asked.current = opening
    if (loaded) show(loaded)
    else void load().then(show, () => {})
  }

  return (
    <IconButton
      id={id}
      aria-label={handleLabel(item.label)}
      size={size}
      emphasis={emphasis}
      className={cn(sortableHandleVariants(), className)}
      {...rest}
      aria-haspopup='menu'
      aria-expanded={false}
      data-slot='sortable-handle'
      disabled={item.disabled}
      ref={ref}
      onPointerEnter={(event) => {
        rest.onPointerEnter?.(event)
        SortableHandleLazy.preload()
      }}
      onFocus={(event) => {
        rest.onFocus?.(event)
        SortableHandleLazy.preload()
      }}
      onBlur={(event) => {
        rest.onBlur?.(event)
        asked.current = null
      }}
      onPointerDown={(event) => {
        onPointerDown?.(event)
        asked.current = null
        pressed.current = event.nativeEvent
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event)
        if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
        // As the menu's trigger does, or the key scrolls the page too.
        event.preventDefault()
        ask([event.nativeEvent])
      }}
      onClick={(event) => {
        onClick?.(event)
        // A keyboard's click follows no press, whatever the pointer did last.
        const press = event.detail === 0 ? null : pressed.current
        pressed.current = null
        ask(press ? [press, event.nativeEvent] : [event.nativeEvent])
      }}
    >
      <DotsIcon weight='bold' />
    </IconButton>
  )
}

// A failed load is tried again by the next press, pointer, or focus.
SortableHandleLazy.preload = () => void load().catch(() => {})
