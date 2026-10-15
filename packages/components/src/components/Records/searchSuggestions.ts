import type { DateRangeValue } from '@oztix/roadie-core/datetime'
import {
  type RecordField,
  type RecordFilter,
  type RecordFilterOperator,
  type RecordQueryOptions,
  type RecordSuggestion,
  describeRecordFilter,
  parseQuery,
  recordFieldOptions,
  recordFilterOperators,
  recordOperatorLabel
} from '@oztix/roadie-core/records'

import type {
  QueryFieldChip,
  QueryFieldOperator,
  QueryFieldSuggestion,
  QueryFieldSuggestionGroup
} from '../QueryField'
import { describeFilter } from './clock'

/** What a search suggestion does once taken. */
export type SearchValue =
  | { type: 'filter'; filter: RecordFilter }
  | { type: 'field'; field: string }
  /** Opens the editor for a new filter on the field, such as "Custom dates". */
  | { type: 'edit'; field: string }

export type SearchSuggestion = QueryFieldSuggestion<SearchValue>
export type SearchGroup = QueryFieldSuggestionGroup<SearchValue>

export type SearchContext = RecordQueryOptions & {
  fields: readonly RecordField[]
  /** Scope and view filters, so a suggestion never repeats one. */
  filters: readonly RecordFilter[]
}

const UPCOMING: readonly DateRangeValue[] = [
  'today',
  'tomorrow',
  'this-weekend',
  'this-week',
  'next-week',
  'this-month',
  'next-month',
  { direction: 'next', amount: 7, unit: 'day' },
  { direction: 'next', amount: 30, unit: 'day' },
  'upcoming',
  'past'
]

const RECENT: readonly DateRangeValue[] = [
  'today',
  'yesterday',
  'this-week',
  'last-week',
  'this-month',
  'last-month',
  { direction: 'past', amount: 7, unit: 'day' },
  { direction: 'past', amount: 30, unit: 'day' },
  { direction: 'past', amount: 90, unit: 'day' }
]

/** Quick dates for a date field: what's coming up, or for timestamps, what just happened. */
export function datePresets(field: RecordField): readonly DateRangeValue[] {
  return (field.moment ?? 'timestamp') === 'timestamp' ? RECENT : UPCOMING
}

/** Fields whose values are picked from a list; the rest open an editor. */
export function hasValueStep(field: RecordField): boolean {
  return (
    field.type === 'option' || field.type === 'boolean' || field.type === 'date'
  )
}

/** How an option field's value step compares, chosen before its values. */
export type ValueOperator = 'is' | 'is-not' | 'has-all'

const VALUE_OPERATORS: readonly RecordFilterOperator[] = [
  'is',
  'is-not',
  'has-all'
]

export function isValueOperator(operator: string): operator is ValueOperator {
  return (VALUE_OPERATORS as readonly string[]).includes(operator)
}

/** The operators a value step toggles between: an option field's, or none. */
export function valueOperators(
  field: RecordField
): (QueryFieldOperator & { value: ValueOperator })[] {
  if (field.type !== 'option') return []
  return recordFilterOperators(field)
    .filter(isValueOperator)
    .map((value) => ({ value, label: recordOperatorLabel(value) }))
}

/** What the value step's pending chip reads, such as "Venue is not". */
export function pendingLabel(
  field: RecordField,
  operator: ValueOperator
): string {
  if (field.type === 'date') return field.label
  if (field.type === 'option')
    return `${field.label} ${recordOperatorLabel(operator)}`
  return `${field.label} is`
}

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical)
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, item]) => item !== undefined)
        .sort(([a], [b]) => (a < b ? -1 : 1))
        .map(([key, item]) => [key, canonical(item)])
    )
  return value
}

/** The same whatever its key order, and for a list of values, their order. */
export function filterKey(filter: RecordFilter): string {
  const values =
    'values' in filter ? { values: [...new Set(filter.values)].sort() } : {}
  return JSON.stringify(canonical({ ...filter, ...values }))
}

export const sameFilter = (a: RecordFilter, b: RecordFilter) =>
  filterKey(a) === filterKey(b)

function filterSuggestion(filter: RecordFilter): SearchSuggestion {
  return {
    id: `filter:${filterKey(filter)}`,
    kind: 'filter',
    label: '',
    value: { type: 'filter', filter }
  }
}

