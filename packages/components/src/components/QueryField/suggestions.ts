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

/**
 * The value step's first match for typed text that `takes` allows: from a
 * group with its label shown, whose items are matches, before one whose items
 * say what they are. A match it passes over still keeps the latter out.
 */
export function firstMatch<Value>(
  groups: readonly QueryFieldSuggestionGroup<Value>[],
  takes: Takes<Value> = takesAny
) {
  const items = (hidden: boolean) =>
    groups
      .filter((group) => !!group.hideLabel === hidden)
      .flatMap((group) => group.items)
  const matches = items(false)
  return (matches.length > 0 ? matches : items(true)).find(takes)
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
