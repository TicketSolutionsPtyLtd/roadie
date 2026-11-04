'use client'

import { useMemo, useState } from 'react'

const EXACT = 0
const LABEL_START = 1
const WORD_START = 2
const CONTAINS = 3
const NO_MATCH = 4

type Group = { items: readonly unknown[] }

type ItemLabel = ((item: never) => string | null | undefined) | null

// Base UI's own test for grouped items.
function isGroups(items: readonly unknown[]): items is readonly Group[] {
  const first = items[0]
  return (
    typeof first === 'object' &&
    first !== null &&
    Array.isArray((first as Group).items)
  )
}

const collators = new Map<string, Intl.Collator>()
// Turkish and others fold some Latin letters their own way, and numeric
// collation reads runs of digits as numbers, so only plain English takes the
// folded-string path.
const englishCollators = new WeakSet<Intl.Collator>()

// The same options as Base UI's default filter, so ranking and matching agree.
function getCollator(locale?: Intl.LocalesArgument) {
  const key = Array.isArray(locale) ? locale.join() : String(locale ?? '')
  let collator = collators.get(key)
  if (!collator) {
    collator = new Intl.Collator(locale, {
      usage: 'search',
      sensitivity: 'base',
      ignorePunctuation: true
    })
    collators.set(key, collator)
    const { locale: resolved, numeric } = collator.resolvedOptions()
    if (resolved.split('-')[0] === 'en' && !numeric)
      englishCollators.add(collator)
  }
  return collator
}

// Mirrors Base UI's stringifyAsLabel, which its default filter matches on.
function defaultLabel(item: unknown) {
  if (item == null) return ''
  if (typeof item === 'string') return item
  if (typeof item === 'object') {
    if ('label' in item && item.label != null) return String(item.label)
    if ('value' in item) return String(item.value)
  }
  try {
    return JSON.stringify(item)
  } catch {
    return String(item)
  }
}

