'use client'

import { type ReactNode, useEffect } from 'react'

import {
  CommandPalettePageValueProvider,
  useCommandPalettePages
} from './CommandPaletteContext'

export type CommandPalettePageProps<Item = unknown> = {
  /** The name a command's `page` opens this page by. */
  value: string
  /** Shown as a chip in the input row, and in the list's name, while the page is open. */
  label: string
  /** This page's commands, ranked and matched like the palette's own `items`. */
  items: readonly Item[]
  /** The text a command is matched and ranked by. Defaults to its `label`, then `value`. */
  itemToStringValue?: (item: Item) => string
  /** The page's list, and its empty state, shown in place of the first page's while it's open. */
  children: ReactNode
}

/** A second step a command opens, such as the statuses under "Change status…". */
export function CommandPalettePage<Item>({
  value,
  label,
  items,
  itemToStringValue,
  children
}: CommandPalettePageProps<Item>) {
  const { page, register } = useCommandPalettePages()
  useEffect(
    () =>
      register(value, {
        label,
        items,
        itemToStringValue: itemToStringValue as
          | ((item: never) => string)
          | undefined
      }),
    [register, value, label, items, itemToStringValue]
  )
  if (page?.value !== value) return null
  return (
    <CommandPalettePageValueProvider value={value}>
      <div data-slot='command-palette-page' className='contents'>
        {children}
      </div>
    </CommandPalettePageValueProvider>
  )
}

CommandPalettePage.displayName = 'CommandPalette.Page'
