import { addDays, plainDateOf } from '../datetime/plainDate'
import {
  type ResolvedDateRange,
  resolveAbsolute,
  resolveDateRange
} from '../datetime/ranges'
import { startOfDayInstant } from '../datetime/zone'
import { boundEnd, boundStart, readBound } from './bounds'
import { fieldIndex, momentOf } from './fields'
import type {
  RecordField,
  RecordFilter,
  RecordQuery,
  RecordQueryOptions,
  RecordSort
} from './types'

/**
 * Ends are inclusive and null is open. `dates` compare calendar dates: the
 * venue's for event and access moments, the date itself for a date moment.
 * `instants` compare epoch milliseconds.
 */
export type ResolvedRecordRange =
  | { kind: 'dates'; start: string | null; end: string | null }
  | { kind: 'instants'; start: number | null; end: number | null }

/** Date filters become one overlap test; the rest stay as they are. */
export type ResolvedRecordFilter =
  | Exclude<
      RecordFilter,
      { operator: 'on' | 'before' | 'after' | 'within' | 'between' }
    >
  | { field: string; operator: 'between'; value: [number, number] }
  | { field: string; operator: 'overlaps'; range: ResolvedRecordRange }

export type ResolvedRecordQuery = {
  search: string
  filters: ResolvedRecordFilter[]
  sort: RecordSort[]
  /** The viewer's zone, used when a row names no venue zone. */
  timeZone: string
}

type DateFilter = Extract<
  RecordFilter,
  { operator: 'on' | 'before' | 'after' | 'within' | 'between' }
>

function isDateFilter(filter: RecordFilter): filter is DateFilter {
  return (
    filter.operator === 'on' ||
    filter.operator === 'before' ||
    filter.operator === 'after' ||
    filter.operator === 'within' ||
    (filter.operator === 'between' && typeof filter.value[0] === 'string')
  )
}

const dates = (start: string | null, end: string | null) =>
  ({ kind: 'dates', start, end }) as const

const instants = (start: number | null, end: number | null) =>
  ({ kind: 'instants', start, end }) as const

function fromResolved(range: ResolvedDateRange): ResolvedRecordRange {
  return range.kind === 'dates'
    ? dates(range.start, range.end)
    : instants(range.start, range.end)
}

/** What the filter covers, before the field's moment decides the units. */
function filterRange(
  filter: DateFilter,
  options: RecordQueryOptions
): ResolvedRecordRange {
  const { timeZone } = options
  switch (filter.operator) {
    case 'within':
      return fromResolved(resolveDateRange(filter.value, options))
    case 'between': {
      const [start, end] = filter.value as [string, string]
      const from = readBound(start, timeZone)
      const to = readBound(end, timeZone)
      if (from.kind === 'date' && to.kind === 'date') {
        return fromResolved(resolveAbsolute({ start, end }, timeZone))
      }
      const first = boundStart(from, timeZone)
      const last = boundEnd(to, timeZone)
      if (first > last) {
        throw new RangeError(`Range starts after it ends: ${start}`)
      }
      return instants(first, last)
    }
    case 'on':
    case 'before':
    case 'after': {
      const point = readBound(filter.value, timeZone)
      if (point.kind === 'date') {
        if (filter.operator === 'on') return dates(point.date, point.date)
        return filter.operator === 'before'
          ? dates(null, addDays(point.date, -1))
          : dates(addDays(point.date, 1), null)
      }
      if (filter.operator === 'on') return instants(point.at, point.at)
      return filter.operator === 'before'
        ? instants(null, point.at - 1)
        : instants(point.at + 1, null)
    }
  }
}

function toInstants(
  range: ResolvedRecordRange,
  timeZone: string
): ResolvedRecordRange {
  if (range.kind === 'instants') return range
  return instants(
    range.start === null ? null : startOfDayInstant(range.start, timeZone),
    range.end === null
      ? null
      : startOfDayInstant(addDays(range.end, 1), timeZone) - 1
  )
}

const OPEN_DAYS = new Set(['upcoming', 'past', 'ongoing'])

/** A plain date has no hours, so "now" in an open range becomes today. */
function toDates(
  filter: DateFilter,
  range: ResolvedRecordRange,
  field: RecordField,
  options: RecordQueryOptions
): ResolvedRecordRange {
  if (range.kind === 'dates') return range
  const value = filter.operator === 'within' ? filter.value : null
  if (typeof value !== 'string' || !OPEN_DAYS.has(value)) {
    throw new RangeError(
      `"${field.label}" holds plain dates, so it cannot be filtered by time`
    )
  }
  const today = plainDateOf(options.now, options.timeZone)
  if (value === 'upcoming') return dates(today, null)
  if (value === 'past') return dates(null, addDays(today, -1))
  return dates(today, today)
}

function resolveDateFilter(
  filter: DateFilter,
  field: RecordField,
  options: RecordQueryOptions
): ResolvedRecordFilter {
  const range = filterRange(filter, options)
  const moment = momentOf(field)
  return {
    field: filter.field,
    operator: 'overlaps',
    range:
      moment === 'timestamp'
        ? toInstants(range, options.timeZone)
        : moment === 'date'
          ? toDates(filter, range, field, options)
          : range
  }
}

/**
 * Turns relative and absolute date filters into fixed ranges, as at `now`.
 * Calendar words resolve in the viewer's zone. Event and access moments then
 * compare each record's venue-local date, so "today" is today's date at
 * every venue; timestamps compare instants across the viewer's day.
 */
export function resolveRecordQuery(
  query: RecordQuery,
  fields: readonly RecordField[],
  options: RecordQueryOptions
): ResolvedRecordQuery {
  const byKey = fieldIndex(fields)
  for (const { field } of query.sort) {
    if (!byKey.has(field)) throw new RangeError(`Unknown field "${field}"`)
  }
  return {
    search: query.search,
    sort: query.sort,
    timeZone: options.timeZone,
    filters: query.filters.map((filter) => {
      const field = byKey.get(filter.field)
      if (!field) throw new RangeError(`Unknown field "${filter.field}"`)
      return isDateFilter(filter)
        ? resolveDateFilter(filter, field, options)
        : (filter as ResolvedRecordFilter)
    })
  }
}
