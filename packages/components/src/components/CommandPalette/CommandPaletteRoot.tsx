'use client'

import { type ReactNode, useMemo, useState } from 'react'

import type { Dialog as DialogPrimitive } from '@base-ui/react/dialog'

import { cn } from '@oztix/roadie-core/utils'

import { collatorContains, rankMatches } from '../../utils/rankMatches'
import { Autocomplete, type AutocompleteProps } from '../Autocomplete'
import { Dialog } from '../Dialog'
import { CommandPaletteCloseProvider } from './CommandPaletteContext'

export type CommandPaletteOpenChangeDetails = {
  reason: DialogPrimitive.Root.ChangeEventReason | 'item-press'
}

/** A command, or the commands inside a group of them. */
export type CommandPaletteCommand<Item> = Item extends {
  items: readonly (infer Command)[]
}
  ? Command
  : Item

export type CommandPaletteRootProps<Item = unknown> = {
  /** Whether the palette is open. */
  open?: boolean
  /** Whether the palette is open at first, when uncontrolled. */
  defaultOpen?: boolean
  /** Called as the palette opens or closes, with why: `'item-press'` when a command was picked. */
  onOpenChange?: (
    open: boolean,
    details: CommandPaletteOpenChangeDetails
  ) => void
  /**
   * The commands, or groups of them (`{ items }`), that the list renders
   * through its child function. An object item's `keywords` array is
   * matched too, after its label.
   */
  items: readonly Item[]
  /** The text a command is matched and ranked by. Defaults to its `label`, then `value`. */
  itemToStringValue?: (item: CommandPaletteCommand<Item>) => string
  /** The dialog's accessible name. @default 'Search and commands' */
  label?: string
  /** Matching locale. Defaults to the page's. */
  locale?: Intl.LocalesArgument
  className?: string
  children: ReactNode
}

function keywordsOf(item: unknown): readonly string[] {
  if (typeof item !== 'object' || item === null || !('keywords' in item))
    return []
  return Array.isArray(item.keywords) ? item.keywords : []
}

function useCommandFilter(locale?: Intl.LocalesArgument) {
  return useMemo(() => {
    const contains = collatorContains(locale)
    const filter: NonNullable<AutocompleteProps['filter']> = (
      item,
      query,
      itemToString
    ) =>
      contains(item, query, itemToString) ||
      keywordsOf(item).some((keyword) => contains(keyword, query))
    return filter
  }, [locale])
}

export function CommandPaletteRoot<Item>({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  items,
  itemToStringValue,
  label = 'Search and commands',
  locale,
  className,
  children
}: CommandPaletteRootProps<Item>) {
  const [openState, setOpenState] = useState(defaultOpen)
  const open = openProp ?? openState
  const [query, setQuery] = useState('')
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) setQuery('')
  }
  const filter = useCommandFilter(locale)
  const ranked = useMemo(
    () => rankMatches(items, query, itemToStringValue, locale),
    [items, query, itemToStringValue, locale]
  )

  function setOpen(next: boolean, details: CommandPaletteOpenChangeDetails) {
    setOpenState(next)
    onOpenChange?.(next, { reason: details.reason })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Viewport
          data-slot='command-palette-viewport'
          className='place-items-start justify-items-center pt-24 max-sm:p-0'
        >
          <Dialog.Popup
            data-slot='command-palette'
            aria-label={label}
            className={cn(
              'max-h-[min(36rem,calc(100dvh-12rem))] max-w-xl grid-rows-[auto_minmax(0,1fr)] content-start gap-0 overflow-hidden p-0',
              'max-sm:h-dvh max-sm:max-h-none max-sm:max-w-none max-sm:rounded-none',
              className
            )}
          >
            <CommandPaletteCloseProvider
              value={() => setOpen(false, { reason: 'item-press' })}
            >
              <Autocomplete
                inline
                open
                items={ranked}
                filter={filter}
                // Takes the caller's own item type, which Base UI types as unknown.
                itemToStringValue={
                  itemToStringValue as ((item: unknown) => string) | undefined
                }
                locale={locale}
                autoHighlight='always'
                value={query}
                onValueChange={(next) => setQuery(next)}
              >
                {children}
              </Autocomplete>
            </CommandPaletteCloseProvider>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog>
  )
}

CommandPaletteRoot.displayName = 'CommandPalette.Root'
