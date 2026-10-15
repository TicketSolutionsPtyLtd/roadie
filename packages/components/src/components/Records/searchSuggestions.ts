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
  | EmptinessOperator

type EmptinessOperator = 'is-not-set' | 'is-set'

const EMPTINESS: readonly EmptinessOperator[] = ['is-not-set', 'is-set']

export const isEmptiness = (operator: string): operator is EmptinessOperator =>
  EMPTINESS.some((each) => each === operator)

type OptionOperator = Extract<ValueOperator, 'is' | 'is-not' | 'has-all'>

/** An option filter's operator: the step's, which for an option field is one. */
export const optionOperator = (operator: ValueOperator): OptionOperator =>
  operator === 'is-not' || operator === 'has-all' ? operator : 'is'

const isNumeric = (field: RecordField) =>
  field.type === 'number' || field.type === 'money'

/** Text and numbers are typed, and their one row reads as the chip will. */
/** Text or a number, typed as the one value its filter holds. */
export const isTyped = (field: RecordField) =>
  field.type === 'text' || isNumeric(field)

const SYMBOLS: Partial<Record<ValueOperator, string>> = {
  eq: '=',
  neq: '≠',
  lt: '<',
  gt: '>',
  between: 'between'
}

/** Booleans and dates list their values under a single is. Emptiness comes last. */
function stepOperators(field: RecordField): ValueOperator[] {
  const allowed = recordFilterOperators(field)
  const compared: ValueOperator[] =
    field.type === 'date' || field.type === 'boolean'
      ? ['is']
      : allowed.filter(
          (operator): operator is ValueOperator => !isEmptiness(operator)
        )
  return [
    ...compared,
    ...EMPTINESS.filter((operator) => allowed.includes(operator))
  ]
}

/** The operators a value step toggles between: a number's as symbols, and emptiness in words. */
export function valueOperators(
  field: RecordField
): (QueryFieldOperator & { value: ValueOperator })[] {
  return stepOperators(field).map((value) =>
    isNumeric(field) && !isEmptiness(value)
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
  if (field.type === 'date' && !isEmptiness(operator)) return field.label
  return `${field.label} ${recordOperatorLabel(operator)}`
}

/** A text or number filter's value as typed, to edit it in the field: "20 and 50" for a range. */
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
      return [...filter.value]
        .sort((a, b) => Number(a) - Number(b))
        .join(' and ')
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
    value: { type: 'edit', field: field.key },
    opensEditor: true
  }
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

// parseQuery reads a lone number as `eq`, with any `$` and commas.
function numberReader(field: RecordField, context: SearchContext) {
  return (text: string) => {
    const [reading] = parseQuery(`${field.key}:${text}`, {
      ...context,
      fields: [field]
    })
    return reading?.kind === 'filter' ? reading.value : null
  }
}

const RANGE_SEPARATOR = /-|\.\.|to|and/gi

