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
 * The places a location filter on `values` takes in: each one, then every
 * place inside them, in option order, matched without case. A value the
 * options don't hold stands alone, a place whose parent they don't hold is a
 * root, and any other field keeps its values. For backends that resolve a
 * URL's filters themselves.
 */
export function recordPlacesWithin(
  field: RecordField,
  values: readonly string[]
): string[] {
  const options = field.type === 'location' ? (field.options ?? []) : []
  const key = (value: string) => value.toLowerCase()
  const known = new Set(options.map(({ value }) => key(value)))
  const children = new Map<string, string[]>()
  for (const { value, parent } of options) {
    if (parent === undefined || !known.has(key(parent))) continue
    const siblings = children.get(key(parent)) ?? []
    siblings.push(key(value))
    children.set(key(parent), siblings)
  }
  const given = new Set(values.map(key))
  const within = new Set(given)
  for (const place of within)
    for (const child of children.get(place) ?? []) within.add(child)
  const inside = options
    .map(({ value }) => value)
    .filter((value) => within.has(key(value)) && !given.has(key(value)))
  return [...new Set(values), ...inside]
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
