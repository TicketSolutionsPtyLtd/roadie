'use client'

import type { RefAttributes } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { Autocomplete, type AutocompleteListProps } from '../Autocomplete'

export type CommandPaletteListProps = AutocompleteListProps &
  RefAttributes<HTMLDivElement>

export function CommandPaletteList({
  className,
  ...props
}: CommandPaletteListProps) {
  return (
    <Autocomplete.List
      data-slot='command-palette-list'
      className={cn(
        'grid content-start gap-1 overflow-y-auto overscroll-contain p-2 empty:hidden',
        className
      )}
      {...props}
    />
  )
}

CommandPaletteList.displayName = 'CommandPalette.List'
