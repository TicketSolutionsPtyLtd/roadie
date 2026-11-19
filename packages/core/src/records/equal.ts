import { encodeFilter } from './encoding'
import type { RecordFilter, RecordLayout, RecordView } from './types'

function normaliseSearch(search: string): string {
  return search.trim().replace(/\s+/g, ' ')
}

function filterKey(filter: RecordFilter): string {
  if ('values' in filter) {
    return encodeFilter({
      ...filter,
      values: [...new Set(filter.values)].sort()
    })
  }
  return encodeFilter(filter)
}

// A repeated chip filters nothing more, so chips compare as a set.
function chipKeys(view: RecordView): string[] {
  return [...new Set(view.query.filters.map(filterKey))].sort()
}

function sameList(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((item, i) => item === b[i])
}

function sorted(items: readonly string[] | undefined): string[] {
  return [...new Set(items)].sort()
}

function sameLayout(a: RecordLayout, b: RecordLayout): boolean {
  switch (a.type) {
    case 'table':
      return (
        b.type === 'table' &&
        sameList(a.columns?.order ?? [], b.columns?.order ?? []) &&
        sameList(sorted(a.columns?.hidden), sorted(b.columns?.hidden))
      )
    case 'grid':
      return b.type === 'grid' && sameList(a.fields ?? [], b.fields ?? [])
    case 'list':
      return (
        b.type === 'list' &&
        sameList(a.fields ?? [], b.fields ?? []) &&
        a.groupBy === b.groupBy
      )
    case 'board':
      return b.type === 'board' && a.groupBy === b.groupBy
    case 'calendar':
      return b.type === 'calendar' && a.dateField === b.dateField
    case 'map':
      return b.type === 'map'
  }
}

/**
 * Whether two views show the same thing, for a view's modified state. Id and
 * name are ignored. Chips, a chip's values and hidden columns compare as
 * sets; sort and column order compare in order; a relative date range
 * compares in its one form, so 'last-month' equals a period of month -1.
 */
export function equalRecordViews(a: RecordView, b: RecordView): boolean {
  return (
    (a.entity ?? '') === (b.entity ?? '') &&
    normaliseSearch(a.query.search) === normaliseSearch(b.query.search) &&
    sameList(chipKeys(a), chipKeys(b)) &&
    sameList(
      a.query.sort.map((s) => `${s.direction} ${s.field}`),
      b.query.sort.map((s) => `${s.direction} ${s.field}`)
    ) &&
    sameLayout(a.layout, b.layout)
  )
}
