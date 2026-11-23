'use client'

import { type KeyboardEvent, type RefAttributes, useMemo, useRef } from 'react'

import { MagnifyingGlassIcon, XIcon } from '@phosphor-icons/react'

import { cn } from '@oztix/roadie-core/utils'

import { mergeRefs } from '../../utils/mergeRefs'
import { Autocomplete, type AutocompleteInputProps } from '../Autocomplete'
import { badgeVariants } from '../Badge'
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
  ref,
  ...props
}: CommandPaletteInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const mergedRef = useMemo(() => mergeRefs(inputRef, ref), [ref])
  const { scope, setScope, scopes } = useCommandPaletteScope()
  const { page, pop } = useCommandPalettePages()

  const tabbing = !page && scopes.length > 1
  const index = scopes.indexOf(scope)
  const scopeAt = (step: 1 | -1) => (tabbing ? scopes[index + step] : undefined)

  // Tab and Shift+Tab change type as QueryField's change operator, and leave
  // the input past either end. The arrows do too, where they couldn't move
  // the caret.
  function changeScope(event: KeyboardEvent<HTMLInputElement>) {
    const { selectionStart, selectionEnd, value } = event.currentTarget
    const tabKey =
      event.key === 'Tab' && !event.altKey && !event.metaKey && !event.ctrlKey
    const step = tabKey
      ? event.shiftKey
        ? -1
        : 1
      : event.key === 'ArrowLeft' && selectionEnd === 0
        ? -1
        : event.key === 'ArrowRight' && selectionStart === value.length
          ? 1
          : 0
    const next = scopes[index + step]
    if (step === 0 || next === undefined) return
    if (tabKey ? event.nativeEvent.isComposing : isHeldOrComposing(event))
      return
    event.preventDefault()
    setScope(next)
  }

  const keyShortcuts = [
    scopeAt(1) !== undefined && 'Tab',
    scopeAt(-1) !== undefined && 'Shift+Tab'
  ]
    .filter(Boolean)
    .join(' ')

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
        <button
          type='button'
          data-slot='command-palette-page-chip'
          aria-label={`${page.label}, back to ${page.previousLabel ?? 'all commands'}`}
          className={cn(
            badgeVariants({ emphasis: 'subtle' }),
            'is-interactive max-w-[40%] shrink-0'
          )}
          onClick={() => {
            pop()
            inputRef.current?.focus()
          }}
        >
          <span className='min-w-0 truncate'>{page.label}</span>
        </button>
      ) : null}
      <Autocomplete.Input
        ref={mergedRef}
        data-slot='command-palette-input'
        aria-label={ariaLabel}
        aria-keyshortcuts={keyShortcuts || undefined}
        className={cn('min-h-14 text-base', className)}
        onKeyDown={(event) => {
          onKeyDown?.(event)
          if (event.defaultPrevented) return
          if (page) {
            if (event.key === 'Backspace' && event.currentTarget.value === '') {
              event.preventDefault()
              pop()
            }
          } else if (tabbing) changeScope(event)
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
