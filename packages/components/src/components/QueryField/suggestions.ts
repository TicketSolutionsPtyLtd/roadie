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
