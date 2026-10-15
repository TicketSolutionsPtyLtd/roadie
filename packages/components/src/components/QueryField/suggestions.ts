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
 * The value step's first match for typed text: from a group with its label
 * shown, whose items are matches, before one whose items say what they are.
 */
export function firstMatch<Value>(
  groups: readonly QueryFieldSuggestionGroup<Value>[]
) {
  const items = (hidden: boolean) =>
    groups
      .filter((group) => !!group.hideLabel === hidden)
      .flatMap((group) => group.items)
  return items(false)[0] ?? items(true)[0]
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
