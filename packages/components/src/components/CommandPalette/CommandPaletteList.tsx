'use client'

import type { RefAttributes } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { Autocomplete, type AutocompleteListProps } from '../Autocomplete'
import { useCommandPalettePages, useOnOpenPage } from './CommandPaletteContext'

export type CommandPaletteListProps = AutocompleteListProps &
  RefAttributes<HTMLDivElement>

/** The commands. Inside a `CommandPalette.Page`, it's named for the page. */
export function CommandPaletteList({
  className,
  ...props
}: CommandPaletteListProps) {
  const { page } = useCommandPalettePages()
  if (!useOnOpenPage()) return null
  return (
    <Autocomplete.List
      data-slot='command-palette-list'
      aria-label={page?.label}
      className={cn(
        'grid content-start gap-1 overflow-y-auto overscroll-contain p-2 empty:hidden',
        className
      )}
      {...props}
    />
  )
}

CommandPaletteList.displayName = 'CommandPalette.List'
