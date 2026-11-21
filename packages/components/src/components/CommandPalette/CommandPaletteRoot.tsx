'use client'

import {
  type ReactNode,
  useEffect,
  useEffectEvent,
  useMemo,
  useState
} from 'react'

import type { Dialog as DialogPrimitive } from '@base-ui/react/dialog'

import { cn } from '@oztix/roadie-core/utils'

import { collatorContains, rankMatches } from '../../utils/rankMatches'
import { Autocomplete, type AutocompleteProps } from '../Autocomplete'
import { Dialog } from '../Dialog'
import { useKeyPlatform } from '../Kbd/platform'
import {
  CommandPaletteCloseProvider,
  CommandPaletteScopeProvider
} from './CommandPaletteContext'
import { isCurrentPalette, registerPalette } from './registry'
import { matchesShortcut } from './shortcut'

export type CommandPaletteOpenChangeDetails = {
  reason: DialogPrimitive.Root.ChangeEventReason | 'item-press' | 'shortcut'
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
   * matched too, after its label, and its `scope`, or its group's, picks the
   * `CommandPalette.Scope` tab it shows under.
   */
  items: readonly Item[]
  /** The text a command is matched and ranked by. Defaults to its `label`, then `value`. */
  itemToStringValue?: (item: CommandPaletteCommand<Item>) => string
  /**
   * The keys that open and close the palette from anywhere on the page, as a
   * key list. `mod` is ⌘ on Apple platforms and Ctrl elsewhere. `false` binds
   * nothing. A field that handles the same keys first, calling
   * `preventDefault`, keeps them.
   * @default ['mod', 'k']
   */
  shortcut?: readonly string[] | false
  /**
   * The chosen type tab, by its value, or `null` for All. A command, or its
   * group, matches a tab through its `scope` field.
   */
  scope?: string | null
  /** The type tab at first, and on each opening, when uncontrolled. @default null */
  defaultScope?: string | null
  /** Called as the type tab changes. */
  onScopeChange?: (scope: string | null) => void
  /** The dialog's accessible name. @default 'Search and commands' */
  label?: string
  /** Matching locale. Defaults to the page's. */
  locale?: Intl.LocalesArgument
  className?: string
  children: ReactNode
}

const scopeOf = (item: unknown) =>
  typeof item === 'object' && item !== null && 'scope' in item
    ? item.scope
    : undefined

const isGroup = (item: unknown): item is { items: readonly unknown[] } =>
  typeof item === 'object' &&
  item !== null &&
  'items' in item &&
  Array.isArray(item.items)

/** The commands of one type, keeping each group that still has some. */
function inScope<Item>(items: readonly Item[], scope: string | null) {
  if (scope === null) return items
  return items.flatMap((item) => {
    if (!isGroup(item)) return scopeOf(item) === scope ? [item] : []
    const groupScope = scopeOf(item)
    const kept = item.items.filter(
      (command) => (scopeOf(command) ?? groupScope) === scope
    )
    if (kept.length === item.items.length) return [item]
    return kept.length > 0 ? [{ ...item, items: kept } as Item] : []
  })
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

const DEFAULT_SHORTCUT = ['mod', 'k'] as const

export function CommandPaletteRoot<Item>({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  shortcut = DEFAULT_SHORTCUT,
  items,
  itemToStringValue,
  scope: scopeProp,
  defaultScope = null,
  onScopeChange,
  label = 'Search and commands',
  locale,
  className,
  children
}: CommandPaletteRootProps<Item>) {
  const [openState, setOpenState] = useState(defaultOpen)
  const open = openProp ?? openState
  const [query, setQuery] = useState('')
  const [scopeState, setScopeState] = useState(defaultScope)
  const scope = scopeProp === undefined ? scopeState : scopeProp
  const [scopes, setScopes] = useState<readonly (string | null)[]>([null])
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setQuery('')
      setScopeState(defaultScope)
    }
  }
  const scopeContext = useMemo(
    () => ({
      scope,
      setScope: (next: string | null) => {
        setScopeState(next)
        onScopeChange?.(next)
      },
      scopes,
      setScopes
    }),
    [scope, scopes, onScopeChange]
  )
  const filter = useCommandFilter(locale)
  const ranked = useMemo(
    () => rankMatches(inScope(items, scope), query, itemToStringValue, locale),
    [items, scope, query, itemToStringValue, locale]
  )

  function setOpen(next: boolean, details: CommandPaletteOpenChangeDetails) {
    setOpenState(next)
    onOpenChange?.(next, { reason: details.reason })
  }

  const platform = useKeyPlatform()
  const onShortcut = useEffectEvent((event: KeyboardEvent) => {
    if (!shortcut || event.defaultPrevented || event.repeat) return
    if (!matchesShortcut(event, shortcut, platform)) return
    event.preventDefault()
    setOpen(!open, { reason: 'shortcut' })
  })
  const openFromOutside = useEffectEvent(() =>
    setOpen(true, { reason: 'trigger-press' })
  )
  const keys = shortcut && shortcut.length > 0 ? JSON.stringify(shortcut) : ''
  useEffect(() => {
    if (!keys) return
    const palette = {
      open: () => openFromOutside(),
      shortcut: JSON.parse(keys) as string[]
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isCurrentPalette(palette)) onShortcut(event)
    }
    const unregister = registerPalette(palette)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      unregister()
    }
  }, [keys])

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
              'flex max-h-[min(36rem,calc(100dvh-12rem))] max-w-xl flex-col gap-0 overflow-hidden p-0',
              'max-sm:h-dvh max-sm:max-h-none max-sm:max-w-none max-sm:rounded-none',
              className
            )}
          >
            <CommandPaletteCloseProvider
              value={() => setOpen(false, { reason: 'item-press' })}
            >
              <CommandPaletteScopeProvider value={scopeContext}>
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
              </CommandPaletteScopeProvider>
            </CommandPaletteCloseProvider>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog>
  )
}

CommandPaletteRoot.displayName = 'CommandPalette.Root'
