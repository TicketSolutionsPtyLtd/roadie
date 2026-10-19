import { type DateRangeValue, plainDateOf } from '@oztix/roadie-core/datetime'
import {
  type RecordField,
  type RecordFilter,
  type RecordQueryOptions,
  type RecordSuggestion,
  describeRecordFilter,
  isRecordOptionField,
  parseQuery,
  recordFieldOptions,
  recordFilterOperators,
  recordOperatorLabel
} from '@oztix/roadie-core/records'

import { readDays } from '../../pickers/readDate'
import { suggestDates } from '../../pickers/suggestDates'
import type {
  QueryFieldChip,
  QueryFieldOperator,
  QueryFieldSuggestion,
  QueryFieldSuggestionGroup
} from '../QueryField'
import { describeFilter } from './clock'

/** What a search suggestion does once taken. */
export type SearchValue =
  { type: 'filter'; filter: RecordFilter } | { type: 'field'; field: string }

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
  | DateOperator
  | EmptinessOperator

type DateOperator = 'within' | 'on' | 'before' | 'after'

/** A date step's conditions: quick dates under is relative, then the calendar's. */
const DATE_STEP: readonly ValueOperator[] = [
  'within',
  'on',
  'before',
  'after',
  'between'
]

// The toggle's words where they differ from the chip's: a date picked under
// is reads "is on" once it's a chip.
const DATE_LABELS: Partial<Record<ValueOperator, string>> = {
  within: 'is relative',
  on: 'is'
}

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
const isTyped = (field: RecordField) =>
  field.type === 'text' || isNumeric(field)

const SYMBOLS: Partial<Record<ValueOperator, string>> = {
  eq: '=',
  neq: '≠',
  lt: '<',
  gt: '>',
  between: 'between'
}

/** Booleans list their values under a single is, and dates under their own conditions. Emptiness comes last. */
function stepOperators(field: RecordField): ValueOperator[] {
  const allowed: readonly string[] = recordFilterOperators(field)
  const compared: ValueOperator[] =
    field.type === 'boolean'
      ? ['is']
      : field.type === 'date'
        ? DATE_STEP.filter((operator) => allowed.includes(operator))
        : allowed.filter(
            (operator): operator is ValueOperator => !isEmptiness(operator)
          )
  return [
    ...compared,
    ...EMPTINESS.filter((operator) => allowed.includes(operator))
  ]
}

const operatorLabel = (field: RecordField, operator: ValueOperator) =>
  (field.type === 'date' && DATE_LABELS[operator]) ||
  recordOperatorLabel(operator, field)

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
      : { value, label: operatorLabel(field, value) }
  )
}

/** The operator a step on the field compares by: the one given if it offers it, or its first. */
export function stepOperator(
  field: RecordField,
  operator: string
): ValueOperator {
  const offered = stepOperators(field)
  return (
    offered.find((each) => each === operator) ??
    offered[0] ??
    (field.type === 'date' ? 'within' : 'is')
  )
}

/** A date step's conditions that pick from a calendar: one day, or a range under is between. */
export type CalendarOperator = Extract<
  ValueOperator,
  'on' | 'before' | 'after' | 'between'
>

/** The step's operator when it picks from a calendar, or null. */
export function calendarOperator(
  field: RecordField,
  operator: ValueOperator
): CalendarOperator | null {
  if (field.type !== 'date') return null
  return operator === 'on' ||
    operator === 'before' ||
    operator === 'after' ||
    operator === 'between'
    ? operator
    : null
}

/** What the value step's pending chip reads, such as "Venue is not". */
export function pendingLabel(
  field: RecordField,
  operator: ValueOperator
): string {
  return `${field.label} ${operatorLabel(field, operator)}`
}

const OFFSET = /(?:Z|[+-]\d{2}:\d{2})$/

/** The day a date or date-time falls on, where the records are. */
export const dayOf = (value: string, timeZone: string) =>
  OFFSET.test(value)
    ? plainDateOf(new Date(value), timeZone)
    : value.slice(0, 10)

const MONTH_WORDS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec'
]

