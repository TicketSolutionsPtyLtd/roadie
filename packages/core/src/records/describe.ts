import { formatValueInCurrency } from '../dataviz/format'
import type { ValueFormat } from '../dataviz/format'
import {
  describeDateRange,
  formatResolved,
  plainDateInstant
} from '../datetime/describe'
import { formatDateRange, formatDateTime } from '../datetime/format'
import { addDays, isPlainDate, plainDateOf } from '../datetime/plainDate'
import {
  type DateRangeValue,
  type PeriodRange,
  isAbsoluteRange,
  isPeriodRange,
  isRollingRange
} from '../datetime/ranges'
import { fieldIndex, momentOf, recordFieldOptions } from './fields'
import { recordOperatorSpec } from './operators'
import type {
  RecordField,
  RecordFilter,
  RecordFilterOperator,
  RecordQueryOptions
} from './types'

export type RecordFilterDescription = {
  /** The whole condition, as a chip reads: "Venue is Kazoo Hollow Room". */
  label: string
  /** The value part alone: "Kazoo Hollow Room", "more than 1,500". */
  value: string
  /** The dates a relative range stands for, so the absolute stays reachable. */
  detail?: string
}

export type DescribeRecordFilterOptions = RecordQueryOptions & {
  locale?: string
}

const operatorLabel = (operator: RecordFilterOperator) =>
  recordOperatorSpec(operator).label

// A location's place takes in the places inside it.
const PLACE_OPERATORS: Partial<Record<RecordFilterOperator, string>> = {
  is: 'is in',
  'is-not': 'is not in'
}

/**
 * An operator in words, for an editor's operator choice: "is more than". With
 * a location field, `is` and `is-not` read "is in" and "is not in".
 */
export function recordOperatorLabel(
  operator: RecordFilterOperator,
  field?: RecordField
): string {
  return (
    (field?.type === 'location' && PLACE_OPERATORS[operator]) ||
    operatorLabel(operator)
  )
}

const SHOWN_VALUES = 2

function list(
  labels: readonly string[],
  last: 'or' | 'and',
  shown = SHOWN_VALUES
): string {
  if (labels.length <= Math.min(shown, SHOWN_VALUES))
    return labels.join(` ${last} `)
  if (labels.length <= shown)
    return `${labels.slice(0, -1).join(', ')} ${last} ${labels.at(-1)}`
  const rest = labels.length - shown
  return `${labels.slice(0, shown).join(', ')} ${last} ${rest} more`
}

/** Each option's label, with its parents' before it: "Ochre Kite Weekender 2027 › Opening Night". */
export function recordOptionPaths(field: RecordField): Map<string, string> {
  const options = recordFieldOptions(field)
  const byValue = new Map(options.map((option) => [option.value, option]))
  return new Map(
    options.map((option) => {
      const path = [option.label]
      const seen = new Set([option.value])
      let parent = option.parent
      while (parent !== undefined && !seen.has(parent)) {
        seen.add(parent)
        const above = byValue.get(parent)
        if (!above) break
        path.unshift(above.label)
        parent = above.parent
      }
      return [option.value, path.join(' › ')]
    })
  )
}

/** Where a place is, from its kind and parent: "Suburb in Brisbane", "State". */
function placeDescription(
  field: RecordField,
  value: string
): string | undefined {
  const options = field.options ?? []
  const place = options.find((option) => option.value === value)
  const parent = options.find((option) => option.value === place?.parent)
  const kind = place?.kind
    ? place.kind.charAt(0).toUpperCase() + place.kind.slice(1)
    : undefined
  if (kind && parent) return `${kind} in ${parent.label}`
  return kind ?? (parent && `In ${parent.label}`)
}

function numberFormat(field: RecordField | undefined): ValueFormat {
  // A threshold reads in full: "$2,500", not "$2.5K".
  const format =
    field?.format ?? (field?.type === 'money' ? 'currency' : 'number')
  if (format === 'compactCurrency') return 'currency'
  if (format === 'compact') return 'number'
  return format
}

