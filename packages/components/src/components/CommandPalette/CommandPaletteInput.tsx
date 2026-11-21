'use client'

import type { KeyboardEvent, RefAttributes } from 'react'

import { MagnifyingGlassIcon, XIcon } from '@phosphor-icons/react'

import { cn } from '@oztix/roadie-core/utils'

import { Autocomplete, type AutocompleteInputProps } from '../Autocomplete'
import { Badge } from '../Badge'
import { Dialog } from '../Dialog'
import {
  useCommandPalettePages,
  useCommandPaletteScope
} from './CommandPaletteContext'

export type CommandPaletteInputProps = AutocompleteInputProps &
  RefAttributes<HTMLInputElement>

// keyCode 229: Safari's last keydown of a composition reports isComposing false.
const isHeldOrComposing = (event: KeyboardEvent<HTMLInputElement>) =>
  event.shiftKey ||
  event.altKey ||
  event.metaKey ||
  event.ctrlKey ||
  event.nativeEvent.isComposing ||
  event.keyCode === 229

export function CommandPaletteInput({
  className,
  'aria-label': ariaLabel = 'Search',
  onKeyDown,
  ...props
}: CommandPaletteInputProps) {
  const { scope, setScope, scopes } = useCommandPaletteScope()
  const { page, pop } = useCommandPalettePages()

  // The arrows change type only where they couldn't move the caret.
  function changeScope(event: KeyboardEvent<HTMLInputElement>) {
    const { selectionStart, selectionEnd, value } = event.currentTarget
    const step =
      event.key === 'ArrowLeft' && selectionEnd === 0
        ? -1
        : event.key === 'ArrowRight' && selectionStart === value.length
          ? 1
          : 0
    const next = scopes[scopes.indexOf(scope) + step]
    if (step === 0 || next === undefined || isHeldOrComposing(event)) return
    event.preventDefault()
    setScope(next)
  }

  return (
    <div
      data-slot='command-palette-input-row'
      className='flex items-center gap-3 border-b border-subtler px-4'
    >
      <MagnifyingGlassIcon
        weight='bold'
        className='size-4 shrink-0 text-subtle'
        aria-hidden
      />
      {page ? (
        <Badge
          data-slot='command-palette-page-chip'
          emphasis='subtle'
          className='max-w-[40%] shrink-0 truncate'
        >
          {page.label}
        </Badge>
      ) : null}
      <Autocomplete.Input
        data-slot='command-palette-input'
        aria-label={ariaLabel}
        className={cn('min-h-14 text-base', className)}
        onKeyDown={(event) => {
          onKeyDown?.(event)
          if (event.defaultPrevented) return
          if (page) {
            if (event.key === 'Backspace' && event.currentTarget.value === '') {
              event.preventDefault()
              pop()
            }
          } else if (scopes.length > 1) changeScope(event)
        }}
        {...props}
      />
      <Dialog.Close
        data-slot='command-palette-close'
        aria-label='Close'
        className='is-interactive -me-2 grid size-10 place-items-center rounded-full sm:hidden'
      >
        <XIcon weight='bold' className='size-4' aria-hidden />
      </Dialog.Close>
    </div>
  )
}

CommandPaletteInput.displayName = 'CommandPalette.Input'
