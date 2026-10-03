import {
  type RecordField,
  type RecordFilter,
  type RecordQuery,
  type RecordQueryOptions,
  type RecordView,
  type ResolvedRecordQuery,
  resolveRecordQuery
} from '@oztix/roadie-core/records'

import type { RecordViewDefaults } from './types'

export const EMPTY_QUERY: RecordQuery = { search: '', filters: [], sort: [] }

export function toView(defaults: RecordViewDefaults = {}): RecordView {
  return {
    ...defaults,
    query: { ...EMPTY_QUERY, ...defaults.query },
    layout: defaults.layout ?? { type: 'table' }
  }
}

export type AppliedQuery = {
  resolved: ResolvedRecordQuery
  /** What the view asks for that these fields can't apply, for a dev warning. */
  skipped: string[]
  skippedFilters: number[]
}

function describe(filter: RecordFilter) {
  return `filter on "${filter.field}" (${filter.operator})`
}

/**
 * Resolves what it can of a query: a filter or sort naming an unknown field,
 * or a filter its field can't read, is skipped rather than failing the list.
 */
export function applyQuery(
  query: RecordQuery,
  fields: readonly RecordField[],
  options: RecordQueryOptions
): AppliedQuery {
  const skipped: string[] = []
  const skippedFilters: number[] = []
  const sortable = new Set(
    fields.filter((field) => field.sortable !== false).map((field) => field.key)
  )
  const filters = query.filters.flatMap((filter, index) => {
    try {
      const [resolved] = resolveRecordQuery(
        { search: '', filters: [filter], sort: [] },
        fields,
        options
      ).filters
      return [resolved!]
    } catch (error) {
      skipped.push(`${describe(filter)}: ${(error as Error).message}`)
      skippedFilters.push(index)
      return []
    }
  })
  const sort = query.sort.filter(({ field }) => {
    if (sortable.has(field)) return true
    skipped.push(`sort on "${field}", which no sortable field has`)
    return false
  })
  return {
    resolved: {
      search: query.search,
      filters,
      sort,
      timeZone: options.timeZone
    },
    skipped,
    skippedFilters
  }
}

export const isFiltered = (query: ResolvedRecordQuery) =>
  query.search.trim() !== '' || query.filters.length > 0
