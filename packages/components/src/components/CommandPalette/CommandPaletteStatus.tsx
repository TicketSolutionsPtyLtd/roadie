'use client'

import type { RefAttributes } from 'react'

import { CircleNotchIcon } from '@phosphor-icons/react'

import { cn } from '@oztix/roadie-core/utils'

import { Autocomplete, type AutocompleteStatusProps } from '../Autocomplete'
import { useCommandPaletteStatus, useOnOpenPage } from './CommandPaletteContext'

export type CommandPaletteStatusProps = AutocompleteStatusProps &
  RefAttributes<HTMLDivElement>

/** A spinner and its text while the palette's `status` is `'loading'`, announced politely. */
export function CommandPaletteStatus({
  className,
  children = 'Searching…',
  ...props
}: CommandPaletteStatusProps) {
  const loading = useCommandPaletteStatus() === 'loading'
  if (!useOnOpenPage()) return null
  return (
    <Autocomplete.Status
      data-slot='command-palette-status'
      className={cn(
        'not-sr-only flex items-center gap-3 px-4 py-3 text-sm text-subtle empty:hidden',
        className
      )}
      {...props}
    >
      {loading ? (
        <>
          <CircleNotchIcon
            weight='bold'
            className='size-4 shrink-0 animate-spin'
            aria-hidden
          />
          {children}
        </>
      ) : null}
    </Autocomplete.Status>
  )
}

CommandPaletteStatus.displayName = 'CommandPalette.Status'
