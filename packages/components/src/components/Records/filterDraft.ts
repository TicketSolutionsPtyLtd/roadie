import {
  type DateRangeValue,
  isAbsoluteRange
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

/** Whether the draft holds no date for its condition, as when one is cleared. */
export const isEmptyDraft = (draft: DateDraft) =>
  draft.operator === 'range' ? !draft.range : !draft.date