function fromParsed(suggestion: RecordSuggestion): SearchSuggestion {
  if (suggestion.kind === 'field')
    return {
      id: suggestion.id,
      kind: 'field',
      label: suggestion.label,
      value: { type: 'field', field: suggestion.value.field },
      remainder: suggestion.remainder
    }
  return {
    id: suggestion.id,
    kind: 'filter',
    label: suggestion.label,
    value: { type: 'filter', filter: suggestion.value },
    remainder: suggestion.remainder,
    ...(suggestion.description && { description: suggestion.description }),
    ...(suggestion.exact && { exact: true })
  }
}

function unused(
  items: readonly SearchSuggestion[],
  context: SearchContext
): SearchSuggestion[] {
  return items.filter(({ value }) => {
    if (value.type !== 'filter') return true
    const { filter } = value
    return !context.filters.some(
      (other) =>
        sameFilter(other, filter) ||
        (filter.operator === 'is' &&
          other.operator === 'is' &&
          other.field === filter.field &&
          filter.values.every((item) => other.values.includes(item)))
    )
  })
}

/** Suggestions while nothing is pending: filters the text reads, then fields it names. */
export function topSuggestions(
  text: string,
  context: SearchContext
): SearchGroup[] {
  const parsed = parseQuery(text, context).map((suggestion) =>
    fromParsed(suggestion)
  )
  if (!text.trim()) return [{ id: 'fields', label: 'Filter by', items: parsed }]
  return [
    {
      id: 'filters',
      label: 'Filters',
      items: unused(
        parsed.filter((item) => item.kind === 'filter'),
        context
      )
    },
    {
      id: 'fields',
      label: 'Fields',
      items: parsed.filter((item) => item.kind === 'field')
    }
  ]
}

/** What a field offers before anything is typed. Labels come later. */
function presetItems(
  field: RecordField,
  operator: ValueOperator
): SearchSuggestion[] {
  switch (field.type) {
    case 'option':
      return recordFieldOptions(field).map((option) =>
        filterSuggestion({ field: field.key, operator, values: [option.value] })
      )
    case 'boolean':
      return (['is-true', 'is-false'] as const).map((operator) =>
        filterSuggestion({ field: field.key, operator })
      )
    case 'date':
      return datePresets(field).map((value) =>
        filterSuggestion(
          typeof value === 'object' && 'start' in value
            ? {
                field: field.key,
                operator: 'between',
                value: [value.start, value.end]
              }
            : { field: field.key, operator: 'within', value }
        )
      )
    default:
      return []
  }
}

function customDates(field: RecordField): SearchSuggestion {
  return {
    id: `edit:${field.key}`,
    kind: 'filter',
    label: 'Custom dates',
    value: { type: 'edit', field: field.key }
  }
}

const EMPTINESS = [
  { operator: 'is-not-set', label: 'Empty' },
  { operator: 'is-set', label: 'Not empty' }
] as const

/** Whether the text starts at one of the label's words: "not" or "empty". */
function startsAWord(label: string, text: string): boolean {
  const words = label.toLowerCase().split(' ')
  return words.some((_, index) =>
    words.slice(index).join(' ').startsWith(text.toLowerCase())
  )
}

function emptinessItems(field: RecordField, typed: string): SearchSuggestion[] {
  const allowed = recordFilterOperators(field)
  return EMPTINESS.filter(
    ({ operator, label }) =>
      allowed.includes(operator) && startsAWord(label, typed)
  ).map(({ operator, label }) => ({
    ...filterSuggestion({ field: field.key, operator }),
    label
  }))
}

/** An option value read from typed text, compared by the step's operator. */
function withOperator(
  item: SearchSuggestion,
  operator: ValueOperator
): SearchSuggestion {
  const { value } = item
  if (value.type !== 'filter' || value.filter.operator !== 'is') return item
  const filter = { ...value.filter, operator }
  return { ...item, ...filterSuggestion(filter), label: item.label }
}

/**
 * Suggestions for one field's value, after it was picked: Empty and Not empty
 * first, where the field allows them, then its values, which for an option
 * field compare by `operator`.
 */
