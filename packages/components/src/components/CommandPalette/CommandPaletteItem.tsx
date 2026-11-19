'use client'

import type { ReactNode, RefAttributes } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { Autocomplete, type AutocompleteItemProps } from '../Autocomplete'
import { KbdShortcut } from '../Kbd/KbdShortcut'
import { RoadieRoutedLink } from '../Link/RoadieRoutedLink'
import { useCommandPaletteClose } from './CommandPaletteContext'

export type CommandPaletteItemProps = Omit<AutocompleteItemProps, 'onSelect'> &
  RefAttributes<HTMLDivElement> & {
    /** Makes the command a link. Internal paths route through `RoadieLinkProvider`; external URLs open in a new tab. */
    href?: string
    /** Runs when the command is picked, before the palette closes. */
    onSelect?: () => void
    /** An icon before the label, such as a Phosphor icon at `size-4`. */
    icon?: ReactNode
    /** A keyboard shortcut hint drawn after the label, such as `'mod+e'`. */
    shortcut?: ReactNode
  }

export function CommandPaletteItem({
  href,
  onSelect,
  icon,
  shortcut,
  render,
  className,
  children,
  onClick,
  ...props
}: CommandPaletteItemProps) {
  const close = useCommandPaletteClose()
  return (
    <Autocomplete.Item
      data-slot='command-palette-item'
      render={
        render ??
        (href === undefined ? undefined : <RoadieRoutedLink href={href} />)
      }
      className={cn('min-h-10 justify-start gap-3 py-2', className)}
      onClick={(event) => {
        onClick?.(event)
        if (event.defaultPrevented) return
        onSelect?.()
        close()
      }}
      {...props}
    >
      {icon}
      <span className='min-w-0 flex-1 truncate'>{children}</span>
      {shortcut != null && <KbdShortcut shortcut={shortcut} />}
    </Autocomplete.Item>
  )
}

CommandPaletteItem.displayName = 'CommandPalette.Item'