function dayWords(day: string, withYear: boolean): string {
  const [year, month, date] = day.split('-').map(Number) as [
    number,
    number,
    number
  ]
  const words = `${date} ${MONTH_WORDS[month - 1]}`
  return withYear ? `${words} ${year}` : words
}

/** Days as typed, such as "12 Nov to 15 Dec", with years only where they're needed to read back. */
function daysText(start: string, end: string, context: SearchContext): string {
  const write = (withYear: boolean) =>
    start === end
      ? dayWords(start, withYear)
      : `${dayWords(start, withYear)} to ${dayWords(end, withYear)}`
  const short = write(false)
  return readDays(short, readOptions(context)).some(
    (reading) => reading.start === start && reading.end === end
  )
    ? short
    : write(true)
}

function dateText(
  field: RecordField,
  filter: RecordFilter,
  context: SearchContext
): string {
  const day = (value: string) => dayOf(value, context.timeZone)
  switch (filter.operator) {
    case 'on':
    case 'before':
    case 'after':
      return daysText(day(filter.value), day(filter.value), context)
    case 'between': {
      const [start, end] = filter.value
      return typeof start === 'string' && typeof end === 'string'
        ? daysText(day(start), day(end), context)
        : ''
    }
    case 'within':
      return describeRecordFilter(filter, [field], context).value
    default:
      return ''
  }
}

/**
 * A filter's value as typed, to edit it in the field: "20 and 50" for a
 * number range, "12 Nov to 15 Dec" for dates, or a quick date's name. Each
 * reads back as the filter under its operator. Options and booleans have none.
 */
