'use client'

import type { ReactNode, RefAttributes } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { Autocomplete, type AutocompleteItemProps } from '../Autocomplete'
import { KbdShortcut, hasShortcut } from '../Kbd/KbdShortcut'
import { RoadieRoutedLink } from '../Link/RoadieRoutedLink'
import { useCommandPaletteClose } from './CommandPaletteContext'

export type CommandPaletteItemProps = Omit<AutocompleteItemProps, 'onSelect'> &
  RefAttributes<HTMLDivElement> & {
    /** Makes the command a link. Internal paths route through `RoadieLinkProvider`; external URLs open in a new tab. */
    href?: string
    /** Runs when the command is picked, before the palette closes. */
    onSelect?: () => void
    /** Pass a bold Phosphor icon; it is sized for you. */
    icon?: ReactNode
    /** Keys such as `['mod', 'e']`, shown per platform, or text such as `⌘E`. Visual only; bind the keys yourself. */
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
        (href === undefined ? undefined : (
          // The input moves the highlight, so an option is never a tab stop.
          <RoadieRoutedLink href={href} tabIndex={-1} />
        ))
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
      {icon ? (
        <span
          data-slot='command-palette-item-icon'
          aria-hidden='true'
          className='grid shrink-0 text-subtle [&>svg]:size-4'
        >
          {icon}
        </span>
      ) : null}
      <span
        data-slot='command-palette-item-label'
        className='min-w-0 flex-1 truncate'
      >
        {children}
      </span>
      {hasShortcut(shortcut) ? (
        <KbdShortcut
          shortcut={shortcut}
          emphasis='subtler'
          data-slot='command-palette-item-shortcut'
          className='shrink-0 text-subtle'
        />
      ) : null}
    </Autocomplete.Item>
  )
}

CommandPaletteItem.displayName = 'CommandPalette.Item'
