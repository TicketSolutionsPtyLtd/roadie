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
    case 'location':
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

/** Option and location fields pick from values the same way. */
export function isRecordOptionField(field: RecordField): boolean {
  return field.type === 'option' || field.type === 'location'
}

/**
 * A record's places, to index once: its location value or values, then each
 * one's ancestors by the options' `parent`, so "is in" stays a plain term.
 * Places are found without case and listed by their options' values, as a
 * filter holds them. A parent the options don't hold ends the
 * line, and a value they don't hold, or any value of a field without
 * options, stands alone.
 */
export function recordPlaces(field: RecordField, value: unknown): string[] {
  return placeReader(field)(value)
}

/** `recordPlaces` for one field, reading its options once for many records. */
export function placeReader(field: RecordField): (value: unknown) => string[] {
  const options = field.type === 'location' ? (field.options ?? []) : []
  const byKey = new Map(
    options.map((option) => [option.value.toLowerCase(), option])
  )
  return (value) => {
    const places = new Set<string>()
    for (const start of Array.isArray(value) ? value : [value]) {
      if (typeof start !== 'string' || start === '') continue
      let place = byKey.get(start.toLowerCase())
      places.add(place?.value ?? start)
      while (place?.parent !== undefined) {
        const parent = byKey.get(place.parent.toLowerCase())
        if (!parent || places.has(parent.value)) break
        places.add(parent.value)
        place = parent
      }
    }
    return [...places]
  }
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
