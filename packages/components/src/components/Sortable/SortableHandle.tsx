'use client'

import { use, useRef, useState } from 'react'

import {
  ArrowDownIcon,
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

import { IconButton, type IconButtonProps } from '../Button/IconButton'
import { MenuContent } from '../Menu/MenuContent'
import { MenuItem } from '../Menu/MenuItem'
import { MenuRoot } from '../Menu/MenuRoot'
import { MenuTrigger } from '../Menu/MenuTrigger'
import { SortableItemContext, useSortableRoot } from './SortableContext'
import {
  type MoveDirection,
  type TextDirection,
  handleLabel,
  menuMoves,
  reorderLabel
} from './order'
import { sortableHandleVariants } from './variants'

export type SortableHandleProps = Omit<
  IconButtonProps,
  'aria-label' | 'children' | 'render'
> & {
  /** @default "Reorder {label}" from the item's `label` */
  'aria-label'?: string
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
 * Drags its item, and opens a Move menu on click or Enter for anyone not
 * dragging with a pointer.
 */
export function SortableHandle({
  className,
  disabled: disabledProp,
  size = 'sm',
  emphasis = 'subtler',
  onClick,
  onMouseDown,
  ...props
}: SortableHandleProps) {
  const root = useSortableRoot('Sortable.Handle')
  const item = use(SortableItemContext)
  if (!item) throw new Error('Sortable.Handle must be inside a Sortable.Item')
  const { value, label, index, setHandle } = item
  const [open, setOpen] = useState(false)
  // The menu opens on press, which would cover the list as a drag starts,
  // so a mouse press waits for the click a drag never sends.
  const pressedRef = useRef(false)
  const disabled = root.disabled || disabledProp
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
        ref={setHandle}
        onMouseDown={(event) => {
          onMouseDown?.(event)
          pressedRef.current = event.button === 0 && !open
        }}
        onClick={(event) => {
          onClick?.(event)
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
      </MenuContent>
    </MenuRoot>
  )
}

SortableHandle.displayName = 'Sortable.Handle'