const wordCharacter = /^[\p{L}\p{N}\p{M}]$/u
const apostrophe = /^['’]$/u
const lowercase = /^\p{Ll}$/u

function isWordCharacter(character: string | undefined) {
  return character !== undefined && wordCharacter.test(character)
}

// An apostrophe inside a word joins a lowercase tail ("Don't") but not a
// capitalised one ("O'Rock"), and after a space it opens a quote.
function continuesWord(before: string[], first: string | undefined) {
  const previous = before.at(-1)
  if (previous !== undefined && apostrophe.test(previous))
    return (
      isWordCharacter(before.at(-2)) &&
      first !== undefined &&
      lowercase.test(first)
    )
  return isWordCharacter(previous)
}

// The collator ignores spaces and punctuation, so a match can begin on the
// space before a word; the word starts at the window's first word character.
function startsWord(label: string, start: number, end: number) {
  const window = Array.from(label.slice(start, end))
  const lead = window.findIndex(isWordCharacter)
  if (lead === -1) return false
  const before = Array.from(label.slice(0, start)).concat(window.slice(0, lead))
  return !continuesWord(before, window[lead])
}

const PLAIN = /^[A-Za-z0-9 ]*$/
const foldOnce = (text: string) => text.toLowerCase().replaceAll(' ', '')
const folds = new Map<string, string>()

// Labels come round again on every keystroke, so their folds are kept, up to
// a bound, since labels come from callers.
function fold(text: string) {
  let folded = folds.get(text)
  if (folded === undefined) {
    if (folds.size >= 20_000) folds.clear()
    folded = foldOnce(text)
    folds.set(text, folded)
  }
  return folded
}

/**
 * Whether a slice of the label reads as the query to the collator. Comparing
 * every slice through Intl is slow over thousands of items, so plain English
 * letters, digits, and spaces, where the collator ignores only case and
 * spaces, compare as folded strings, and a label without the folded query
 * anywhere is ruled out at once. Anything else asks the collator.
 */
function sliceMatcher(label: string, query: string, collator: Intl.Collator) {
  const plain =
    englishCollators.has(collator) && PLAIN.test(label) && PLAIN.test(query)
  if (!plain)
    return {
      possible: true,
      same: (slice: string) => collator.compare(slice, query) === 0
    }
  const folded = fold(query)
  return {
    possible: fold(label).includes(folded),
    same: (slice: string) => foldOnce(slice) === folded
  }
}

function matchTier(label: string, query: string, collator: Intl.Collator) {
  const { possible, same } = sliceMatcher(label, query, collator)
  if (!possible) return NO_MATCH
  if (same(label)) return EXACT
  let tier = NO_MATCH
  for (let i = 0; i <= label.length - query.length; i += 1) {
    const end = i + query.length
    if (!same(label.slice(i, end))) continue
    if (i === 0) return LABEL_START
    if (startsWord(label, i, end)) return WORD_START
    tier = CONTAINS
  }
  return tier
}

function sliceContains(label: string, query: string, collator: Intl.Collator) {
  if (!query) return true
  const { possible, same } = sliceMatcher(label, query, collator)
  if (!possible) return false
  for (let i = 0; i <= label.length - query.length; i += 1)
    if (same(label.slice(i, i + query.length))) return true
  return false
}

const filters = new Map<Intl.Collator, ContainsFilter>()

type ContainsFilter = <Item>(
  item: Item,
  query: string,
  itemToString?: (item: Item) => string
) => boolean

/**
 * Base UI's default `contains` filter, with the same answers but the plain
 * English fast path, for a list too long to compare through Intl on every
 * keystroke. One per locale, so it keeps its identity across renders.
 */
export function collatorContains(locale?: Intl.LocalesArgument) {
  const collator = getCollator(locale)
  let filter = filters.get(collator)
  if (!filter) {
    filter = (item, query, itemToString) =>
      sliceContains(
        itemToString && item != null
          ? (itemToString(item) ?? '')
          : defaultLabel(item),
        query,
        collator
      )
    filters.set(collator, filter)
  }
  return filter
}

function rankList<Item>(
  items: readonly Item[],
  query: string,
  label: (item: Item) => string,
  collator: Intl.Collator
) {
  const ranked = items
    .map((item, index) => ({
      item,
      index,
      tier: matchTier(label(item), query, collator)
    }))
    .sort((a, b) => a.tier - b.tier || a.index - b.index)
  return ranked.every(({ index }, position) => index === position)
    ? items
    : ranked.map(({ item }) => item)
}

/**
 * Orders items by how closely their labels match the query: an exact match,
 * then the start of the label, then the start of a word, then anywhere.
 * Ties keep the given order, and groups keep theirs while their items are
 * ranked. Returns `items` itself when nothing moves.
 */
export function rankMatches<Items extends readonly unknown[]>(
  items: Items,
  query: string,
  label?: ItemLabel,
  locale?: Intl.LocalesArgument
): Items {
  const trimmed = query.trim()
  const list: readonly unknown[] = items
  if (trimmed === '' || list.length === 0) return items
  const collator = getCollator(locale)
  const toLabel = (item: unknown) =>
    label && item != null
      ? ((label as (item: unknown) => string | null | undefined)(item) ?? '')
      : defaultLabel(item)
  if (!isGroups(list))
    return rankList(list, trimmed, toLabel, collator) as Items
  let moved = false
  const groups = list.map((group) => {
    const ranked = rankList(group.items, trimmed, toLabel, collator)
    if (ranked === group.items) return group
    moved = true
    return { ...group, items: ranked }
  })
  return (moved ? groups : items) as Items
}

export function useRankedItems<Items>(
  items: Items,
  {
    enabled,
    query,
    label,
    locale
  }: {
    enabled: boolean
    query: string
    label?: ItemLabel
    locale?: Intl.LocalesArgument
  }
) {
  return useMemo(
    () =>
      enabled && Array.isArray(items)
        ? rankMatches(items as readonly unknown[], query, label, locale)
        : items,
    [enabled, items, query, label, locale]
  ) as Items
}

/**
 * Holds `query` while the list is closed, as Base UI holds its filter query
 * through the exit animation, so the closing list doesn't reorder.
 */
export function useHeldWhileClosed(
  query: string,
  open: boolean | undefined,
  defaultOpen: boolean | undefined
) {
  const [openState, setOpenState] = useState(defaultOpen ?? false)
  const isOpen = open ?? openState
  const [heldQuery, setHeldQuery] = useState(query)
  if (isOpen && heldQuery !== query) setHeldQuery(query)

  function handleOpenChange(
    nextOpen: boolean,
    details: { isCanceled: boolean }
  ) {
    if (!details.isCanceled) setOpenState(nextOpen)
  }

  return [isOpen ? query : heldQuery, handleOpenChange] as const
}