/** A range typed either way round, such as "50-20" or "20 and 50", low to high. */
function typedRange(
  typed: string,
  readNumber: (text: string) => RecordFilter | null
): [number, number] | null {
  for (const { 0: separator, index } of typed.matchAll(RANGE_SEPARATOR)) {
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
  const readNumber = numberReader(field, context)
  if (operator === 'between') {
    const range = typedRange(typed, readNumber)
    return range ? [{ field: key, operator, value: range }] : []
  }
  const read = readNumber(typed)
  return read?.operator === 'eq' &&
    (operator === 'eq' ||
      operator === 'neq' ||
      operator === 'lt' ||
      operator === 'gt')
    ? [{ ...read, operator }]
    : []
}

const isOneNumber = (
  field: RecordField,
  text: string,
  context: SearchContext
) => numberReader(field, context)(text)?.operator === 'eq'

/**
 * What a text or number step asks for while nothing typed reads under its
 * operator, such as "Between 20 and what? Type the second number." after "20 and".
 */
export function valueHint(
  field: RecordField,
  text: string,
  operator: ValueOperator,
  context: SearchContext
): string | undefined {
  const typed = text.trim()
  if (isEmptiness(operator)) return undefined
  if (field.type === 'text')
    return typed ? undefined : 'Type the text to match.'
  if (!isNumeric(field) || typedFilters(field, typed, operator, context).length)
    return undefined
  const money = field.type === 'money'
  const one = money ? 'an amount' : 'a number'
  if (operator !== 'between') {
    if (!typed) return `Type ${one}.`
    return `Type ${one} like ${money ? '$50' : '50'}.`
  }
  const first = numberReader(
    field,
    context
  )(typed.replace(/\s*(?:-|\.\.|to|and)$/i, ''))
  if (first?.operator === 'eq') {
    const { value } = describeRecordFilter(first, context.fields, context)
    const second = money ? 'amount' : 'number'
    return `Between ${value} and what? Type the second ${second}.`
  }
  return money
    ? 'Type two amounts like $20 and $50.'
    : 'Type two numbers like 20 and 50.'
}

/** Labels as a list, with an Oxford comma: "Perth, Hobart, and Sydney". */
function listOf(labels: readonly string[]): string {
  if (labels.length < 3) return labels.join(' and ')
  return `${labels.slice(0, -1).join(', ')}, and ${labels.at(-1)}`
}

/**
 * While a chip is edited, what to say when every value the typed text
 * matches is one the chip already holds, so Enter has nothing to add.
 */
export function heldHint(
  field: RecordField,
  text: string,
  groups: readonly SearchGroup[]
): string | undefined {
  if (isTyped(field) || !text.trim()) return undefined
  const values = groups
    .flatMap((group) => group.items)
    .filter((item) => item.value.type === 'filter')
  if (values.length === 0 || values.some((item) => !item.selected))
    return undefined
  const verb = values.length === 1 ? 'is' : 'are'
  return `${listOf(values.map((item) => item.label))} ${verb} already in this filter.`
}

/**
 * A space typed after a range's first number, such as "20 ", adds "and " for
 * the second. A word typed in its place, such as "to", replaces it, so typing
 * "and" yourself doesn't double it, and Backspace takes it away whole.
 */
export function withAnd(
  field: RecordField,
  previous: string,
  next: string,
  operator: ValueOperator,
  context: SearchContext
): string {
  if (operator !== 'between') return next
  const added = /^(.*\S) and $/.exec(previous)?.[1]
  if (
    added &&
    next === previous.slice(0, -1) &&
    isOneNumber(field, added, context)
  )
    return added
  if (!next.startsWith(previous)) return next
  const typed = next.slice(previous.length)
  if (
    typed === ' ' &&
    previous === previous.trimEnd() &&
    isOneNumber(field, previous, context)
  )
    return `${next}and `
  return added && /^[a-z]$/i.test(typed) && isOneNumber(field, added, context)
    ? `${added} ${typed}`
    : next
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

/** A date field's presets whose label has a word starting with each typed word, so "next" lists Next 7 days. */
function typedPresets(
  field: RecordField,
  typed: string,
  context: SearchContext
): SearchSuggestion[] {
  if (field.type !== 'date') return []
  const words = typed.toLowerCase().split(/\s+/)
  return presetItems(field, 'is').filter((item) => {
    if (item.value.type !== 'filter') return false
    const { value } = describeRecordFilter(
      item.value.filter,
      context.fields,
      context
    )
    const labelWords = value.toLowerCase().split(/\s+/)
    return words.every((word) =>
      labelWords.some((labelWord) => labelWord.startsWith(word))
    )
  })
}

function parsedValues(
  field: RecordField,
  typed: string,
  option: OptionOperator,
  context: SearchContext
): SearchSuggestion[] {
  const presets = typedPresets(field, typed, context)
  const parsed = parseQuery(`${field.key}:${typed}`, {
    ...context,
    fields: [field]
  })
    .filter((suggestion) => suggestion.kind === 'filter')
    .map((suggestion) => fromParsed(suggestion))
    .map((item) =>
      field.type === 'option' ? withOperator(item, option) : item
    )
  const isPreset = (item: SearchSuggestion) =>
    item.value.type === 'filter' &&
    presets.some(
      (preset) =>
        preset.value.type === 'filter' &&
        item.value.type === 'filter' &&
        sameFilter(preset.value.filter, item.value.filter)
    )
  return [...presets, ...parsed.filter((item) => !isPreset(item))]
}

/** The values a field offers, or reads from typed text, compared by the step's operator. */
function readValues(
  field: RecordField,
  typed: string,
  operator: ValueOperator,
  context: SearchContext
): SearchSuggestion[] {
  const unlisted =
    field.type === 'option' && recordFieldOptions(field).length === 0
  const option = optionOperator(operator)
  return !typed
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
        : parsedValues(field, typed, option, context)
}

/** The values read, then those the edited filter holds that aren't among them. */
function valueItems(
  field: RecordField,
  typed: string,
  operator: ValueOperator,
  context: SearchContext,
  edited: RecordFilter | undefined
): SearchSuggestion[] {
  const items = readValues(field, typed, operator, context)
  const listed = new Set(items.map(({ id }) => id))
  const held = heldOnly(field, typed, edited).filter(
    ({ id }) => !listed.has(id)
  )
  return [...items, ...held]
}

/**
 * Under is empty or is not empty, the one row, which Enter takes. A chip
 * already holding it ticks it, so the step still answers.
 */
function emptinessRow(
  field: RecordField,
  operator: EmptinessOperator,
  context: SearchContext
): SearchSuggestion {
  const row = filterSuggestion({ field: field.key, operator })
  const applied = unused([row], context).length === 0
  return { ...row, exact: true, ...(applied && { selected: true }) }
}

/**
 * Suggestions for one field's value, after it was picked, compared by
 * `operator`: an option's values, the one row text or a number typed reads,
 * or under emptiness the chip's own row. Editing a filter, those it holds are
 * ticked; leave it out of `context.filters`, so they still show.
 */
export function valueSuggestions(
  field: RecordField,
  text: string,
  context: SearchContext,
  operator: ValueOperator = stepOperator(field, ''),
  edited?: RecordFilter
): SearchGroup[] {
  const typed = text.trim()
  const items = isEmptiness(operator)
    ? [emptinessRow(field, operator, context)]
    : unused(valueItems(field, typed, operator, context, edited), context)
  // Typed text is the whole value, so only the filter itself is held.
  const isHeld = isTyped(field) ? sameFilter : holds
  const tick = (item: SearchSuggestion): SearchSuggestion =>
    edited && item.value.type === 'filter' && isHeld(edited, item.value.filter)
      ? { ...item, selected: true }
      : item
  const values = items.map((item) => {
    if (item.value.type !== 'filter') return item
    const { label, value, detail } = describeRecordFilter(
      item.value.filter,
      context.fields,
      context
    )
    return tick({
      ...item,
      label: isTyped(field) || isEmptiness(operator) ? label : value,
      ...(detail && { description: detail })
    })
  })
  const editable =
    field.type === 'date' &&
    !isEmptiness(operator) &&
    recordFilterOperators(field).some((operator) => operator === 'between')
  return [
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

/**
 * Whether a filter rules the other out: is empty on a field rules out
 * anything else on it, so it never stands beside a value that matches nothing.
 */
export function rulesOut(filter: RecordFilter, other: RecordFilter): boolean {
  if (filter.field !== other.field || sameFilter(filter, other)) return false
  return filter.operator === 'is-not-set' || other.operator === 'is-not-set'
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
