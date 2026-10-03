import {
  type DateRangeValue,
  isAbsoluteRange
} from '@oztix/roadie-core/datetime'
import {
  type RecordField,
  type RecordFilter,
  type RecordFilterOperator,
  recordFilterOperators
} from '@oztix/roadie-core/records'

/** A date's `between` and `within` share one choice: a range, fixed or relative. */
export type EditorOperator = Exclude<RecordFilterOperator, 'within'> | 'range'

/** Every value an editor has held, so switching operators keeps them. */
export type FilterDraft = {
  operator: EditorOperator
  values: string[]
  text: string
  low: number | null
  high: number | null
  date: string | null
  range: DateRangeValue | null
}

export function editorOperators(field: RecordField): EditorOperator[] {
  const operators = recordFilterOperators(field)
  if (field.type !== 'date') return operators as EditorOperator[]
  return [
    'range',
    ...(operators.filter(
      (operator) => operator !== 'between' && operator !== 'within'
    ) as EditorOperator[])
  ]
}

export function editorOperatorOf(filter: RecordFilter, field: RecordField) {
  return field.type === 'date' &&
    (filter.operator === 'between' || filter.operator === 'within')
    ? 'range'
    : (filter.operator as EditorOperator)
}

const EMPTY: Omit<FilterDraft, 'operator'> = {
  values: [],
  text: '',
  low: null,
  high: null,
  date: null,
  range: null
}

export function draftOf(
  field: RecordField,
  filter: RecordFilter | null
): FilterDraft {
  if (!filter) return { ...EMPTY, operator: editorOperators(field)[0]! }
  const draft: FilterDraft = {
    ...EMPTY,
    operator: editorOperatorOf(filter, field)
  }
  switch (filter.operator) {
    case 'is':
    case 'is-not':
    case 'has-all':
      return { ...draft, values: filter.values, text: filter.values[0] ?? '' }
    case 'contains':
    case 'not-contains':
      return { ...draft, text: filter.value }
    case 'eq':
    case 'neq':
    case 'lt':
    case 'gt':
      return { ...draft, low: filter.value }
    case 'between': {
      const [start, end] = filter.value
      return typeof start === 'number' && typeof end === 'number'
        ? { ...draft, low: start, high: end }
        : { ...draft, range: { start: String(start), end: String(end) } }
    }
    case 'on':
    case 'before':
    case 'after':
      return { ...draft, date: filter.value }
    case 'within':
      return { ...draft, range: filter.value }
    default:
      return draft
  }
}

/** The filter a draft makes, or null while it still needs a value. */
export function filterOf(
  field: RecordField,
  draft: FilterDraft
): RecordFilter | null {
  const key = field.key
  const { operator } = draft
  switch (operator) {
    case 'is':
    case 'is-not':
    case 'has-all': {
      const values =
        field.type === 'text'
          ? [draft.text.trim()].filter(Boolean)
          : draft.values
      return values.length > 0 ? { field: key, operator, values } : null
    }
    case 'contains':
    case 'not-contains': {
      const value = draft.text.trim()
      return value ? { field: key, operator, value } : null
    }
    case 'eq':
    case 'neq':
    case 'lt':
    case 'gt':
      return draft.low === null
        ? null
        : { field: key, operator, value: draft.low }
    case 'between':
      return draft.low !== null && draft.high !== null
        ? {
            field: key,
            operator,
            value: [
              Math.min(draft.low, draft.high),
              Math.max(draft.low, draft.high)
            ]
          }
        : null
    case 'on':
    case 'before':
    case 'after':
      return draft.date ? { field: key, operator, value: draft.date } : null
    case 'range':
      if (!draft.range) return null
      return isAbsoluteRange(draft.range)
        ? {
            field: key,
            operator: 'between',
            value: [draft.range.start, draft.range.end]
          }
        : { field: key, operator: 'within', value: draft.range }
    case 'is-true':
    case 'is-false':
    case 'is-set':
    case 'is-not-set':
      return { field: key, operator }
  }
}

/** Whether the draft holds no value at all for its operator, as when every value is cleared. */
export function isEmptyDraft(field: RecordField, draft: FilterDraft): boolean {
  switch (draft.operator) {
    case 'is':
    case 'is-not':
    case 'has-all':
      return field.type === 'text'
        ? !draft.text.trim()
        : draft.values.length === 0
    case 'contains':
    case 'not-contains':
      return !draft.text.trim()
    case 'eq':
    case 'neq':
    case 'lt':
    case 'gt':
      return draft.low === null
    case 'between':
      return draft.low === null && draft.high === null
    case 'on':
    case 'before':
    case 'after':
      return !draft.date
    case 'range':
      return !draft.range
    default:
      return false
  }
}
