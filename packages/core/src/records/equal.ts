import { encodeFilter } from './encoding'
import type { RecordFilter, RecordLayout, RecordView } from './types'

function normaliseSearch(search: string): string {
  return search.trim().replace(/\s+/g, ' ')
}

function filterKey(filter: RecordFilter): string {
  if (
    filter.operator === 'is' ||
    filter.operator === 'is-not' ||
    filter.operator === 'has-all'
  ) {
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
  return [...(items ?? [])].sort()
}

function sameLayout(a: RecordLayout, b: RecordLayout): boolean {
  if (a.type === 'grid' || b.type === 'grid') {
    return (
      a.type === b.type &&
      sameList(
        (a.type === 'grid' && a.fields) || [],
        (b.type === 'grid' && b.fields) || []
      )
    )
  }
  return (
    sameList(a.columns?.order ?? [], b.columns?.order ?? []) &&
    sameList(sorted(a.columns?.hidden), sorted(b.columns?.hidden))
  )
}

/**
 * Whether two views show the same thing, for a view's modified state. Id and
 * name are ignored. Chips, a chip's values and hidden columns compare as
 * sets; sort and column order compare in order.
 */
export function equalViews(a: RecordView, b: RecordView): boolean {
  return (
    (a.entity ?? '') === (b.entity ?? '') &&
    (a.group ?? '') === (b.group ?? '') &&
    normaliseSearch(a.query.search) === normaliseSearch(b.query.search) &&
    sameList(chipKeys(a), chipKeys(b)) &&
    sameList(
      a.query.sort.map((s) => `${s.direction} ${s.field}`),
      b.query.sort.map((s) => `${s.direction} ${s.field}`)
    ) &&
    sameLayout(a.layout, b.layout)
  )
}