export function valueText(
  field: RecordField,
  filter: RecordFilter,
  context: SearchContext
): string {
  if (field.type === 'date') return dateText(field, filter, context)
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

type ListFilter = Extract<RecordFilter, { values: string[] }>

const isList = (filter: RecordFilter): filter is ListFilter =>
  'values' in filter

/** Values for one field under one operator, as one chip holds them. */
const sameCondition = (a: ListFilter, b: RecordFilter): b is ListFilter =>
  isList(b) && a.field === b.field && a.operator === b.operator

/** Whether the filters apply this one already, alone or among a chip's values. */
export function isApplied(
  filter: RecordFilter,
  filters: readonly RecordFilter[]
): boolean {
  return filters.some(
    (other) =>
      sameFilter(other, filter) ||
      (isList(filter) &&
        sameCondition(filter, other) &&
        filter.values.every((item) => other.values.includes(item)))
  )
}

function unused(
  items: readonly SearchSuggestion[],
  context: SearchContext
): SearchSuggestion[] {
  return items.filter(
    ({ value }) =>
      value.type !== 'filter' || !isApplied(value.filter, context.filters)
  )
}

/** Typed text that names an applied filter still offers it, to take its words. */
function markApplied(
  items: readonly SearchSuggestion[],
  context: SearchContext
): SearchSuggestion[] {
  return items.map((item) =>
    item.value.type === 'filter' &&
    isApplied(item.value.filter, context.filters)
      ? {
          ...item,
          description: item.description
            ? `${item.description}, already applied`
            : 'Already applied'
        }
      : item
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
  const groups = [
    {
      id: 'filters',
      label: 'Filters',
      items: markApplied(
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
  // "sold" names the Sold field before it starts "Sold out", but "sold melb"
  // lists City is Melbourne first, as it reads the rest.
  const [top] = parsed
  const named =
    top?.kind === 'field' &&
    groups[0]!.items.every((item) => item.remainder === top.remainder)
  return named ? groups.reverse() : groups
}

/** What a field offers before anything is typed. Labels come later. */
function presetItems(
  field: RecordField,
  operator: OptionOperator
): SearchSuggestion[] {
  switch (field.type) {
    case 'option':
    case 'location':
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
  if (calendarOperator(field, operator)) {
    const range = operator === 'between'
    if (!typed)
      return range
        ? 'Pick two days, or type them like 22 Oct to 30 Oct.'
        : 'Pick a day, or type one like 22 Oct.'
    return typedDates(field, typed, operator, context).length
      ? undefined
      : range
        ? 'Type two dates like 22 Oct to 30 Oct.'
        : 'Type a date like 22 Oct or next Fri.'
  }
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
  if (operator !== 'between' || !isNumeric(field)) return next
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
  if (!edited || !('values' in edited) || !isRecordOptionField(field)) return []
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
 * A date field's presets whose label has a word starting with each typed
 * word, so "next" lists Next 7 days. Those holding more typed words whole come
 * first, so "week" lists This week before This weekend.
 */
function typedPresets(
  field: RecordField,
  typed: string,
  context: SearchContext
): SearchSuggestion[] {
  if (field.type !== 'date') return []
  const words = typed.toLowerCase().split(/\s+/)
  return presetItems(field, 'is')
    .flatMap((item) => {
      if (item.value.type !== 'filter') return []
      const { value } = describeRecordFilter(
        item.value.filter,
        context.fields,
        context
      )
      const labelWords = value.toLowerCase().split(/\s+/)
      const matches = words.every((word) =>
        labelWords.some((labelWord) => labelWord.startsWith(word))
      )
      const whole = words.filter((word) => labelWords.includes(word)).length
      return matches ? [{ item, whole }] : []
    })
    .sort((a, b) => b.whole - a.whole)
    .map(({ item }) => item)
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
      isRecordOptionField(field) ? withOperator(item, option) : item
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

const readOptions = ({ now, timeZone }: SearchContext) => ({
  today: plainDateOf(now ?? new Date(), timeZone),
  timeZone
})

/**
 * Dates typed under a calendar's condition: under is between, the ranges the
 * text reads, such as "22 oct to 30 oct"; otherwise the days it suggests, as a
 * date picker does, each named as typed with its date to go by.
 */
function typedDates(
  field: RecordField,
  typed: string,
  operator: ValueOperator,
  context: SearchContext
): SearchSuggestion[] {
  const picking = calendarOperator(field, operator)
  if (!typed || !picking) return []
  const key = field.key
  if (picking === 'between')
    return readDays(typed, readOptions(context))
      .filter((reading) => !reading.relative && reading.start !== reading.end)
      .map(({ start, end }) =>
        filterSuggestion({ field: key, operator: picking, value: [start, end] })
      )
  return suggestDates(typed, readOptions(context)).map(
    ({ start, label, description }) => ({
      ...filterSuggestion({ field: key, operator: picking, value: start }),
      label,
      ...(description && { description })
    })
  )
}

/** The values a field offers, or reads from typed text, compared by the step's operator. */
function readValues(
  field: RecordField,
  typed: string,
  operator: ValueOperator,
  context: SearchContext
): SearchSuggestion[] {
  if (calendarOperator(field, operator))
    return typedDates(field, typed, operator, context)
  const unlisted =
    isRecordOptionField(field) && recordFieldOptions(field).length === 0
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
  // A typed day keeps the words it was suggested by, as a date picker's do.
  const suggestedDays =
    calendarOperator(field, operator) && operator !== 'between'
  const values = items.map((item) => {
    if (item.value.type !== 'filter' || suggestedDays) return tick(item)
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
  return [{ id: 'values', label: field.label, items: values }]
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

const isDateFilter = (filter: RecordFilter) =>
  filter.operator === 'between'
    ? typeof filter.value[0] === 'string'
    : ['on', 'before', 'after', 'within'].includes(filter.operator)

/**
 * Whether a filter rules the other out: is empty on a field rules out
 * anything else on it, so it never stands beside a value that matches nothing,
 * and a date rules out the field's other date, as two rarely overlap.
 */
export function rulesOut(filter: RecordFilter, other: RecordFilter): boolean {
  if (filter.field !== other.field || sameFilter(filter, other)) return false
  return (
    filter.operator === 'is-not-set' ||
    other.operator === 'is-not-set' ||
    (isDateFilter(filter) && isDateFilter(other))
  )
}

/** Option filters on one field with the same operator merge into one chip. */
export function mergeFilter(
  filters: readonly RecordFilter[],
  filter: RecordFilter,
  fields: readonly RecordField[]
): { index: number; filter: RecordFilter } | null {
  const field = fields.find(({ key }) => key === filter.field)
  if (!isList(filter) || !field || !isRecordOptionField(field)) return null
  const at = filters.findIndex((other) => sameCondition(filter, other))
  const existing = filters[at]
  if (!existing || !isList(existing)) return null
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
