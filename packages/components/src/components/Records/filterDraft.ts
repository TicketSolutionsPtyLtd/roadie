import {
  type DateRangeValue,
  isAbsoluteRange,
  plainDateOf,
  resolveDateRange
} from '@oztix/roadie-core/datetime'
import type { RecordFilter } from '@oztix/roadie-core/records'

/** Custom dates' conditions: a range, fixed or relative, or one date. */
export type DateOperator = 'range' | 'on' | 'before' | 'after'

export const DATE_OPERATORS: readonly DateOperator[] = [
  'range',
  'on',
  'before',
  'after'
]

/** Every value the editor has held, so switching conditions keeps them. */
export type DateDraft = {
  operator: DateOperator
  date: string | null
  range: DateRangeValue | null
}

/** The condition a filter is edited under, or null for one Custom dates doesn't hold, such as Empty. */
export function dateOperatorOf(filter: RecordFilter): DateOperator | null {
  switch (filter.operator) {
    case 'between':
    case 'within':
      return 'range'
    case 'on':
    case 'before':
    case 'after':
      return filter.operator
    default:
      return null
  }
}

export function draftOf(filter: RecordFilter | null): DateDraft {
  const draft: DateDraft = {
    operator: (filter && dateOperatorOf(filter)) ?? 'range',
    date: null,
    range: null
  }
  switch (filter?.operator) {
    case 'between': {
      const [start, end] = filter.value
      return { ...draft, range: { start: String(start), end: String(end) } }
    }
    case 'within':
      return { ...draft, range: filter.value }
    case 'on':
    case 'before':
    case 'after':
      return { ...draft, date: filter.value }
    default:
      return draft
  }
}

/** The filter a draft makes, or null while it still needs a date. */
export function filterOf(field: string, draft: DateDraft): RecordFilter | null {
  const { operator, date, range } = draft
  if (operator !== 'range')
    return date ? { field, operator, value: date } : null
  if (!range) return null
  return isAbsoluteRange(range)
    ? { field, operator: 'between', value: [range.start, range.end] }
    : { field, operator: 'within', value: range }
}

/** A range's first and last days, or null for one that can't be read as days. */
function daysOf(
  range: DateRangeValue,
  today: string | undefined
): { start: string; end: string } | null {
  if (isAbsoluteRange(range)) return range
  if (!today) return null
  try {
    // Read at noon UTC, as the range picker reads its presets.
    const resolved = resolveDateRange(range, {
      now: new Date(`${today}T12:00:00Z`),
      timeZone: 'UTC'
    })
    return resolved.kind === 'dates' ? resolved : null
  } catch {
    return null
  }
}

const OFFSET = /(?:Z|[+-]\d{2}:\d{2})$/

/** The day a date or date-time falls on, where the records are. */
const dayOf = (value: string, timeZone: string) =>
  OFFSET.test(value)
    ? plainDateOf(new Date(value), timeZone)
    : value.slice(0, 10)

/**
 * The draft under another condition. One with no date yet takes it from the
 * other, so the filter holds what the editor shows: on and before take a
 * range's first day, after its last, and a range takes the one date as a day.
 * Before and after keep a time, so they still exclude the range.
 */
export function withCondition(
  draft: DateDraft,
  operator: DateOperator,
  { today, timeZone }: { today: string | undefined; timeZone: string }
): DateDraft {
  const next = { ...draft, operator }
  if (operator === 'range') {
    if (next.range || !draft.date) return next
    const day = dayOf(draft.date, timeZone)
    return { ...next, range: { start: day, end: day } }
  }
  const days = !next.date && draft.range && daysOf(draft.range, today)
  if (!days) return next
  if (operator === 'after') return { ...next, date: days.end }
  return {
    ...next,
    date: operator === 'on' ? dayOf(days.start, timeZone) : days.start
  }
}

/** Whether the draft holds no date for its condition, as when one is cleared. */
export const isEmptyDraft = (draft: DateDraft) =>
  draft.operator === 'range' ? !draft.range : !draft.date
