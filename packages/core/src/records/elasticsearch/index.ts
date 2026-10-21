/**
 * Records requests as Elasticsearch query DSL. Kept on its own subpath so the
 * records model stays backend-agnostic.
 *
 * Needs Elasticsearch 7.10 or later, or OpenSearch, for case-insensitive
 * `term` and `wildcard` queries.
 *
 * Index shape the queries assume:
 * - Text, option, and location fields as `keyword`, or with a `keyword`
 *   sub-field named in `paths`, since filters match whole values.
 * - Instants (timestamp moments, and event and access times) mapped as
 *   `date`.
 * - Event and access moments also store the venue-local date, or date-time,
 *   under `localDateKey` (and `endLocalDateKey` for a range), mapped as
 *   `date` with no zone. A `date` moment's own key is mapped the same way.
 * - A range field stores its end on every record; a single moment repeats its
 *   start there.
 * - A location field stores `recordPlaces(field, value)`: the record's
 *   places and their ancestors, so "is in" is a plain term.
 */
import { fieldIndex, isSearchable, momentOf } from '../fields'
import type {
  RecordsPageRequest,
  RecordsRangeRequest,
  RecordsRequest
} from '../request'
import type { ResolvedRecordFilter, ResolvedRecordRange } from '../resolve'
import type { RecordField } from '../types'
import { RECORDS_REQUEST_VERSION } from '../versions'

/** One query clause, such as `{ term: { brand: { value: 'oztix' } } }`. */
export type ElasticsearchClause = { [query: string]: unknown }

export type ElasticsearchOptions = {
  /** Where filters and sort read a field, by key, such as `{ venueName: 'venueName.raw' }`. Defaults to the key. */
  paths?: Readonly<Record<string, string>>
  /** What search reads, with any boosts, such as `['name^5', 'venueName']`. Defaults to the fields marked `searchable`. */
  searchFields?: readonly string[]
  /** A field key whose chips are left out, to count that field's values against every other filter. */
  except?: string
}

export type ElasticsearchQuery = {
  query: {
    bool: { must?: ElasticsearchClause[]; filter?: ElasticsearchClause[] }
  }
  sort: ElasticsearchClause[]
  /** With `size`, the rows a page or range reads. The response's `hits.total` counts the matches, to 10,000 unless the app sets `track_total_hits`. */
  from?: number
  size?: number
}

type Scalar = string | number | boolean
type Bounds = Record<string, Scalar>

const term = (path: string, value: Scalar): ElasticsearchClause => ({
  term: {
    [path]:
      typeof value === 'string' ? { value, case_insensitive: true } : { value }
  }
})

const not = (clause: ElasticsearchClause): ElasticsearchClause => ({
  bool: { must_not: [clause] }
})

const all = (clauses: ElasticsearchClause[]): ElasticsearchClause =>
  clauses.length === 1 ? clauses[0]! : { bool: { filter: clauses } }

const any = (clauses: ElasticsearchClause[]): ElasticsearchClause =>
  clauses.length === 1
    ? clauses[0]!
    : { bool: { should: clauses, minimum_should_match: 1 } }

const range = (path: string, bounds: Bounds): ElasticsearchClause => ({
  range: { [path]: bounds }
})

// Wildcard patterns escape their own operators with a backslash.
const literal = (text: string) => text.replace(/[\\*?]/g, '\\$&')

function finite(value: number): number {
  if (!Number.isFinite(value)) {
    throw new RangeError(
      `Elasticsearch queries need a finite number, not ${value}`
    )
  }
  return value
}

function isSet(field: RecordField, path: string): ElasticsearchClause {
  const exists = { exists: { field: path } }
  // A keyword holds "", which Roadie reads as empty.
  return field.type === 'text' ||
    field.type === 'option' ||
    field.type === 'location'
    ? { bool: { filter: [exists], must_not: [term(path, '')] } }
    : exists
}

function overlap(
  start: string,
  end: string,
  from: Scalar | null,
  to: Scalar | null,
  format: string,
  roundUp: string
): ElasticsearchClause {
  const lte: Bounds =
    to === null ? {} : { lte: roundUp ? `${to}${roundUp}` : to }
  const gte: Bounds = from === null ? {} : { gte: from }
  if (start === end) return range(start, { ...gte, ...lte, format })
  const clauses: ElasticsearchClause[] = []
  if (to !== null) clauses.push(range(start, { ...lte, format }))
  if (from !== null) clauses.push(range(end, { ...gte, format }))
  return all(clauses)
}

function dateKeys(field: RecordField): [string, string] {
  const moment = momentOf(field)
  if (moment === 'date') return [field.key, field.end ?? field.key]
  const needs = (key: string) =>
    new Error(
      `"${field.label}" needs a ${key} to filter by venue-local date in Elasticsearch`
    )
  if (!field.localDateKey) throw needs('localDateKey')
  if (field.end && !field.endLocalDateKey) throw needs('endLocalDateKey')
  return [field.localDateKey, field.endLocalDateKey ?? field.localDateKey]
}

