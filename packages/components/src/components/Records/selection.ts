import type { RecordQuery, RecordSelection } from '@oztix/roadie-core/records'

export const EMPTY_SELECTION: RecordSelection = { ids: [] }

const isAll = (
  selection: RecordSelection
): selection is Extract<RecordSelection, { allMatching: true }> =>
  'allMatching' in selection

// Selections are immutable, so one Set per object keeps lookups O(1).
const idSets = new WeakMap<RecordSelection, Set<string>>()
function idSet(selection: RecordSelection) {
  let ids = idSets.get(selection)
  if (!ids) {
    ids = new Set(isAll(selection) ? selection.except : selection.ids)
    idSets.set(selection, ids)
  }
  return ids
}

const sameIds = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((id, index) => id === b[index])

/** By value, so a parent passing a new object each render isn't a new choice. */
export const sameSelection = (a: RecordSelection, b: RecordSelection) =>
  a === b ||
  (isAll(a)
    ? isAll(b) && sameIds(a.except, b.except)
    : !isAll(b) && sameIds(a.ids, b.ids))

export const isSelected = (selection: RecordSelection, id: string) =>
  isAll(selection) ? !idSet(selection).has(id) : idSet(selection).has(id)

export const selectedCount = (
  selection: RecordSelection,
  matching: readonly string[]
) => matching.filter((id) => isSelected(selection, id)).length

const setMany = (
  selection: RecordSelection,
  ids: readonly string[],
  value: boolean
): RecordSelection => {
  if (isAll(selection)) {
    const except = new Set(selection.except)
    for (const id of ids) {
      if (value) except.delete(id)
      else except.add(id)
    }
    return { allMatching: true, except: [...except] }
  }
  const picked = new Set(selection.ids)
  for (const id of ids) {
    if (value) picked.add(id)
    else picked.delete(id)
  }
  return { ids: [...picked] }
}

export const toggle = (
  selection: RecordSelection,
  id: string,
  value = !isSelected(selection, id)
) => setMany(selection, [id], value)

export function toggleRange(
  selection: RecordSelection,
  order: readonly string[],
  anchor: string | undefined,
  id: string,
  value: boolean
) {
  const from = anchor === undefined ? -1 : order.indexOf(anchor)
  const to = order.indexOf(id)
  if (from === -1 || to === -1) return toggle(selection, id, value)
  const [start, end] = from < to ? [from, to] : [to, from]
  return setMany(selection, order.slice(start, end + 1), value)
}

export const deselect = (selection: RecordSelection, ids: readonly string[]) =>
  setMany(selection, ids, false)

/** Picked ids narrowed to the rows that still match, so a hidden row is never acted on. */
export function withinMatching(
  selection: RecordSelection,
  matching: readonly string[]
): RecordSelection {
  if (isAll(selection)) return selection
  const kept = new Set(matching)
  const ids = selection.ids.filter((id) => kept.has(id))
  return ids.length === selection.ids.length ? selection : { ids }
}

export const selectPage = (
  selection: RecordSelection,
  pageIds: readonly string[],
  value: boolean
) => setMany(selection, pageIds, value)

export function pageState(
  selection: RecordSelection,
  pageIds: readonly string[]
): boolean | 'mixed' {
  const count = pageIds.filter((id) => isSelected(selection, id)).length
  if (count === 0) return false
  return count === pageIds.length ? true : 'mixed'
}

/**
 * What a selection was taken against: the search and the unresolved filters,
 * chips and their values in any order, so "today" rolling over doesn't drop it.
 */
export const matchKey = ({
  search,
  filters
}: Pick<RecordQuery, 'search' | 'filters'>) =>
  JSON.stringify([
    search.trim(),
    filters
      .map((filter) =>
        JSON.stringify(
          'values' in filter
            ? { ...filter, values: [...filter.values].sort() }
            : filter
        )
      )
      .sort()
  ])
