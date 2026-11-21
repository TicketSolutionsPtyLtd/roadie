'use client'

import type { RefAttributes } from 'react'

import { Autocomplete, type AutocompleteEmptyProps } from '../Autocomplete'
import { EmptyState } from '../EmptyState'
import { useOnOpenPage } from './CommandPaletteContext'

export type CommandPaletteEmptyProps = AutocompleteEmptyProps &
  RefAttributes<HTMLDivElement>

/** Shows its children as an empty state's title when no command matches. */
export function CommandPaletteEmpty({
  children,
  ...props
}: CommandPaletteEmptyProps) {
  if (!useOnOpenPage()) return null
  return (
    <Autocomplete.Empty data-slot='command-palette-empty' {...props}>
      <EmptyState size='sm'>
        <EmptyState.Title>{children}</EmptyState.Title>
      </EmptyState>
    </Autocomplete.Empty>
  )
}

CommandPaletteEmpty.displayName = 'CommandPalette.Empty'