export function valueSuggestions(
  field: RecordField,
  text: string,
  context: SearchContext,
  operator: ValueOperator = 'is'
): SearchGroup[] {
  const typed = text.trim()
  const unlisted =
    field.type === 'option' && recordFieldOptions(field).length === 0
  const items = !typed
    ? presetItems(field, operator)
    : unlisted
      ? [filterSuggestion({ field: field.key, operator, values: [typed] })]
      : parseQuery(`${field.key}:${typed}`, { ...context, fields: [field] })
          .filter((suggestion) => suggestion.kind === 'filter')
          .map((suggestion) => fromParsed(suggestion))
          .map((item) =>
            field.type === 'option' ? withOperator(item, operator) : item
          )
  const values = unused(items, context).map((item) => {
    if (item.value.type !== 'filter') return item
    const { value, detail } = describeRecordFilter(
      item.value.filter,
      context.fields,
      context
    )
    return {
      ...item,
      label: value,
      remainder: undefined,
      ...(detail && { description: detail })
    }
  })
  const emptiness = unused(emptinessItems(field, typed), context)
  // Not a typed match, so it gives way to a typed Empty, or Enter takes it.
  const editable =
    field.type === 'date' &&
    recordFilterOperators(field).some((operator) => operator === 'between') &&
    (!typed || emptiness.length === 0)
  return [
    ...(emptiness.length > 0
      ? [{ id: 'empty', label: 'Empty', hideLabel: true, items: emptiness }]
      : []),
    {
      id: 'values',
      label: field.label,
      items: [...values, ...(editable ? [customDates(field)] : [])]
    }
  ]
}

/** Option `is` filters on one field merge into one chip, as its values are ORed. */
export function mergeFilter(
  filters: readonly RecordFilter[],
  filter: RecordFilter,
  fields: readonly RecordField[]
): { index: number; filter: RecordFilter } | null {
  const field = fields.find(({ key }) => key === filter.field)
  if (filter.operator !== 'is' || field?.type !== 'option') return null
  const at = filters.findIndex(
    (other) => other.field === filter.field && other.operator === 'is'
  )
  if (at < 0) return null
  const existing = filters[at] as { values: string[] }
  return {
    index: at,
    filter: {
      ...filter,
      values: [...new Set([...existing.values, ...filter.values])]
    }
  }
}

export type ChipOptions = {
  scope: readonly RecordFilter[]
  filters: readonly RecordFilter[]
  skipped: readonly number[]
  /** Scope filters, by index, that the records skip. */
  skippedScope?: readonly number[]
}

export const scopeChipId = (index: number) => `scope:${index}`

const NOT_APPLIED = 'Not applied: these records can’t be filtered this way'

/** Whether these fields can apply a filter, as the records decide. */
function fits(filter: RecordFilter, fields: readonly RecordField[]) {
  const field = fields.find(({ key }) => key === filter.field)
  return (
    !!field &&
    field.filterable !== false &&
    recordFilterOperators(field).includes(filter.operator)
  )
}

/**
 * Each filter's chip id, by what it filters rather than where it sits, so a
 * click on a chip that has just moved never reaches its neighbour.
 */
export function filterChipIds(filters: readonly RecordFilter[]): string[] {
  const seen = new Map<string, number>()
  return filters.map((filter) => {
    const key = filterKey(filter)
    const count = seen.get(key) ?? 0
    seen.set(key, count + 1)
    return `filter:${key}#${count}`
  })
}

/** Scope chips, locked, then the view's filters in order. */
export function searchChips(
  { scope, filters, skipped, skippedScope = [] }: ChipOptions,
  context: Omit<SearchContext, 'filters'>
): QueryFieldChip[] {
  const describe = (filter: RecordFilter) =>
    describeFilter(filter, context.fields, context)
  const ids = filterChipIds(filters)
  return [
    ...scope.map((filter, index) => {
      const { label, detail } = describe(filter)
      const unusable =
        skippedScope.includes(index) || !fits(filter, context.fields)
      const description = unusable ? NOT_APPLIED : detail
      return {
        id: scopeChipId(index),
        label,
        locked: true,
        ...(unusable && { intent: 'warning' as const }),
        ...(description && { description })
      }
    }),
    ...filters.map((filter, index) => {
      const { label, detail } = describe(filter)
      const unusable = skipped.includes(index)
      const description = unusable ? NOT_APPLIED : detail
      return {
        id: ids[index]!,
        label,
        ...(unusable && { intent: 'warning' as const }),
        ...(description && { description })
      }
    })
  ]
}
