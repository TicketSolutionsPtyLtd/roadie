import { addDays, isPlainDate, plainDateOf } from '../datetime/plainDate'
import {
  type ResolvedDateRange,
  resolveAbsolute,
  resolveDateRange
} from '../datetime/ranges'
import { startOfDayInstant, wallBoundInstant } from '../datetime/zone'
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

const WALL_CLOCK =
  /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/

type Bound =
  | { kind: 'date'; date: string }
  | { kind: 'instant'; start: number; end: number }

/**
 * One end of a range. A wall-clock time without an offset bounds a range
 * by the first moment the clock shows it (a start) or the last (an end), so
 * a time skipped by a DST jump starts at the jump and a repeated time ends on
 * its second pass.
 */
function readBound(value: string, timeZone: string): Bound {
  if (isPlainDate(value)) return { kind: 'date', date: value }
  const wall = WALL_CLOCK.exec(value)
  if (!wall) {
    const epoch = resolveAbsolute({ start: value, end: value }, timeZone)
    return {
      kind: 'instant',
      start: epoch.start as number,
      end: epoch.end as number
    }
  }
  const [, date, hour, minute, second, fraction] = wall
  const clock = {
    date: date!,
    hour: Number(hour),
    minute: Number(minute),
    second: Number(second ?? 0),
    millisecond: Number((fraction ?? '0').padEnd(3, '0'))
  }
  return {
    kind: 'instant',
    start: wallBoundInstant(clock, timeZone, 'start'),
    end: wallBoundInstant(clock, timeZone, 'end')
  }
}

function boundStart(bound: Bound, timeZone: string): number {
  return bound.kind === 'instant'
    ? bound.start
    : startOfDayInstant(bound.date, timeZone)
}

function boundEnd(bound: Bound, timeZone: string): number {
  return bound.kind === 'instant'
    ? bound.end
    : startOfDayInstant(addDays(bound.date, 1), timeZone) - 1
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
      // Order is checked on the clock; a range inside a DST gap may still
      // resolve to no instants at all, which matches nothing.
      resolveAbsolute({ start, end }, 'UTC')
      const from = readBound(start, timeZone)
      const to = readBound(end, timeZone)
      return from.kind === 'date' && to.kind === 'date'
        ? dates(from.date, to.date)
        : instants(boundStart(from, timeZone), boundEnd(to, timeZone))
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
      if (filter.operator === 'on') return instants(point.start, point.end)
      return filter.operator === 'before'
        ? instants(null, point.start - 1)
        : instants(point.end + 1, null)
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
