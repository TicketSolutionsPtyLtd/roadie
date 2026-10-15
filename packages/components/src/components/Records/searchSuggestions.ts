import type { DateRangeValue } from '@oztix/roadie-core/datetime'
import {
  type RecordField,
  type RecordFilter,
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

/** How a value step compares, chosen before its value. */
export type ValueOperator =
  | 'is'
  | 'is-not'
  | 'has-all'
  | 'contains'
  | 'not-contains'
  | 'eq'
  | 'neq'
  | 'lt'
  | 'gt'
  | 'between'

type OptionOperator = Extract<ValueOperator, 'is' | 'is-not' | 'has-all'>

/** An option filter's operator: the step's, which for an option field is one. */
export const optionOperator = (operator: ValueOperator): OptionOperator =>
  operator === 'is-not' || operator === 'has-all' ? operator : 'is'

const isNumeric = (field: RecordField) =>
  field.type === 'number' || field.type === 'money'

/** Text and numbers are typed, and their one row reads as the chip will. */
const isTyped = (field: RecordField) =>
  field.type === 'text' || isNumeric(field)

const SYMBOLS: Partial<Record<ValueOperator, string>> = {
  eq: '=',
  neq: '≠',
  lt: '<',
  gt: '>',
  between: 'between'
}

function stepOperators(field: RecordField): ValueOperator[] {
  if (field.type === 'date' || field.type === 'boolean') return []
  return recordFilterOperators(field).filter(
    (operator): operator is ValueOperator =>
      operator !== 'is-set' && operator !== 'is-not-set'
  )
}

/** The operators a value step toggles between, or none for booleans and dates. */
export function valueOperators(
  field: RecordField
): (QueryFieldOperator & { value: ValueOperator })[] {
  return stepOperators(field).map((value) =>
    isNumeric(field)
      ? {
          value,
          label: SYMBOLS[value] ?? value,
          'aria-label': recordOperatorLabel(value)
        }
      : { value, label: recordOperatorLabel(value) }
  )
}

/** The operator a step on the field compares by: the one given if it offers it, or its first. */
export function stepOperator(
  field: RecordField,
  operator: string
): ValueOperator {
  const offered = stepOperators(field)
  return offered.find((each) => each === operator) ?? offered[0] ?? 'is'
}

/** What the value step's pending chip reads, such as "Venue is not". */
export function pendingLabel(
  field: RecordField,
  operator: ValueOperator
): string {
  if (field.type === 'date') return field.label
  return `${field.label} ${recordOperatorLabel(operator)}`
}

/** A text or number filter's value as typed, to edit it in the field: "20-50" for a range. */
export function valueText(field: RecordField, filter: RecordFilter): string {
  if (!isTyped(field)) return ''
  switch (filter.operator) {
    case 'contains':
    case 'not-contains':
      return filter.value
    case 'is':
    case 'is-not':
      return filter.values[0] ?? ''
    case 'eq':
    case 'neq':
    case 'lt':
    case 'gt':
      return String(filter.value)
    case 'between':
      return [...filter.value].sort((a, b) => Number(a) - Number(b)).join('-')
    default:
      return ''
  }
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
  operator: OptionOperator
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
  operator: OptionOperator
): SearchSuggestion {
  const { value } = item
  if (value.type !== 'filter' || value.filter.operator !== 'is') return item
  const filter = { ...value.filter, operator }
  return { ...item, ...filterSuggestion(filter), label: item.label }
}

/** A range typed high to low, such as "50-20", as low to high. */
function reversedRange(
  typed: string,
  readNumber: (text: string) => RecordFilter | null
): [number, number] | null {
  for (const { 0: separator, index } of typed.matchAll(/-|\.\.|to/g)) {
    const low = readNumber(typed.slice(0, index))
    const high = readNumber(typed.slice(index + separator.length))
    if (low?.operator === 'eq' && high?.operator === 'eq')
      return [Math.min(low.value, high.value), Math.max(low.value, high.value)]
  }
  return null
}

/** Typed text, or a number or range, compared by the step's operator: none for what it can't read. */
function typedFilters(
  field: RecordField,
  typed: string,
  operator: ValueOperator,
  context: SearchContext
): RecordFilter[] {
  const key = field.key
  if (field.type === 'text') {
    if (operator === 'contains' || operator === 'not-contains')
      return [{ field: key, operator, value: typed }]
    return operator === 'is' || operator === 'is-not'
      ? [{ field: key, operator, values: [typed] }]
      : []
  }
  // parseQuery reads a lone number as `eq` and a range as `between`.
  const readNumber = (text: string) => {
    const [reading] = parseQuery(`${key}:${text}`, {
      ...context,
      fields: [field]
    })
    return reading?.kind === 'filter' ? reading.value : null
  }
  const read = readNumber(typed)
  if (operator === 'between') {
    if (read?.operator === 'between') return [read]
    const reversed = reversedRange(typed, readNumber)
    return reversed ? [{ field: key, operator, value: reversed }] : []
  }
  return read?.operator === 'eq' &&
    (operator === 'eq' ||
      operator === 'neq' ||
      operator === 'lt' ||
      operator === 'gt')
    ? [{ ...read, operator }]
    : []
}

/** Whether the edited filter holds what a suggestion would add. */
function holds(edited: RecordFilter, filter: RecordFilter): boolean {
  if (
    'values' in edited &&
    'values' in filter &&
    edited.field === filter.field &&
    edited.operator === filter.operator
  )
    return filter.values.every((value) => edited.values.includes(value))
  return sameFilter(edited, filter)
}

/** Values the edited filter holds that the field doesn't offer, so they can be unticked. */
function heldOnly(
  field: RecordField,
  typed: string,
  edited: RecordFilter | undefined
): SearchSuggestion[] {
  if (!edited || !('values' in edited) || field.type !== 'option') return []
  const offered = new Set(recordFieldOptions(field).map(({ value }) => value))
  return edited.values
    .filter(
      (value) =>
        !offered.has(value) && value.toLowerCase().includes(typed.toLowerCase())
    )
    .map((value) =>
      filterSuggestion({
        field: field.key,
        operator: edited.operator,
        values: [value]
      })
    )
}

/**
 * Suggestions for one field's value, after it was picked: Empty and Not empty
 * first, where the field allows them, then its values, compared by
 * `operator`: an option's, or the one text or number typed. Editing a
 * filter, those it holds are ticked; leave it out of `context.filters`, so
 * they still show.
 */
export function valueSuggestions(
  field: RecordField,
  text: string,
  context: SearchContext,
  operator: ValueOperator = stepOperator(field, ''),
  edited?: RecordFilter
): SearchGroup[] {
  const typed = text.trim()
  const unlisted =
    field.type === 'option' && recordFieldOptions(field).length === 0
  const option = optionOperator(operator)
  const items = !typed
    ? presetItems(field, option)
    : isTyped(field)
      ? typedFilters(field, typed, operator, context).map(filterSuggestion)
      : unlisted
        ? [
            filterSuggestion({
              field: field.key,
              operator: option,
              values: [typed]
            })
          ]
        : parseQuery(`${field.key}:${typed}`, { ...context, fields: [field] })
            .filter((suggestion) => suggestion.kind === 'filter')
            .map((suggestion) => fromParsed(suggestion))
            .map((item) =>
              field.type === 'option' ? withOperator(item, option) : item
            )
  const listed = new Set(items.map(({ id }) => id))
  const held = heldOnly(field, typed, edited).filter(
    ({ id }) => !listed.has(id)
  )
  // Typed text is the whole value, so only the filter itself is held.
  const isHeld = isTyped(field) ? sameFilter : holds
  const tick = (item: SearchSuggestion): SearchSuggestion =>
    edited && item.value.type === 'filter' && isHeld(edited, item.value.filter)
      ? { ...item, selected: true }
      : item
  const values = unused([...items, ...held], context).map((item) => {
    if (item.value.type !== 'filter') return item
    const { label, value, detail } = describeRecordFilter(
      item.value.filter,
      context.fields,
      context
    )
    return tick({
      ...item,
      label: isTyped(field) ? label : value,
      // Editing, the text stays to be changed again, and its row ticked.
      remainder: isTyped(field) && edited ? text : undefined,
      ...(detail && { description: detail })
    })
  })
  // Enter skips the edited chip's own row, so it mustn't fall to Not empty.
  const unchanged = values.some((item) => item.selected)
  const emptiness =
    isTyped(field) && unchanged
      ? []
      : unused(emptinessItems(field, typed), context).map(tick)
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

/**
 * The edited filter once a value is taken: a value it compares the same way
 * goes in or out, and anything else replaces it. Null once no value is left.
 */
export function toggleValue(
  edited: RecordFilter,
  taken: RecordFilter
): RecordFilter | null {
  if (
    !('values' in edited) ||
    !('values' in taken) ||
    edited.field !== taken.field ||
    edited.operator !== taken.operator
  )
    return taken
  const values = holds(edited, taken)
    ? edited.values.filter((value) => !taken.values.includes(value))
    : [...new Set([...edited.values, ...taken.values])]
  return values.length > 0 ? { ...edited, values } : null
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
