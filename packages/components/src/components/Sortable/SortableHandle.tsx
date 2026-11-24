'use client'

import { use, useMemo, useRef, useState } from 'react'

import {
  ArrowDownIcon,
  ArrowElbowDownRightIcon,
  ArrowLeftIcon,
  ArrowLineDownIcon,
  ArrowLineLeftIcon,
  ArrowLineRightIcon,
  ArrowLineUpIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  DotsSixIcon,
  DotsSixVerticalIcon
} from '@phosphor-icons/react/ssr'

import { cn } from '@oztix/roadie-core/utils'

import { mergeRefs } from '../../utils/mergeRefs'
import { useIsomorphicLayoutEffect } from '../../utils/useIsomorphicLayoutEffect'
import type { ButtonHrefProps } from '../Button/Button'
import { IconButton, type IconButtonProps } from '../Button/IconButton'
import { MenuContent } from '../Menu/MenuContent'
import { MenuItem } from '../Menu/MenuItem'
import { MenuRoot } from '../Menu/MenuRoot'
import { MenuSeparator } from '../Menu/MenuSeparator'
import { MenuTrigger } from '../Menu/MenuTrigger'
import { SortableItemContext, useSortableRoot } from './SortableContext'
import {
  type MoveDirection,
  type TextDirection,
  handleLabel,
  menuMoves,
  reorderLabel,
  transferLabel
} from './order'
import { sortableHandleVariants } from './variants'

export type SortableHandleProps = Omit<
  IconButtonProps,
  'aria-label' | 'children' | 'render' | 'disabled' | keyof ButtonHrefProps
> & {
  /** @default "Reorder {label}" from the item's `label` */
  'aria-label'?: string
}

/** The events that asked a handle for its menu: an arrow key, a keyboard click, or a press and its click. */
export type SortableMenuOpening = readonly Event[]

function moveIcon(direction: MoveDirection, dir: TextDirection) {
  const start = dir === 'rtl' ? ArrowLineRightIcon : ArrowLineLeftIcon
  const end = dir === 'rtl' ? ArrowLineLeftIcon : ArrowLineRightIcon
  return {
    up: ArrowUpIcon,
    down: ArrowDownIcon,
    top: ArrowLineUpIcon,
    bottom: ArrowLineDownIcon,
    left: ArrowLeftIcon,
    right: ArrowRightIcon,
    start,
    end
  }[direction]
}

/**
 * `Sortable.Handle` with its Move menu. `SortableHandleLazy` loads it in
 * place of its plain button once something asks for the menu, which is
 * `opening`.
 */
export function SortableHandle({
  className,
  size = 'sm',
  emphasis = 'subtler',
  onClick,
  onKeyDown,
  onPointerDown,
  opening,
  ...props
}: SortableHandleProps & { opening?: SortableMenuOpening }) {
  const root = useSortableRoot('Sortable.Handle')
  const item = use(SortableItemContext)
  if (!item) throw new Error('Sortable.Handle must be inside a Sortable.Item')
  const { value, label, index, disabled, setHandle } = item
  const [open, setOpen] = useState(false)
  // The menu opens on press, which would cover the list as a drag starts,
  // so a press waits for the click a drag never sends. Pointer, not mouse,
  // events: WebKit sends a tap no mouse events once its pointerdown is
  // cancelled, as a drawer does.
  const pressedRef = useRef(false)
  const [trigger, setTrigger] = useState<HTMLButtonElement | null>(null)
  const ref = useMemo(() => mergeRefs(setHandle, setTrigger), [setHandle])
  const first = useRef(opening)
  const replaying = useRef(false)
  // What asked for the menu landed on the button this one replaces, so it is
  // sent again here. Base UI then opens the menu as it does for that key or
  // press: on its first or last item, at once, or with the page left free to
  // scroll under a finger.
  useIsomorphicLayoutEffect(() => {
    const asked = first.current
    if (!asked || !trigger) return
    first.current = undefined
    if (disabled) return
    replaying.current = true
    for (const event of asked) {
      const Again = event.constructor as typeof Event
      trigger.dispatchEvent(new Again(event.type, event))
    }
    replaying.current = false
  }, [trigger, disabled])
  // Read on open, as lists join and leave the group without re-rendering this one.
  const targets = open && !disabled ? root.transferTargets(value) : []
  const DotsIcon = root.axis === 'vertical' ? DotsSixVerticalIcon : DotsSixIcon

  return (
    <MenuRoot
      open={open}
      onOpenChange={(next, details) => {
        if (next && details.event?.type === 'mousedown') return
        setOpen(next)
      }}
    >
      <MenuTrigger
        data-slot='sortable-handle'
        disabled={disabled}
        ref={ref}
        onPointerDown={(event) => {
          if (replaying.current) event.stopPropagation()
          else onPointerDown?.(event)
          pressedRef.current = event.button === 0 && !open
        }}
        onKeyDown={(event) => {
          // The plain button heard it the first time, as did everything above it.
          if (replaying.current) event.stopPropagation()
          else onKeyDown?.(event)
        }}
        onClick={(event) => {
          if (replaying.current) event.stopPropagation()
          else onClick?.(event)
          if (!pressedRef.current) return
          pressedRef.current = false
          setOpen(true)
        }}
        render={
          <IconButton
            aria-label={handleLabel(label)}
            size={size}
            emphasis={emphasis}
            className={cn(sortableHandleVariants(), className)}
            {...props}
          />
        }
      >
        <DotsIcon weight='bold' />
      </MenuTrigger>
      <MenuContent align='start'>
        {menuMoves({
          index,
          total: root.items.length,
          axis: root.axis,
          dir: root.dir
        }).map(({ direction, to, disabled: unavailable }) => {
          const Icon = moveIcon(direction, root.dir)
          return (
            <MenuItem
              key={direction}
              disabled={unavailable || disabled}
              icon={<Icon weight='bold' />}
              onClick={() => root.move(value, to, true)}
            >
              {reorderLabel(direction, label)}
            </MenuItem>
          )
        })}
        {targets.length > 0 ? <MenuSeparator /> : null}
        {targets.map((target, index) => (
          <MenuItem
            key={index}
            icon={<ArrowElbowDownRightIcon weight='bold' />}
            onClick={target.move}
          >
            {transferLabel(target.name, label)}
          </MenuItem>
        ))}
      </MenuContent>
    </MenuRoot>
  )
}

// Not `Sortable.Handle`: that name, and its place in the docs, is the lazy one's.
SortableHandle.displayName = 'Sortable.Handle (menu)'
