'use client'

import {
  type ReactNode,
  type RefAttributes,
  useLayoutEffect,
  useRef
} from 'react'

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

function ErrorState({
  action,
  children
}: {
  action: ReactNode
  children: ReactNode
}) {
  const content = useRef<HTMLDivElement>(null)
  // A retry that clears the error removes the focused button; this runs
  // before React detaches it, so focus can go back to the search.
  useLayoutEffect(() => {
    const element = content.current
    return () => {
      if (!element?.contains(document.activeElement)) return
      element
        .closest('[data-slot="command-palette"]')
        ?.querySelector<HTMLInputElement>('[data-slot="command-palette-input"]')
        ?.focus()
    }
  }, [])
  return (
    <EmptyState ref={content} size='sm' intent='danger'>
      <EmptyState.IconTile>
        <WarningIcon weight='duotone' />
      </EmptyState.IconTile>
      <EmptyState.Title>{children}</EmptyState.Title>
      {action ? <EmptyState.Actions>{action}</EmptyState.Actions> : null}
    </EmptyState>
  )
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
      className={cn('not-sr-only', className)}
      {...props}
    >
      {failed ? <ErrorState action={action}>{children}</ErrorState> : null}
    </Autocomplete.Status>
  )
}

CommandPaletteError.displayName = 'CommandPalette.Error'
