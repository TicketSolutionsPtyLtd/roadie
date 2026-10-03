/**
 * Records views as Meilisearch search parameters. Kept on its own subpath so
 * the records model stays backend-agnostic.
 *
 * Index shape the filters assume:
 * - Instants (timestamp moments, and event and access times) as epoch
 *   seconds, or milliseconds with `epoch: 'milliseconds'`.
 * - Event and access moments also store the venue-local date, 'YYYY-MM-DD',
 *   under `localDateKey` (and `endLocalDateKey` for a range).
 * - A range field stores its end on every record; a single moment repeats its
 *   start there.
 * - `contains` needs Meilisearch's `containsFilter` experimental feature.
 */
import { fieldIndex, momentOf } from '../fields'
import {
  type ResolvedRecordFilter,
  type ResolvedRecordRange,
  resolveRecordQuery
} from '../resolve'
import type { RecordField, RecordQueryOptions, RecordView } from '../types'

export type MeilisearchOptions = RecordQueryOptions & {
  /** How the index stores instants. Defaults to seconds. */
  epoch?: 'seconds' | 'milliseconds'
}

export type MeilisearchQuery = {
  q: string
  /** One expression per chip; Meilisearch ANDs the array. */
  filter: string[]
  sort: string[]
}

const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)*$/
const RESERVED = new Set([
  'AND',
  'OR',
  'NOT',
  'TO',
  'IN',
  'EXISTS',
  'IS',
  'NULL',
  'EMPTY',
  'CONTAINS',
  'STARTS',
  'WITH',
  'TRUE',
  'FALSE'
])

function quote(text: string): string {
  return `"${text.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

function attribute(key: string): string {
  return IDENTIFIER.test(key) && !RESERVED.has(key.toUpperCase())
    ? key
    : quote(key)
}

function list(values: readonly string[]): string {
  return `[${values.map(quote).join(', ')}]`
}

function group(parts: string[], joiner: 'AND' | 'OR'): string {
  return parts.length === 1 ? parts[0]! : `(${parts.join(` ${joiner} `)})`
}

type Bound = string | number

function rangeExpression(
  start: string,
  end: string,
  from: Bound | null,
  to: Bound | null
): string {
  const literal = (bound: Bound) =>
    typeof bound === 'number' ? String(bound) : quote(bound)
  if (start === end && from !== null && to !== null) {
    return typeof from === 'number'
      ? `${start} ${from} TO ${to}`
      : group(
          [`${start} >= ${literal(from)}`, `${start} <= ${literal(to)}`],
          'AND'
        )
  }
  const parts: string[] = []
  if (to !== null) parts.push(`${start} <= ${literal(to)}`)
  if (from !== null) parts.push(`${end} >= ${literal(from)}`)
  return group(parts, 'AND')
}

function dateAttributes(field: RecordField): [string, string] {
  const moment = momentOf(field)
  if (moment === 'date') return [field.key, field.end ?? field.key]
  const needs = (key: string) =>
    new Error(
      `"${field.label}" needs a ${key} to filter by venue-local date in Meilisearch`
    )
  if (!field.localDateKey) throw needs('localDateKey')
  if (field.end && !field.endLocalDateKey) throw needs('endLocalDateKey')
  return [field.localDateKey, field.endLocalDateKey ?? field.localDateKey]
}

function overlapExpression(
  field: RecordField,
  range: ResolvedRecordRange,
  epoch: 'seconds' | 'milliseconds'
): string {
  if (range.kind === 'dates') {
    const [start, end] = dateAttributes(field).map(attribute) as [
      string,
      string
    ]
    return rangeExpression(start, end, range.start, range.end)
  }
  const scale = epoch === 'seconds' ? 1000 : 1
  // Inward, so a coarser index never widens the window.
  const from = range.start === null ? null : Math.ceil(range.start / scale)
  const to = range.end === null ? null : Math.floor(range.end / scale)
  return rangeExpression(
    attribute(field.key),
    attribute(field.end ?? field.key),
    from,
    to
  )
}

function filterExpression(
  filter: ResolvedRecordFilter,
  field: RecordField,
  epoch: 'seconds' | 'milliseconds'
): string {
  const name = attribute(field.key)
  switch (filter.operator) {
    case 'is':
      return filter.values.length === 1
        ? `${name} = ${quote(filter.values[0]!)}`
        : `${name} IN ${list(filter.values)}`
    case 'is-not':
      return filter.values.length === 1
        ? `${name} != ${quote(filter.values[0]!)}`
        : `${name} NOT IN ${list(filter.values)}`
    case 'has-all':
      return group(
        filter.values.map((value) => `${name} = ${quote(value)}`),
        'AND'
      )
    case 'contains':
      return `${name} CONTAINS ${quote(filter.value)}`
    case 'not-contains':
      return `NOT ${name} CONTAINS ${quote(filter.value)}`
    case 'eq':
      return `${name} = ${filter.value}`
    case 'neq':
      return `${name} != ${filter.value}`
    case 'lt':
      return `${name} < ${filter.value}`
    case 'gt':
      return `${name} > ${filter.value}`
    case 'between':
      return `${name} ${filter.value[0]} TO ${filter.value[1]}`
    case 'is-true':
      return `${name} = true`
    case 'is-false':
      return `${name} = false`
    case 'is-set':
      return `(${name} EXISTS AND ${name} IS NOT NULL AND ${name} IS NOT EMPTY)`
    case 'is-not-set':
      return `(${name} NOT EXISTS OR ${name} IS NULL OR ${name} IS EMPTY)`
    case 'overlaps':
      return overlapExpression(field, filter.range, epoch)
  }
}

/**
 * A view as Meilisearch's `q`, `filter` and `sort`, with the same meaning as
 * `matchesRecordQuery` in the browser. Relative dates resolve at `now`.
 * Throws when a field the view names is unknown, or when an event or access
 * field filtered by date has no `localDateKey`.
 */
export function toMeilisearch(
  view: RecordView,
  fields: readonly RecordField[],
  { epoch = 'seconds', ...options }: MeilisearchOptions
): MeilisearchQuery {
  const resolved = resolveRecordQuery(view.query, fields, options)
  const byKey = fieldIndex(fields)
  return {
    q: resolved.search.trim(),
    filter: resolved.filters.map((filter) =>
      filterExpression(filter, byKey.get(filter.field)!, epoch)
    ),
    sort: resolved.sort.map(
      ({ field, direction }) =>
        `${field}:${direction === 'descending' ? 'desc' : 'asc'}`
    )
  }
}
