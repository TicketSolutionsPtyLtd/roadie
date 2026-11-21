'use client'

import {
  type ReactNode,
  useCallback,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState
} from 'react'

import type { Dialog as DialogPrimitive } from '@base-ui/react/dialog'

import { cn } from '@oztix/roadie-core/utils'

import { isDev } from '../../utils/isDev'
import { collatorContains, rankMatches } from '../../utils/rankMatches'
import { Autocomplete, type AutocompleteProps } from '../Autocomplete'
import { Dialog } from '../Dialog'
import { useKeyPlatform } from '../Kbd/platform'
import {
  CommandPaletteCloseProvider,
  type CommandPalettePageEntry,
  CommandPalettePagesProvider,
  CommandPaletteScopeProvider,
  CommandPaletteStatusProvider
} from './CommandPaletteContext'
import { holdKeyboard, isCoarsePointer } from './holdKeyboard'
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
  /** Called as the palette opens or closes, with why: `'item-press'` when a command was picked. Escape on a page goes back instead of closing. */
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
   * `null` shows `items` as given, unmatched and unranked, for results the
   * app searched for itself. The type tabs still narrow them by `scope`.
   */
  filter?: null
  /** Called as the search changes: as someone types, and when it clears on opening or on a page change. */
  onQueryChange?: (query: string) => void
  /**
   * Where the app's search stands. `'loading'` shows `CommandPalette.Status`
   * and `'error'` shows `CommandPalette.Error`, and neither shows
   * `CommandPalette.Empty`.
   * @default 'idle'
   */
  status?: 'idle' | 'loading' | 'error'
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
  filter: filterProp,
  onQueryChange,
  status = 'idle',
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
  const [stack, setStack] = useState<readonly string[]>([])
  const [pages, setPages] = useState<
    ReadonlyMap<string, CommandPalettePageEntry>
  >(new Map())
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setQuery('')
      setScopeState(defaultScope)
      setStack([])
    }
  }
  // Pruned here, not on unregister, so a page re-registering its new items stays open.
  const liveStack = stack.filter((value) => pages.has(value))
  if (liveStack.length !== stack.length) setStack(liveStack)
  const pageValue = stack.at(-1)
  const pageEntry = pageValue === undefined ? undefined : pages.get(pageValue)
  const previousValue = stack.at(-2)
  const previousLabel =
    previousValue === undefined
      ? null
      : (pages.get(previousValue)?.label ?? null)
  const register = useCallback(
    (value: string, entry: CommandPalettePageEntry) => {
      setPages((current) => new Map(current).set(value, entry))
      return () => {
        setPages((current) => {
          const next = new Map(current)
          next.delete(value)
          return next
        })
      }
    },
    []
  )
  const pagesContext = useMemo(
    () => ({
      page:
        pageValue !== undefined && pageEntry
          ? { value: pageValue, label: pageEntry.label, previousLabel }
          : null,
      push: (value: string) => {
        if (!pages.has(value)) {
          if (isDev())
            console.warn(
              `[Roadie] CommandPalette has no CommandPalette.Page with value "${value}" to open.`
            )
          return
        }
        setStack((current) => [...current, value])
        setQuery('')
      },
      pop: () => {
        setStack((current) => current.slice(0, -1))
        setQuery('')
      },
      register
    }),
    [pageValue, pageEntry, previousLabel, pages, register]
  )
  const onPage = pagesContext.page !== null
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
  const commandFilter = useCommandFilter(locale)
  const ranks = (onPage ? pageEntry?.filter : filterProp) !== null
  const filter = ranks ? commandFilter : null
  // Takes the caller's own item type, which Base UI types as unknown.
  const itemLabel = (
    onPage ? pageEntry?.itemToStringValue : itemToStringValue
  ) as ((item: unknown) => string) | undefined
  const ranked = useMemo(() => {
    const shown = onPage && pageEntry ? pageEntry.items : inScope(items, scope)
    return ranks ? rankMatches(shown, query, itemLabel, locale) : shown
  }, [onPage, pageEntry, items, scope, ranks, query, itemLabel, locale])

  // Opening clears the search during render, so it's reported after commit.
  const reportQuery = useEffectEvent((next: string) => onQueryChange?.(next))
  const reported = useRef(query)
  useEffect(() => {
    if (query === reported.current) return
    reported.current = query
    reportQuery(query)
  }, [query])

  function handleOpenChange(
    next: boolean,
    details: CommandPaletteOpenChangeDetails
  ) {
    if (!next && details.reason === 'escape-key' && onPage) pagesContext.pop()
    else setOpen(next, details)
  }

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
  // The stand-in field takes focus from the trigger, so close returns it here.
  const returnFocus = useRef<HTMLElement | null>(null)
  const openFromOutside = useEffectEvent(() => {
    returnFocus.current = null
    if (isCoarsePointer()) {
      const active = document.activeElement
      if (active instanceof HTMLElement) returnFocus.current = active
      holdKeyboard(document, returnFocus.current)
    }
    setOpen(true, { reason: 'trigger-press' })
  })
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
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Viewport
          data-slot='command-palette-viewport'
          className='place-items-start justify-items-center pt-24 max-sm:p-0'
        >
          <Dialog.Popup
            data-slot='command-palette'
            finalFocus={() => {
              // Once only, so a later open by the shortcut returns focus as usual.
              const target = returnFocus.current
              returnFocus.current = null
              return target?.isConnected ? target : true
            }}
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
                <CommandPalettePagesProvider value={pagesContext}>
                  <CommandPaletteStatusProvider value={status}>
                    <Autocomplete
                      inline
                      open
                      items={ranked}
                      filter={filter}
                      itemToStringValue={itemLabel}
                      locale={locale}
                      autoHighlight='always'
                      value={query}
                      onValueChange={(next) => setQuery(next)}
                    >
                      {children}
                    </Autocomplete>
                  </CommandPaletteStatusProvider>
                </CommandPalettePagesProvider>
              </CommandPaletteScopeProvider>
            </CommandPaletteCloseProvider>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog>
  )
}

CommandPaletteRoot.displayName = 'CommandPalette.Root'
