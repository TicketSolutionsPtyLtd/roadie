'use client'

import type { RefAttributes } from 'react'

import { MagnifyingGlassIcon, XIcon } from '@phosphor-icons/react'

import { cn } from '@oztix/roadie-core/utils'

import { Autocomplete, type AutocompleteInputProps } from '../Autocomplete'
import { Dialog } from '../Dialog'

export type CommandPaletteInputProps = AutocompleteInputProps &
  RefAttributes<HTMLInputElement>

export function CommandPaletteInput({
  className,
  'aria-label': ariaLabel = 'Search',
  ...props
}: CommandPaletteInputProps) {
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
      <Autocomplete.Input
        data-slot='command-palette-input'
        aria-label={ariaLabel}
        className={cn('min-h-14 text-base', className)}
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