function number(value: number, field: RecordField | undefined): string {
  // A filter reads as a sentence, where a whole price has no cents.
  return formatValueInCurrency(value, numberFormat(field), field?.currency, {
    decimals: field?.decimals,
    trailingZeroDisplay: 'stripIfInteger'
  })
}

// Plain dates format in UTC, so today is read in the viewer's zone and
// carried over, or the year rule would compare against UTC's year.
function plainNow(options: DescribeRecordFilterOptions) {
  return plainDateInstant(plainDateOf(options.now, options.timeZone))
}

function date(
  value: string,
  options: DescribeRecordFilterOptions,
  dateStyle: 'long' | 'medium' = 'medium'
): string {
  const shared = {
    now: options.now,
    locale: options.locale,
    dateStyle,
    context: 'standalone'
  } as const
  if (isPlainDate(value))
    return (
      formatDateTime(plainDateInstant(value), {
        ...shared,
        now: plainNow(options),
        timeZone: 'UTC'
      }) ?? value
    )
  const instant = new Date(value)
  if (Number.isNaN(instant.getTime())) return value
  return (
    formatDateTime(instant, {
      ...shared,
      timeZone: options.timeZone,
      timeStyle: 'short'
    }) ?? value
  )
}

function dateRange(
  [start, end]: readonly [string, string],
  options: DescribeRecordFilterOptions
): string {
  const plain = isPlainDate(start) && isPlainDate(end)
  const from = plain ? plainDateInstant(start) : new Date(start)
  const to = plain ? plainDateInstant(end) : new Date(end)
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()))
    return `${start} to ${end}`
  return (
    formatDateRange(from, to, {
      now: plain ? plainNow(options) : options.now,
      locale: options.locale,
      dateStyle: 'medium',
      context: 'standalone',
      timeZone: plain ? 'UTC' : options.timeZone,
      ...(!plain && { timeStyle: 'short' })
    }) ?? `${start} to ${end}`
  )
}

// As a chip reads after "is": "Start date is in the next 7 days".
const NAMED_PHRASES: Record<string, string> = {
  past: 'in the past',
  ongoing: 'happening now'
}
const DAY_PHRASES: Record<number, string> = {
  [-1]: 'yesterday',
  0: 'today',
  1: 'tomorrow'
}
const OFFSET_PHRASES: Record<number, string> = {
  [-1]: 'last',
  0: 'this',
  1: 'next'
}

function periodPhrase({ period, offset, toDate, fiscal }: PeriodRange) {
  if (period === 'day') return DAY_PHRASES[offset] ?? null
  const word = OFFSET_PHRASES[offset]
  if (!word) return null
  const noun =
    fiscal && (period === 'quarter' || period === 'year')
      ? `financial ${period}`
      : period
  return `${word} ${noun}${toDate ? ' to date' : ''}`
}

/** A relative range as it reads after "is", or null when only dates will do. */
function rangePhrase(value: DateRangeValue): string | null {
  if (isAbsoluteRange(value)) return null
  if (isRollingRange(value)) {
    const { direction, amount, unit } = value
    const span = amount === 1 ? unit : `${amount} ${unit}s`
    return `in the ${direction === 'next' ? 'next' : 'last'} ${span}`
  }
  if (isPeriodRange(value)) return periodPhrase(value)
  return NAMED_PHRASES[value] ?? value.replace('-', ' ')
}

/**
 * Upcoming, past, and happening now as days, for a field with no clock of its
 * own to read them in. A plain date counts whole days; an event or access
 * moment compares the instant, so today counts only in part: a range until it
 * ends, and a single time until it passes.
 */
function openDays(
  value: DateRangeValue,
  field: RecordField,
  options: DescribeRecordFilterOptions
): string | null {
  const moment = momentOf(field)
  if (moment === 'timestamp') return null
  const today = plainDateOf(options.now, options.timeZone)
  const day = (date: string) =>
    formatResolved(
      { kind: 'dates', start: date, end: date },
      'UTC',
      options.locale
    )
  const plain = moment === 'date'
  switch (value) {
    case 'upcoming':
      if (plain) return `From ${day(today)}`
      return `From ${day(today)}, unless already ${field.end ? 'over' : 'started'}`
    case 'past':
      return plain
        ? `Until ${day(addDays(today, -1))}`
        : `Until ${day(today)}, if already started`
    case 'ongoing':
      return day(today)
    default:
      return null
  }
}

