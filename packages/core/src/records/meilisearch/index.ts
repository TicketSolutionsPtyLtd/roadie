/**
 * Records requests as Meilisearch search parameters. Kept on its own subpath so
 * the records model stays backend-agnostic.
 *
 * Needs Meilisearch 1.15 or later, which compares strings with <, >, and TO,
 * for the date filters.
 *
 * Index shape the filters assume:
 * - Instants (timestamp moments, and event and access times) as epoch
 *   seconds, or milliseconds with `epoch: 'milliseconds'`.
 * - Event and access moments also store the venue-local date, 'YYYY-MM-DD',
 *   under `localDateKey` (and `endLocalDateKey` for a range).
 * - A range field stores its end on every record; a single moment repeats its
 *   start there.
 * - A location field stores `recordPlaces(field, value)`: the record's
 *   places and their ancestors, so "is in" is a plain term,
 *   `location = "au-qld"`. Distance filters, later, will read `_geo` with
 *   `_geoRadius(lat, lng, meters)` and sort by `_geoPoint`.
 * - `contains` needs Meilisearch's `containsFilter` experimental feature.
 * - `searchableAttributes` lists the fields marked `searchable`.
 */
import { hasUnquotableBackslash } from '../encoding'
import { fieldIndex, momentOf } from '../fields'
import type {
  RecordsPageRequest,
  RecordsRangeRequest,
  RecordsRequest
} from '../request'
import type { ResolvedRecordFilter, ResolvedRecordRange } from '../resolve'
import type { RecordField } from '../types'
import { RECORDS_REQUEST_VERSION } from '../versions'

export type MeilisearchOptions = {
  /** How the index stores instants. Defaults to seconds. */
  epoch?: 'seconds' | 'milliseconds'
}

export type MeilisearchQuery = {
  q: string
  /** One expression per chip; Meilisearch ANDs the array. */
  filter: string[]
  sort: string[]
  /** One-based. With `hitsPerPage`, the response's `totalHits` counts the matches for `rowCount`, up to the index's `pagination.maxTotalHits` (1,000 by default). */
  page?: number
  hitsPerPage?: number
  /** A range that isn't a whole page. The response's `estimatedTotalHits` is only an estimate. */
  offset?: number
  limit?: number
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
  if (hasUnquotableBackslash(text)) {
    throw new Error(
      `Meilisearch filters cannot hold a backslash before a quote or at the end: ${text}`
    )
  }
  return `"${text.replace(/"/g, '\\"')}"`
}

function attribute(key: string): string {
  return IDENTIFIER.test(key) && !RESERVED.has(key.toUpperCase())
    ? key
    : quote(key)
}

const EXPONENT = /^(-?)(\d)(?:\.(\d+))?e([+-]\d+)$/

// Meilisearch's unquoted values have no exponent form, so write every digit.
function numberLiteral(value: number): string {
  if (!Number.isFinite(value)) {
    throw new RangeError(
      `Meilisearch filters need a finite number, not ${value}`
    )
  }
  if (Object.is(value, -0)) return '0'
  const text = String(value)
  const m = EXPONENT.exec(text)
  if (!m) return text
  const [, sign, lead, rest = '', power] = m
  const digits = lead! + rest
  const exponent = Number(power)
  return exponent >= 0
    ? sign + digits.padEnd(exponent + 1, '0')
    : `${sign}0.${'0'.repeat(-exponent - 1)}${digits}`
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
    typeof bound === 'number' ? numberLiteral(bound) : quote(bound)
  if (start === end && from !== null && to !== null) {
    return typeof from === 'number'
      ? `${start} ${literal(from)} TO ${literal(to)}`
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
  let from = range.start === null ? null : Math.ceil(range.start / scale)
  const to = range.end === null ? null : Math.floor(range.end / scale)
  // A window inside one stored unit keeps that unit rather than none.
  if (from !== null && to !== null && from > to) from = to
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
      return `${name} = ${numberLiteral(filter.value)}`
    case 'neq':
      return `${name} != ${numberLiteral(filter.value)}`
    case 'lt':
      return `${name} < ${numberLiteral(filter.value)}`
    case 'gt':
      return `${name} > ${numberLiteral(filter.value)}`
    case 'between':
      return `${name} ${numberLiteral(filter.value[0])} TO ${numberLiteral(filter.value[1])}`
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

const isWhole = (value: number, min: number) =>
  Number.isSafeInteger(value) && value >= min

function paging(
  request: RecordsRequest | RecordsPageRequest | RecordsRangeRequest
): Pick<MeilisearchQuery, 'page' | 'hitsPerPage' | 'offset' | 'limit'> {
  if ('page' in request) {
    const { page, pageSize } = request
    if (isWhole(page, 0) && isWhole(pageSize, 1))
      return { page: page + 1, hitsPerPage: pageSize }
  } else if ('start' in request) {
    const { start, end } = request
    if (isWhole(start, 0) && isWhole(end, start + 1)) {
      const size = end - start
      // As a page, so the response's totalHits counts every match.
      return start % size === 0
        ? { page: start / size + 1, hitsPerPage: size }
        : { offset: start, limit: size }
    }
  } else return {}
  throw new RangeError(
    `Meilisearch fetches a page from 0 of a size from 1, or rows start to end, not ${JSON.stringify(request)}`
  )
}

function knownField(byKey: Map<string, RecordField>, key: string) {
  const field = byKey.get(key)
  if (!field) throw new RangeError(`Unknown field "${key}"`)
  return field
}

/**
 * A records request as Meilisearch's `q`, `filter` and `sort`. Filters mean
 * the same as `matchesRecordQuery` in the browser; search ranks with
 * Meilisearch's prefix and typo rules over the index's
 * `searchableAttributes`, which should list the fields marked `searchable`.
 * The request's dates are already resolved. A page becomes one-based `page`
 * and `hitsPerPage`; a range does too when it is a whole page, as the ranges
 * Records asks for are, and otherwise `offset` and `limit`. Throws on an
 * unknown request version or field, on an event or access field filtered by
 * date with no `localDateKey`, on text Meilisearch cannot quote, and a
 * RangeError on paging that fetches no rows.
 */
export function toMeilisearch(
  request: RecordsRequest | RecordsPageRequest | RecordsRangeRequest,
  fields: readonly RecordField[],
  { epoch = 'seconds' }: MeilisearchOptions = {}
): MeilisearchQuery {
  if (request.version !== RECORDS_REQUEST_VERSION) {
    throw new RangeError(
      `Unsupported records request version ${String(request.version)}`
    )
  }
  const { query } = request
  const byKey = fieldIndex(fields)
  return {
    q: query.search.trim(),
    filter: query.filters.map((filter) =>
      filterExpression(filter, knownField(byKey, filter.field), epoch)
    ),
    sort: query.sort.map(({ field, direction }) => {
      knownField(byKey, field)
      return `${field}:${direction === 'descending' ? 'desc' : 'asc'}`
    }),
    ...paging(request)
  }
}
