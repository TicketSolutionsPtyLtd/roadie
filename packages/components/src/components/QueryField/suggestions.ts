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
  if (!text && recent?.length)
    list.push({ id: 'recent', label: 'Recent', items: recent })
  list.push(...groups.filter((group) => group.items.length > 0))
  if (text && !pending)
    list.push({
      id: 'search',
      label: 'Search',
      items: [searchSuggestion(text)]
    })
  return list
}

export function exactSuggestion<Value>(
  groups: readonly QueryFieldSuggestionGroup<Value>[]
) {
  for (const group of groups) {
    const exact = group.items.find((item) => item.exact)
    if (exact) return exact
  }
  return undefined
}