function overlapClause(
  field: RecordField,
  range: ResolvedRecordRange,
  pathOf: (key: string) => string
): ElasticsearchClause {
  if (range.kind === 'dates') {
    const [start, end] = dateKeys(field).map(pathOf) as [string, string]
    // Rounding the end up keeps a stored local date-time inside its day.
    return overlap(start, end, range.start, range.end, 'yyyy-MM-dd', '||/d')
  }
  const end = pathOf(field.end ?? field.key)
  return overlap(
    pathOf(field.key),
    end,
    range.start,
    range.end,
    'epoch_millis',
    ''
  )
}

function filterClause(
  filter: ResolvedRecordFilter,
  field: RecordField,
  pathOf: (key: string) => string
): ElasticsearchClause {
  const path = pathOf(field.key)
  switch (filter.operator) {
    case 'is':
      return any(filter.values.map((value) => term(path, value)))
    case 'is-not':
      return not(any(filter.values.map((value) => term(path, value))))
    case 'has-all':
      return all(filter.values.map((value) => term(path, value)))
    case 'contains':
    case 'not-contains': {
      const contains = {
        wildcard: {
          [path]: {
            value: `*${literal(filter.value)}*`,
            case_insensitive: true
          }
        }
      }
      return filter.operator === 'contains' ? contains : not(contains)
    }
    case 'eq':
      return term(path, finite(filter.value))
    case 'neq':
      return not(term(path, finite(filter.value)))
    case 'lt':
      return range(path, { lt: finite(filter.value) })
    case 'gt':
      return range(path, { gt: finite(filter.value) })
    case 'between':
      return range(path, {
        gte: finite(filter.value[0]),
        lte: finite(filter.value[1])
      })
    case 'is-true':
      return term(path, true)
    case 'is-false':
      return term(path, false)
    case 'is-set':
      return isSet(field, path)
    case 'is-not-set':
      return not(isSet(field, path))
    case 'overlaps':
      return overlapClause(field, filter.range, pathOf)
  }
}

const isWhole = (value: number, min: number) =>
  Number.isSafeInteger(value) && value >= min

function paging(
  request: RecordsRequest | RecordsPageRequest | RecordsRangeRequest
): Pick<ElasticsearchQuery, 'from' | 'size'> {
  if ('page' in request) {
    const { page, pageSize } = request
    if (isWhole(page, 0) && isWhole(pageSize, 1))
      return { from: page * pageSize, size: pageSize }
  } else if ('start' in request) {
    const { start, end } = request
    if (isWhole(start, 0) && isWhole(end, start + 1))
      return { from: start, size: end - start }
  } else return {}
  throw new RangeError(
    `Elasticsearch fetches a page from 0 of a size from 1, or rows start to end, not ${JSON.stringify(request)}`
  )
}

function knownField(byKey: Map<string, RecordField>, key: string) {
  const field = byKey.get(key)
  if (!field) throw new RangeError(`Unknown field "${key}"`)
  return field
}

/**
 * A records request as an Elasticsearch `query`, `sort`, `from` and `size`,
 * to post as a search body, adding any `aggs`, `highlight` or
 * `track_total_hits` the page needs. Filters mean the same as
 * `matchesRecordQuery` in the browser, one clause per chip in `bool.filter`.
 * Search is a `simple_query_string` that needs every word, in `bool.must`,
 * ranked by the index's analysers. Empty values sort last either way. With
 * no paging there's no `size`, so set one for an export. Throws on an unknown
 * request version or field, on an event or access field filtered by date
 * with no `localDateKey`, and a RangeError on paging that reads no rows.
 */
export function toElasticsearch(
  request: RecordsRequest | RecordsPageRequest | RecordsRangeRequest,
  fields: readonly RecordField[],
  { paths = {}, searchFields, except }: ElasticsearchOptions = {}
): ElasticsearchQuery {
  if (request.version !== RECORDS_REQUEST_VERSION) {
    throw new RangeError(
      `Unsupported records request version ${String(request.version)}`
    )
  }
  const { query } = request
  const byKey = fieldIndex(fields)
  if (except !== undefined) knownField(byKey, except)
  const pathOf = (key: string) => paths[key] ?? key
  const search = query.search.trim()
  const must = search
    ? [
        {
          simple_query_string: {
            query: search,
            fields: [
              ...(searchFields ??
                fields.filter(isSearchable).map((field) => field.key))
            ],
            default_operator: 'and'
          }
        }
      ]
    : []
  const filter = query.filters
    .filter(({ field }) => field !== except)
    .map((chip) => filterClause(chip, knownField(byKey, chip.field), pathOf))
  return {
    query: {
      bool: {
        ...(must.length && { must }),
        ...(filter.length && { filter })
      }
    },
    sort: query.sort.map(({ field, direction }) => {
      knownField(byKey, field)
      return {
        [pathOf(field)]: {
          order: direction === 'descending' ? 'desc' : 'asc',
          missing: '_last'
        }
      }
    }),
    ...paging(request)
  }
}
