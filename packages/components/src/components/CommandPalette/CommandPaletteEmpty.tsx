'use client'

import type { RefAttributes } from 'react'

import { Autocomplete, type AutocompleteEmptyProps } from '../Autocomplete'
import { EmptyState } from '../EmptyState'
import { useCommandPaletteStatus, useOnOpenPage } from './CommandPaletteContext'

export type CommandPaletteEmptyProps = AutocompleteEmptyProps &
  RefAttributes<HTMLDivElement>

/** Shows its children as an empty state's title when no command matches, unless the palette is loading or has failed. */
export function CommandPaletteEmpty({
  children,
  ...props
}: CommandPaletteEmptyProps) {
  const idle = useCommandPaletteStatus() === 'idle'
  if (!useOnOpenPage()) return null
  return (
    <Autocomplete.Empty data-slot='command-palette-empty' {...props}>
      {idle ? (
        <EmptyState size='sm'>
          <EmptyState.Title>{children}</EmptyState.Title>
        </EmptyState>
      ) : null}
    </Autocomplete.Empty>
  )
}

CommandPaletteEmpty.displayName = 'CommandPalette.Empty'
