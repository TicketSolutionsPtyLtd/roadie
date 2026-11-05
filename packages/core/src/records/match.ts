import { isPlainDate, plainDateOf } from '../datetime/plainDate'
import { rowInstant } from './bounds'
import {
  fieldIndex,
  isPlaceValue,
  isSearchable,
  momentOf,
  recordFieldOptions,
  recordPlaceReader
} from './fields'
import type {
  ResolvedRecordFilter,
  ResolvedRecordQuery,
  ResolvedRecordRange
} from './resolve'
import type { RecordField } from './types'

type Row = object

export function read(row: Row, key: string | undefined): unknown {
  if (key === undefined) return undefined
  // A field keyed "constructor" or "toString" reads the row, not Object.prototype.
  if (key in Object.prototype && !Object.hasOwn(row, key)) return undefined
  return (row as Record<string, unknown>)[key]
}

/** Null, undefined, empty text, empty lists and empty objects are not set. */
export function isEmptyValue(value: unknown): boolean {
  if (value === null || value === undefined || value === '') return true
  if (typeof value === 'number') return Number.isNaN(value)
  if (value instanceof Date) return Number.isNaN(value.getTime())
  if (Array.isArray(value)) return value.length === 0
  return (
    typeof value === 'object' &&
    [Object.prototype, null].includes(Object.getPrototypeOf(value)) &&
    Object.keys(value).length === 0
  )
}

function texts(value: unknown): string[] {
  return list(value)
    .filter((v): v is string => typeof v === 'string')
    .map((v) => v.toLowerCase())
}

// Meilisearch indexes booleans as the facet strings "true" and "false".
function hasBoolean(value: unknown, wanted: boolean): boolean {
  return list(value).some(
    (v) =>
      v === wanted ||
      (typeof v === 'string' && v.toLowerCase() === String(wanted))
  )
}

function numbers(value: unknown): number[] {
  return list(value).filter((v): v is number => typeof v === 'number')
}

function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [value]
}

function placesOf(field: RecordField): Values {
  const places = recordPlaceReader(field)
  return (value) => (isPlaceValue(value) ? places(value) : [])
}

function same(a: unknown, b: string): boolean {
  return (
    a !== null && a !== undefined && String(a).toLowerCase() === b.toLowerCase()
  )
}

/** The zone a row's own times are read in. */
export function rowZone(
  row: Row,
  field: RecordField,
  viewerZone: string
): string {
  const moment = momentOf(field)
  if (moment !== 'event' && moment !== 'access') return viewerZone
  const zone = read(row, field.timeZoneKey)
  return typeof zone === 'string' && isTimeZone(zone) ? zone : viewerZone
}

const knownZones = new Map<string, boolean>()

function isTimeZone(zone: string): boolean {
  let known = knownZones.get(zone)
  if (known === undefined) {
    try {
      new Intl.DateTimeFormat('en', { timeZone: zone })
      known = true
    } catch {
      known = false
    }
    knownZones.set(zone, known)
  }
  return known
}

export function epochSpan(
  value: unknown,
  zone: string
): [number, number] | null {
  if (typeof value === 'number') {
    return Number.isNaN(new Date(value).getTime()) ? null : [value, value]
  }
  if (value instanceof Date) {
    const time = value.getTime()
    return Number.isNaN(time) ? null : [time, time]
  }
  if (typeof value !== 'string') return null
  try {
    const at = rowInstant(value, zone)
    return [at, at]
  } catch {
    return null
  }
}

function localDate(value: unknown, zone: string): string | null {
  if (typeof value === 'string' && isPlainDate(value)) return value
  const span = epochSpan(value, zone)
  return span ? plainDateOf(new Date(span[0]), zone) : null
}

function storedDate(row: Row, key: string | undefined): string | null {
  const value = read(row, key)
  return typeof value === 'string' && isPlainDate(value) ? value : null
}

type Span = [number, number] | [string, string]

function rowSpan(
  row: Row,
  field: RecordField,
  kind: ResolvedRecordRange['kind'],
  viewerZone: string
): Span | null {
  const zone = rowZone(row, field, viewerZone)
  const start = read(row, field.key)
  if (isEmptyValue(start)) return null
  const end = read(row, field.end)
  const hasEnd = !isEmptyValue(end)
  if (kind === 'instants') {
    const from = epochSpan(start, zone)
    const to = hasEnd ? epochSpan(end, zone) : from
    return from && to ? [from[0], to[1]] : null
  }
  const from = storedDate(row, field.localDateKey) ?? localDate(start, zone)
  const to = hasEnd
    ? (storedDate(row, field.endLocalDateKey) ?? localDate(end, zone))
    : from
  return from && to ? [from, to] : null
}

