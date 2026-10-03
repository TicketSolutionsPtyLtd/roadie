import { isPlainDate, plainDateOf } from '../datetime/plainDate'
import { addDays } from '../datetime/plainDate'
import { resolveAbsolute } from '../datetime/ranges'
import { startOfDayInstant } from '../datetime/zone'
import {
  fieldIndex,
  isSearchable,
  momentOf,
  recordFieldOptions
} from './fields'
import type {
  ResolvedRecordFilter,
  ResolvedRecordQuery,
  ResolvedRecordRange
} from './resolve'
import type { RecordField } from './types'

type Row = object

const WALL_CLOCK = /^(\d{4}-\d{2}-\d{2})T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/

function read(row: Row, key: string | undefined): unknown {
  return key === undefined ? undefined : (row as Record<string, unknown>)[key]
}

/** Null, undefined, empty text, empty lists and empty objects are not set. */
export function isEmptyValue(value: unknown): boolean {
  if (value === null || value === undefined || value === '') return true
  if (typeof value === 'number') return Number.isNaN(value)
  if (value instanceof Date) return Number.isNaN(value.getTime())
  if (Array.isArray(value)) return value.length === 0
  return (
    typeof value === 'object' &&
    Object.getPrototypeOf(value) === Object.prototype &&
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

function same(a: unknown, b: string): boolean {
  return String(a).toLowerCase() === b.toLowerCase()
}

/** The zone a row's own times are read in. */
function rowZone(row: Row, field: RecordField, viewerZone: string): string {
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

function epochSpan(value: unknown, zone: string): [number, number] | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? [value, value] : null
  }
  if (value instanceof Date) {
    const time = value.getTime()
    return Number.isNaN(time) ? null : [time, time]
  }
  if (typeof value !== 'string') return null
  try {
    const span = resolveAbsolute({ start: value, end: value }, zone)
    if (span.kind === 'instants') return [span.start!, span.end!]
    return [
      startOfDayInstant(span.start, zone),
      startOfDayInstant(addDays(span.end, 1), zone) - 1
    ]
  } catch {
    return null
  }
}

function localDate(value: unknown, zone: string): string | null {
  if (typeof value === 'string') {
    if (isPlainDate(value)) return value
    const wall = WALL_CLOCK.exec(value)
    if (wall && isPlainDate(wall[1]!)) return wall[1]!
  }
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

function matchesFilter(
  row: Row,
  filter: ResolvedRecordFilter,
  field: RecordField,
  viewerZone: string
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
        !empty && list(value).some((v) => filter.values.some((w) => same(v, w)))
      )
    case 'is-not':
      return (
        empty || !list(value).some((v) => filter.values.some((w) => same(v, w)))
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

function searchText(row: Row, fields: readonly RecordField[]): string {
  return fields
    .filter(isSearchable)
    .flatMap((field) => {
      const value = read(row, field.key)
      if (isEmptyValue(value)) return []
      const options = recordFieldOptions(field)
      return list(value).flatMap((v) => {
        const option = options.find((o) => o.value === v)
        return option ? [String(v), option.label] : [String(v)]
      })
    })
    .join('\n')
    .toLowerCase()
}

/**
 * Whether a row belongs in a resolved query's results. Filters mean the same
 * as in the Meilisearch adapter: negative filters (is-not, not-contains, neq)
 * keep rows where the field is empty, and text compares without case. Search
 * is simpler than Meilisearch's: every word must appear, as typed, somewhere
 * in the searchable fields or their option labels.
 */
export function matchesRecordQuery(
  row: Row,
  query: ResolvedRecordQuery,
  fields: readonly RecordField[]
): boolean {
  const byKey = fieldIndex(fields)
  const allMatch = query.filters.every((filter) => {
    const field = byKey.get(filter.field)
    return field ? matchesFilter(row, filter, field, query.timeZone) : false
  })
  if (!allMatch) return false
  const words = query.search.toLowerCase().split(/\s+/).filter(Boolean)
  if (!words.length) return true
  const text = searchText(row, fields)
  return words.every((word) => text.includes(word))
}
