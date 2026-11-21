'use client'

import type { ReactNode, RefAttributes } from 'react'

import { WarningIcon } from '@phosphor-icons/react'

import { cn } from '@oztix/roadie-core/utils'

import { Autocomplete, type AutocompleteStatusProps } from '../Autocomplete'
import { EmptyState } from '../EmptyState'
import { useCommandPaletteStatus, useOnOpenPage } from './CommandPaletteContext'

export type CommandPaletteErrorProps = AutocompleteStatusProps &
  RefAttributes<HTMLDivElement> & {
    /** A way to try again, such as a `Button` that searches again. */
    action?: ReactNode
  }

/** Shows its children as a danger empty state's title while the palette's `status` is `'error'`. */
export function CommandPaletteError({
  action,
  className,
  children,
  ...props
}: CommandPaletteErrorProps) {
  const failed = useCommandPaletteStatus() === 'error'
  if (!useOnOpenPage()) return null
  return (
    <Autocomplete.Status
      data-slot='command-palette-error'
      className={cn('not-sr-only empty:hidden', className)}
      {...props}
    >
      {failed ? (
        <EmptyState size='sm' intent='danger'>
          <EmptyState.IconTile>
            <WarningIcon weight='duotone' />
          </EmptyState.IconTile>
          <EmptyState.Title>{children}</EmptyState.Title>
          {action ? <EmptyState.Actions>{action}</EmptyState.Actions> : null}
        </EmptyState>
      ) : null}
    </Autocomplete.Status>
  )
}

CommandPaletteError.displayName = 'CommandPalette.Error'
