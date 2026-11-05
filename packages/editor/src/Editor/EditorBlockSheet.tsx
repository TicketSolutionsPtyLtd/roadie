'use client'

import { type ReactNode, useEffect, useRef, useState } from 'react'

import {
  ArrowsClockwiseIcon,
  CaretLeftIcon,
  CaretRightIcon,
  type Icon
} from '@phosphor-icons/react'

import { Button, IconButton } from '@oztix/roadie-components/button'
import { Drawer } from '@oztix/roadie-components/drawer'
import { cn } from '@oztix/roadie-core/utils'

/** An action in the block's sheet, as its menu lists it on a desktop. */
export type SheetAction = {
  label: string
  icon: Icon
  disabled?: boolean
  intent?: 'danger'
  /** Leaves the sheet open. */
  keepOpen?: boolean
  run: () => void
}

export type SheetChoice = {
  label: string
  icon: Icon
  chosen: boolean
  run: () => void
}

type EditorBlockSheetProps = {
  open: boolean
  onClose: () => void
  onFinalFocus: () => boolean
  label: string
  /** The block, kept in view above the sheet. */
  block: HTMLElement | null
  moveUp: SheetAction
  moveDown: SheetAction
  actions: readonly SheetAction[]
  remove: SheetAction
  /** Turn into's kinds, or none for a block that isn't text. */
  kinds: readonly SheetChoice[]
}

type RowProps = {
  icon: Icon
  intent?: 'danger'
  chosen?: boolean
  disabled?: boolean
  trailing?: ReactNode
  onClick: () => void
  children: ReactNode
}

// A thumb's row, lighter than a button: the sheet is a list, not a form.
function Row({
  icon,
  intent,
  chosen,
  disabled,
  trailing,
  onClick,
  children
}: RowProps) {
  const RowIcon = icon
  return (
    <button
      type='button'
      disabled={disabled}
      aria-pressed={chosen}
      onClick={onClick}
      className={cn(
        'is-interactive flex min-h-11 items-center gap-3 rounded-lg px-3 text-start text-normal',
        intent === 'danger' && 'intent-danger text-subtle',
        chosen && 'emphasis-subtle is-selected'
      )}
    >
      <RowIcon weight='bold' className='size-4 shrink-0' aria-hidden />
      <span className='flex-1'>{children}</span>
      {trailing}
    </button>
  )
}

/**
 * The block menu on a phone: a half-height sheet below the block, with a
 * compact row to move it, its actions, and Turn into as a step of its own.
 */
export function EditorBlockSheet({
  open,
  onClose,
  onFinalFocus,
  label,
  block,
  moveUp,
  moveDown,
  actions,
  remove,
  kinds
}: EditorBlockSheetProps) {
  const [turning, setTurning] = useState(false)

  useEffect(() => {
    if (!open) setTurning(false)
  }, [open])

  // Into the top half, which the sheet leaves clear, as it opens and moves.
  useEffect(() => {
    if (!open || !block) return
    const { top, bottom } = block.getBoundingClientRect()
    if (top >= 16 && bottom <= window.innerHeight / 2) return
    block.scrollIntoView({ block: 'start' })
  }, [open, block])

  // Turn into's step swaps the buttons out, so focus goes to its first.
  const stepRef = useRef<HTMLDivElement>(null)
  const stepped = useRef(false)
  useEffect(() => {
    if (!stepped.current) {
      stepped.current = true
      return
    }
    stepRef.current?.querySelector<HTMLElement>('button')?.focus()
  }, [turning])

  const run = (action: SheetAction) => {
    if (!action.keepOpen) onClose()
    action.run()
  }

  return (
    <Drawer
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
      side='bottom'
    >
      <Drawer.Content size='sm' finalFocus={onFinalFocus}>
        <Drawer.Header className='flex items-center gap-2'>
          {turning ? (
            <IconButton
              size='sm'
              emphasis='subtler'
              aria-label='Back'
              onClick={() => setTurning(false)}
            >
              <CaretLeftIcon weight='bold' className='size-4' aria-hidden />
            </IconButton>
          ) : null}
          <Drawer.Title className='flex-1'>
            {turning ? 'Turn into' : label}
          </Drawer.Title>
          {turning ? null : (
            <>
              {[moveUp, moveDown].map((move) => {
                const MoveIcon = move.icon
                return (
                  <IconButton
                    key={move.label}
                    size='md'
                    emphasis='subtle'
                    aria-label={move.label}
                    disabled={move.disabled}
                    onClick={move.run}
                  >
                    <MoveIcon weight='bold' className='size-4' aria-hidden />
                  </IconButton>
                )
              })}
              <Button size='md' emphasis='subtle' onClick={onClose}>
                Done
              </Button>
            </>
          )}
        </Drawer.Header>
        <Drawer.Body ref={stepRef} className='grid content-start gap-0.5 pb-6'>
          {turning ? (
            kinds.map((kind) => (
              <Row
                key={kind.label}
                icon={kind.icon}
                chosen={kind.chosen}
                onClick={() => {
                  onClose()
                  kind.run()
                }}
              >
                {kind.label}
              </Row>
            ))
          ) : (
            <>
              {kinds.length > 0 ? (
                <Row
                  icon={ArrowsClockwiseIcon}
                  trailing={
                    <CaretRightIcon
                      weight='bold'
                      className='size-4 text-subtle'
                      aria-hidden
                    />
                  }
                  onClick={() => setTurning(true)}
                >
                  Turn into
                </Row>
              ) : null}
              {actions.map((action) => (
                <Row
                  key={action.label}
                  icon={action.icon}
                  disabled={action.disabled}
                  onClick={() => run(action)}
                >
                  {action.label}
                </Row>
              ))}
              <Row
                icon={remove.icon}
                intent='danger'
                onClick={() => run(remove)}
              >
                {remove.label}
              </Row>
            </>
          )}
        </Drawer.Body>
      </Drawer.Content>
    </Drawer>
  )
}
