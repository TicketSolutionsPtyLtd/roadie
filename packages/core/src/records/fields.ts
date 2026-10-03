import { humaniseStatus } from '../dashboard/cells'
import type {
  RecordField,
  RecordFilterOperator,
  RecordMoment,
  RecordOption
} from './types'

const EMPTINESS: RecordFilterOperator[] = ['is-set', 'is-not-set']

/** The operators a field's filters may use, in the order an editor lists them. */
export function recordFilterOperators(
  field: RecordField
): RecordFilterOperator[] {
  switch (field.type) {
    case 'text':
      return ['contains', 'not-contains', 'is', 'is-not', ...EMPTINESS]
    case 'option':
      return field.multiple
        ? ['is', 'is-not', 'has-all', ...EMPTINESS]
        : ['is', 'is-not', ...EMPTINESS]
    case 'number':
    case 'money':
      return ['eq', 'neq', 'lt', 'gt', 'between', ...EMPTINESS]
    case 'date':
      return isDateList(field)
        ? []
        : ['on', 'before', 'after', 'between', 'within', ...EMPTINESS]
    case 'boolean':
      return ['is-true', 'is-false', ...EMPTINESS]
  }
}

/** A field's values: its `options`, or its `status` keys in status order. */
export function recordFieldOptions(field: RecordField): RecordOption[] {
  if (field.options) return field.options
  if (!field.status) return []
  return Object.entries(field.status)
    .map(([value, status], index) => ({ value, status, index }))
    .sort(
      (a, b) =>
        (a.status.order ?? Infinity) - (b.status.order ?? Infinity) ||
        a.index - b.index
    )
    .map(({ value, status }) => ({
      value,
      label: status.label ?? humaniseStatus(value)
    }))
}

export function momentOf(field: RecordField): RecordMoment {
  return field.moment ?? 'timestamp'
}

/** Filters cannot read a list of dates yet. */
export function isDateList(field: RecordField): boolean {
  return field.type === 'date' && field.multiple === true
}

export function isFilterable(field: RecordField): boolean {
  return field.filterable !== false && !isDateList(field)
}

export function isSortable(field: RecordField): boolean {
  return field.sortable !== false
}

export function isSearchable(field: RecordField): boolean {
  return field.searchable ?? field.type === 'text'
}

export function fieldIndex(
  fields: readonly RecordField[]
): Map<string, RecordField> {
  return new Map(fields.map((field) => [field.key, field]))
}