function describeDate(
  filter: RecordFilter,
  name: string,
  field: RecordField,
  options: DescribeRecordFilterOptions
): RecordFilterDescription | null {
  const dated = (phrase: string, value = phrase, detail?: string) => ({
    label: `${name} is ${phrase}`,
    value,
    ...(detail && detail !== value && { detail })
  })
  const on = (value: string) => {
    const day = date(value, options, 'long')
    return dated(`on ${day}`, day)
  }
  switch (filter.operator) {
    case 'on':
      return on(filter.value)
    case 'before':
    case 'after': {
      const day = date(filter.value, options)
      return dated(
        `${filter.operator} ${day}`,
        `${filter.operator === 'before' ? 'Before' : 'After'} ${day}`
      )
    }
    case 'between': {
      const [start, end] = filter.value
      if (typeof start !== 'string' || typeof end !== 'string') return null
      return start === end ? on(start) : dated(dateRange([start, end], options))
    }
    case 'within': {
      try {
        const { label, detail } = describeDateRange(filter.value, options)
        return dated(
          rangePhrase(filter.value) ?? label,
          label,
          openDays(filter.value, field, options) ?? detail
        )
      } catch {
        return dated(JSON.stringify(filter.value))
      }
    }
    default:
      return null
  }
}

/**
 * A filter in words, as its chip reads: the field's label, the operator and
 * the value, with option labels, numbers in the field's format and dates in
 * the house formats. A relative date range keeps its dates in `detail`.
 * A field these fields don't have is named by its key.
 */
export function describeRecordFilter(
  filter: RecordFilter,
  fields: readonly RecordField[],
  options: DescribeRecordFilterOptions
): RecordFilterDescription {
  const field = fieldIndex(fields).get(filter.field)
  const name = field?.label ?? filter.field
  if (field?.type === 'date') {
    const described = describeDate(filter, name, field, options)
    if (described) return described
  }
  const phrase = (operator: string, value: string) => ({
    label: `${name} ${operator} ${value}`,
    value
  })
  switch (filter.operator) {
    case 'is':
    case 'is-not':
    case 'has-all': {
      const place = field?.type === 'location'
      // A place reads alone, as its parent is in its description.
      const paths = !field
        ? new Map<string, string>()
        : place
          ? new Map(recordFieldOptions(field).map((o) => [o.value, o.label]))
          : recordOptionPaths(field)
      const labels = filter.values.map((value) => paths.get(value) ?? value)
      const last = filter.operator === 'has-all' ? 'and' : 'or'
      const described = phrase(
        filter.operator === 'has-all'
          ? 'has'
          : recordOperatorLabel(filter.operator, field),
        list(labels, last)
      )
      const where =
        place && filter.values.length === 1
          ? placeDescription(field, filter.values[0]!)
          : undefined
      if (labels.length > SHOWN_VALUES)
        return { ...described, detail: list(labels, last, Infinity) }
      return where ? { ...described, detail: where } : described
    }
    case 'contains':
    case 'not-contains':
      return phrase(operatorLabel(filter.operator), `“${filter.value}”`)
    case 'eq':
      return phrase('is', number(filter.value, field))
    case 'neq':
    case 'lt':
    case 'gt': {
      const words = operatorLabel(filter.operator).replace(/^is /, '')
      return phrase('is', `${words} ${number(filter.value, field)}`)
    }
    case 'between': {
      const [low, high] = filter.value
      return phrase(
        'is',
        typeof low === 'number' && typeof high === 'number'
          ? `${number(low, field)} to ${number(high, field)}`
          : `${low} to ${high}`
      )
    }
    case 'on':
    case 'before':
    case 'after':
      return phrase(operatorLabel(filter.operator), filter.value)
    case 'within':
      return phrase('is within', JSON.stringify(filter.value))
    case 'is-true':
      return phrase('is', 'Yes')
    case 'is-false':
      return phrase('is', 'No')
    case 'is-set':
      return phrase('is', 'not empty')
    case 'is-not-set':
      return phrase('is', 'empty')
  }
}
