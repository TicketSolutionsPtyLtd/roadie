import type {
  QueryFieldListGroup,
  QueryFieldSearchSuggestion,
  QueryFieldSuggestion,
  QueryFieldSuggestionGroup
} from './types'

export function searchSuggestion(text: string): QueryFieldSearchSuggestion {
  const value = text.trim()
  return {
    id: 'search',
    kind: 'search',
    label: `Search for “${value}”`,
    value
  }
}

type ListGroupsInput<Value> = {
  groups: readonly QueryFieldSuggestionGroup<Value>[]
  inputValue: string
  recent?: readonly QueryFieldSuggestion<Value>[]
  pending?: boolean
}

export function listGroups<Value>({
  groups,
  inputValue,
  recent,
  pending
}: ListGroupsInput<Value>): QueryFieldListGroup<Value>[] {
  const text = inputValue.trim()
  const list: QueryFieldListGroup<Value>[] = []
  if (!text && !pending && recent?.length)
    list.push({ id: 'recent', label: 'Recent', items: recent, builtIn: true })
  list.push(...groups.filter((group) => group.items.length > 0))
  if (text && !pending)
    list.push({
      id: 'search',
      label: 'Search',
      items: [searchSuggestion(text)],
      builtIn: true
    })
  return list
}

/**
 * The groups with the item `isFirst` picks leading its group, and that group
 * leading the rest, so the row Enter takes is the top one.
 */
export function leadWith<Value>(
  groups: readonly QueryFieldListGroup<Value>[],
  isFirst: (item: QueryFieldListGroup<Value>['items'][number]) => boolean
): QueryFieldListGroup<Value>[] {
  const at = groups.findIndex((group) => group.items.some(isFirst))
  if (at < 0) return [...groups]
  const group = groups[at]!
  const first = group.items.findIndex(isFirst)
  const led = {
    ...group,
    items: [group.items[first]!, ...group.items.filter((_, i) => i !== first)]
  }
  return [led, ...groups.filter((_, i) => i !== at)]
}

type Takes<Value> = (item: QueryFieldSuggestion<Value>) => boolean

const takesAny = () => true

/** The value step's first match for typed text that `takes` allows. */
export function firstMatch<Value>(
  groups: readonly QueryFieldSuggestionGroup<Value>[],
  takes: Takes<Value> = takesAny
) {
  return groups.flatMap((group) => group.items).find(takes)
}

export function exactSuggestion<Value>(
  groups: readonly QueryFieldSuggestionGroup<Value>[],
  takes: Takes<Value> = takesAny
) {
  for (const group of groups) {
    const exact = group.items.find((item) => item.exact && takes(item))
    if (exact) return exact
  }
  return undefined
}
