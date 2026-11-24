'use client'

import {
  type KeyboardEventHandler,
  type MouseEventHandler,
  type PointerEventHandler,
  type ReactElement,
  type ReactNode,
  useMemo,
  useRef,
  useState
} from 'react'

import {
  ArrowDownIcon,
  ArrowElbowDownRightIcon,
  ArrowLeftIcon,
  ArrowLineDownIcon,
  ArrowLineLeftIcon,
  ArrowLineRightIcon,
  ArrowLineUpIcon,
  ArrowRightIcon,
  ArrowUpIcon
} from '@phosphor-icons/react/ssr'

import { mergeRefs } from '../../utils/mergeRefs'
import { useIsomorphicLayoutEffect } from '../../utils/useIsomorphicLayoutEffect'
import { MenuContent } from '../Menu/MenuContent'
import { MenuItem } from '../Menu/MenuItem'
import { MenuRoot } from '../Menu/MenuRoot'
import { MenuSeparator } from '../Menu/MenuSeparator'
import { MenuTrigger } from '../Menu/MenuTrigger'
import {
  type SortableItemContextValue,
  useSortableRoot
} from './SortableContext'
import {
  type MoveDirection,
  type TextDirection,
  menuMoves,
  reorderLabel,
  transferLabel
} from './order'

/** What asked a handle for its menu: a press, a keyboard click, or an arrow key. */
export type SortableMenuOpening = 'pointer' | 'click' | 'ArrowDown' | 'ArrowUp'

export type SortableMoveMenuProps = {
  item: SortableItemContextValue
  /** The handle's button, which becomes the menu's trigger. */
  button: ReactElement<Record<string, unknown>>
  /** What asked for the menu before it had loaded, which opens it as it mounts. */
  opening: SortableMenuOpening
  onClick?: MouseEventHandler<HTMLButtonElement>
  onKeyDown?: KeyboardEventHandler<HTMLButtonElement>
  onPointerDown?: PointerEventHandler<HTMLButtonElement>
  children: ReactNode
}

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
 * A handle's button as the trigger of its Move menu. Loaded on the first
 * press or key that asks for the menu, so a list never moved by menu doesn't
 * carry one.
 */
export function SortableMoveMenu({
  item,
  button,
  opening,
  onClick,
  onKeyDown,
  onPointerDown,
  children
}: SortableMoveMenuProps) {
  const root = useSortableRoot('Sortable.Handle')
  const { value, label, index, disabled, setHandle } = item
  const [open, setOpen] = useState(false)
  // The menu opens on press, which would cover the list as a drag starts,
  // so a press waits for the click a drag never sends. Pointer, not mouse,
  // events: WebKit sends a tap no mouse events once its pointerdown is
  // cancelled, as a drawer does.
  const pressedRef = useRef(false)
  const [trigger, setTrigger] = useState<HTMLButtonElement | null>(null)
  const ref = useMemo(() => mergeRefs(setHandle, setTrigger), [setHandle])
  const first = useRef<SortableMenuOpening | null>(opening)
  const replaying = useRef(false)
  // What asked for the menu landed on the button this one replaces. A key is
  // sent on as the browser would send it, so Base UI opens the menu on the
  // item that key opens it on; a press opens it as a click on a trigger does.
  useIsomorphicLayoutEffect(() => {
    const asked = first.current
    if (!asked || !trigger) return
    first.current = null
    if (disabled) return
    if (asked === 'pointer') return setOpen(true)
    replaying.current = true
    if (asked === 'click') trigger.click()
    else
      trigger.dispatchEvent(
        new KeyboardEvent('keydown', { key: asked, bubbles: true })
      )
    replaying.current = false
  }, [trigger, disabled])
  // Read on open, as lists join and leave the group without re-rendering this one.
  const targets = open && !disabled ? root.transferTargets(value) : []

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
          onPointerDown?.(event)
          pressedRef.current = event.button === 0 && !open
        }}
        onKeyDown={(event) => {
          // Its first handler heard the key itself, as did everything above it.
          if (replaying.current) return event.stopPropagation()
          onKeyDown?.(event)
        }}
        onClick={(event) => {
          if (replaying.current) return event.stopPropagation()
          onClick?.(event)
          if (!pressedRef.current) return
          pressedRef.current = false
          setOpen(true)
        }}
        render={button}
      >
        {children}
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
