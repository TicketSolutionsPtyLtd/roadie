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

const wordCharacter = /^[\p{L}\p{N}\p{M}'’]$/u

function isWordCharacter(character: string | undefined) {
  return character !== undefined && wordCharacter.test(character)
}

// The collator ignores spaces and punctuation, so a match can begin on the
// space before a word; the word starts at the window's first word character.
function startsWord(label: string, start: number, end: number) {
  const lead = Array.from(label.slice(start, end)).findIndex(isWordCharacter)
  if (lead === -1) return false
  return lead > 0 || !isWordCharacter(Array.from(label.slice(0, start)).at(-1))
}

function matchTier(label: string, query: string, collator: Intl.Collator) {
  if (collator.compare(label, query) === 0) return EXACT
  let tier = NO_MATCH
  for (let i = 0; i <= label.length - query.length; i += 1) {
    const end = i + query.length
    if (collator.compare(label.slice(i, end), query) !== 0) continue
    if (i === 0) return LABEL_START
    if (startsWord(label, i, end)) return WORD_START
    tier = CONTAINS
  }
  return tier
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
