import type { TableStatus } from '../dashboard/cells'
import type { ValueFormat } from '../dataviz/format'
import type { Instantish } from '../datetime/format'
import type { RelativeRange } from '../datetime/ranges'
import type { RECORD_VIEW_VERSION } from './versions'

/** The dashboard status column's `{ intent, label?, order? }`, shared. */
export type StatusDefinition = TableStatus

export type RecordSortDirection = 'ascending' | 'descending'

export type RecordSort = { field: string; direction: RecordSortDirection }

/** A chip. Chips are ANDed; the values inside one chip are ORed. */
export type RecordFilter =
  | { field: string; operator: 'is' | 'is-not' | 'has-all'; values: string[] }
  | { field: string; operator: 'contains' | 'not-contains'; value: string }
  | { field: string; operator: 'eq' | 'neq' | 'lt' | 'gt'; value: number }
  | {
      field: string
      operator: 'between'
      value: [number, number] | [string, string]
    }
  /** An ISO date, or a date-time on a `timestamp` field. */
  | { field: string; operator: 'on' | 'before' | 'after'; value: string }
  | { field: string; operator: 'within'; value: RelativeRange }
  | { field: string; operator: 'is-true' | 'is-false' }
  | { field: string; operator: 'is-set' | 'is-not-set' }

export type RecordFilterOperator = RecordFilter['operator']

export type RecordQuery = {
  search: string
  /** Chip order is kept, and a field may repeat. */
  filters: RecordFilter[]
  sort: RecordSort[]
}

export type RecordLayout =
  | { type: 'table'; columns?: { order?: string[]; hidden?: string[] } }
  | { type: 'grid'; fields?: string[] }

export type RecordView = {
  /** `validateRecordView` reads a view without one as `RECORD_VIEW_VERSION`. */
  version?: typeof RECORD_VIEW_VERSION
  id?: string
  /** Required once saved; a view read from a URL has none. */
  name?: string
  entity?: string
  query: RecordQuery
  layout: RecordLayout
}

/** Page, scroll row and selection belong to the session, never the view. */
export type RecordPosition = {
  /** Zero-based; the URL shows it one-based. */
  page?: number
  pageSize?: number
  row?: number
}

/**
 * The records an action takes: picked ids, or everything the query matches
 * except some. Session state like the position, never part of a view.
 */
export type RecordSelection =
  | { readonly ids: readonly string[] }
  | { readonly allMatching: true; readonly except: readonly string[] }

/**
 * `location` is a place, such as a suburb, or a list of places. Its options
 * nest by `parent`, so `is` and `is-not` mean is in and is not in: a record is
 * in each of its places and their ancestors. Distance filters are reserved for
 * later as a `near` operator, never `within`, which dates use.
 */
export type RecordFieldType =
  'text' | 'option' | 'location' | 'number' | 'money' | 'date' | 'boolean'

/**
 * How a date field is compared. `event` and `access` compare the venue-local
 * calendar date, `timestamp` the viewer's, and `date` a plain date.
 */
export type RecordMoment = 'event' | 'access' | 'timestamp' | 'date'

/** What kind of place a location's option is. Open to others. */
export type RecordPlaceKind =
  'venue' | 'suburb' | 'city' | 'region' | 'state' | 'country' | (string & {})

export type RecordOption = {
  value: string
  label: string
  /** Another option's value. A location's place is inside its parent. */
  parent?: string
  /** A location's place only. Suggestions describe it: "Suburb in Brisbane". */
  kind?: RecordPlaceKind
}

/**
 * What a record field holds. Every per-row fact is a key, not a function, so
 * one definition works in the browser, on a server and in an adapter.
 */
export type RecordField = {
  key: string
  label: string
  type: RecordFieldType
  /** Defaults to true. */
  filterable?: boolean
  /** Defaults to true. */
  sortable?: boolean
  /** Free-text search reads it. Defaults to true for text, false otherwise. */
  searchable?: boolean
  /** The row holds a list: `is` means has any of, `is-not` has none of. Date fields cannot be filtered as lists yet. */
  multiple?: boolean
  /** A date range: the key holding the end. Filters test overlap. */
  end?: string
  /** Defaults to `timestamp`. */
  moment?: RecordMoment
  /** Event and access moments: the row key holding the venue's IANA zone. */
  timeZoneKey?: string
  /** Event and access moments: the stored venue-local date, 'YYYY-MM-DD'. */
  localDateKey?: string
  /** Event and access ranges: the stored venue-local date of the end. */
  endLocalDateKey?: string
  /**
   * Identifiers, such as order numbers, matched exactly and ignoring case: a
   * pattern string anchored with ^ and $, such as '^OZ-\\d{5}$'.
   */
  match?: string
  /** How a number or money field's values read. Defaults to `number`, or `currency` for money. */
  format?: ValueFormat
  /** A fixed ISO 4217 code. */
  currency?: string
  /** The row key holding the ISO 4217 code. */
  currencyKey?: string
  status?: Record<string, StatusDefinition>
  options?: RecordOption[]
}

export type RecordQueryOptions = {
  now: Instantish
  /** The viewer's zone: it decides what "today" is. */
  timeZone: string
  /** 1 is Monday, the default. */
  weekStart?: number
  /** Defaults to 7, July. */
  fiscalYearStart?: number
}

export type RecordViewProblem = {
  path: string
  message: string
  severity: 'error' | 'warning'
}
