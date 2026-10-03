import type { DateRangeValue } from '@oztix/roadie-core/datetime'
import {
  type RecordField,
  type RecordFilter,
  type RecordQueryOptions,
  type RecordSuggestion,
  describeRecordFilter,
  parseQuery,
  recordFieldOptions,
  recordFilterOperators
} from '@oztix/roadie-core/records'

import type {
  QueryFieldChip,
  QueryFieldSuggestion,
  QueryFieldSuggestionGroup
} from '../QueryField'

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

const sameFilter = (a: RecordFilter, b: RecordFilter) =>
  JSON.stringify(a) === JSON.stringify(b)

function filterSuggestion(filter: RecordFilter): SearchSuggestion {
  return {
    id: `filter:${JSON.stringify(filter)}`,
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
      value: { type: 'field', field: suggestion.value.field }
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
  return items.filter(
    ({ value }) =>
      value.type !== 'filter' ||
      !context.filters.some((filter) => sameFilter(filter, value.filter))
  )
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
function presetItems(field: RecordField): SearchSuggestion[] {
  switch (field.type) {
    case 'option':
      return recordFieldOptions(field).map((option) =>
        filterSuggestion({
          field: field.key,
          operator: 'is',
          values: [option.value]
        })
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

function editItem(field: RecordField): SearchSuggestion {
  return {
    id: `edit:${field.key}`,
    kind: 'filter',
    label: field.type === 'date' ? 'Custom dates' : `Choose a value`,
    value: { type: 'edit', field: field.key }
  }
}

/** Suggestions for one field's value, after it was picked. */
export function valueSuggestions(
  field: RecordField,
  text: string,
  context: SearchContext
): SearchGroup[] {
  const typed = text.trim()
  const items = typed
    ? parseQuery(`${field.key}:${typed}`, { ...context, fields: [field] })
        .filter((suggestion) => suggestion.kind === 'filter')
        .map((suggestion) => fromParsed(suggestion))
    : presetItems(field)
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
  const editable =
    field.type === 'date' &&
    recordFilterOperators(field).some((operator) => operator === 'between')
  return [
    {
      id: 'values',
      label: field.label,
      items: editable ? [...values, editItem(field)] : values
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
}

export const scopeChipId = (index: number) => `scope:${index}`
export const filterChipId = (index: number) => `filter:${index}`
export const chipIndex = (id: string) =>
  id.startsWith('filter:') ? Number(id.slice('filter:'.length)) : -1

/** Scope chips, locked, then the view's filters in order. */
export function searchChips(
  { scope, filters, skipped }: ChipOptions,
  context: Omit<SearchContext, 'filters'>
): QueryFieldChip[] {
  const describe = (filter: RecordFilter) =>
    describeRecordFilter(filter, context.fields, context)
  return [
    ...scope.map((filter, index) => {
      const { label, detail } = describe(filter)
      return {
        id: scopeChipId(index),
        label,
        locked: true,
        ...(detail && { description: detail })
      }
    }),
    ...filters.map((filter, index) => {
      const { label, detail } = describe(filter)
      const unusable = skipped.includes(index)
      const description = unusable
        ? 'Not applied: these records can’t be filtered this way'
        : detail
      return {
        id: filterChipId(index),
        label,
        ...(unusable && { intent: 'warning' as const }),
        ...(description && { description })
      }
    })
  ]
}