function overlaps(span: Span, range: ResolvedRecordRange): boolean {
  const [from, to] = span
  return (
    (range.end === null || from <= range.end) &&
    (range.start === null || to >= range.start)
  )
}

type Values = (value: unknown) => unknown[]

function matchesFilter(
  row: Row,
  filter: ResolvedRecordFilter,
  field: RecordField,
  viewerZone: string,
  values: Values
): boolean {
  const value = read(row, field.key)
  const empty = isEmptyValue(value)
  switch (filter.operator) {
    case 'is-set':
      return !empty
    case 'is-not-set':
      return empty
    case 'is':
      return (
        !empty &&
        values(value).some((v) => filter.values.some((w) => same(v, w)))
      )
    case 'is-not':
      return (
        empty ||
        !values(value).some((v) => filter.values.some((w) => same(v, w)))
      )
    case 'has-all':
      return (
        !empty &&
        filter.values.every((w) => list(value).some((v) => same(v, w)))
      )
    case 'contains':
      return texts(value).some((v) => v.includes(filter.value.toLowerCase()))
    case 'not-contains':
      return !texts(value).some((v) => v.includes(filter.value.toLowerCase()))
    case 'eq':
      return numbers(value).some((v) => v === filter.value)
    case 'neq':
      return !numbers(value).some((v) => v === filter.value)
    case 'lt':
      return numbers(value).some((v) => v < filter.value)
    case 'gt':
      return numbers(value).some((v) => v > filter.value)
    case 'between':
      return numbers(value).some(
        (v) => v >= filter.value[0] && v <= filter.value[1]
      )
    case 'is-true':
      return hasBoolean(value, true)
    case 'is-false':
      return hasBoolean(value, false)
    case 'overlaps': {
      const span = rowSpan(row, field, filter.range.kind, viewerZone)
      return span !== null && overlaps(span, filter.range)
    }
  }
}

type SearchField = { key: string; labels: Map<string, string> }

function searchFields(fields: readonly RecordField[]): SearchField[] {
  return fields.filter(isSearchable).map((field) => ({
    key: field.key,
    labels: new Map(
      recordFieldOptions(field).map((option) => [option.value, option.label])
    )
  }))
}

function searchText(row: Row, fields: readonly SearchField[]): string {
  return fields
    .flatMap(({ key, labels }) => {
      const value = read(row, key)
      if (isEmptyValue(value)) return []
      return list(value).flatMap((v) => {
        const label = labels.get(String(v))
        return label === undefined ? [String(v)] : [String(v), label]
      })
    })
    .join('\n')
    .toLowerCase()
}

/**
 * `matchesRecordQuery` as a predicate built once for a query, so filtering a
 * list reads the field definitions once rather than once per row.
 */
export function compileRecordQuery(
  query: ResolvedRecordQuery,
  fields: readonly RecordField[]
): (row: Row) => boolean {
  const byKey = fieldIndex(fields)
  const filters = query.filters.map((filter) => {
    const field = byKey.get(filter.field)
    // A location's record is in its places' ancestors too.
    const values: Values = field?.type === 'location' ? placesOf(field) : list
    return { filter, field, values }
  })
  const words = query.search.toLowerCase().split(/\s+/).filter(Boolean)
  const searched = words.length ? searchFields(fields) : []
  return (row) => {
    const allMatch = filters.every(({ filter, field, values }) =>
      field ? matchesFilter(row, filter, field, query.timeZone, values) : false
    )
    if (!allMatch) return false
    if (!words.length) return true
    const text = searchText(row, searched)
    return words.every((word) => text.includes(word))
  }
}

/**
 * Whether a row belongs in a resolved query's results. Filters mean the same
 * as in the Meilisearch adapter: negative filters (is-not, not-contains, neq)
 * keep rows where the field is empty, text compares without case, and a
 * location is in its places' ancestors, as `recordPlaces` indexes them. Search
 * is simpler than Meilisearch's: every word must appear, as typed, somewhere
 * in the searchable fields or their option labels. To test many rows, use
 * `compileRecordQuery`.
 */
export function matchesRecordQuery(
  row: Row,
  query: ResolvedRecordQuery,
  fields: readonly RecordField[]
): boolean {
  return compileRecordQuery(query, fields)(row)
}
