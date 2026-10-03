import { formatValue } from '../dataviz/format'
import type { ValueFormat } from '../dataviz/format'
import { describeDateRange, plainDateInstant } from '../datetime/describe'
import { formatDateRange, formatDateTime } from '../datetime/format'
import { isPlainDate, plainDateOf } from '../datetime/plainDate'
import { fieldIndex, recordFieldOptions } from './fields'
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

const OPERATORS: Record<RecordFilterOperator, string> = {
  is: 'is',
  'is-not': 'is not',
  'has-all': 'has all of',
  contains: 'contains',
  'not-contains': 'doesn’t contain',
  eq: 'is',
  neq: 'is not',
  lt: 'is less than',
  gt: 'is more than',
  between: 'is between',
  on: 'is on',
  before: 'is before',
  after: 'is after',
  within: 'is within',
  'is-true': 'is Yes',
  'is-false': 'is No',
  'is-set': 'is not empty',
  'is-not-set': 'is empty'
}

/** An operator in words, for an editor's operator choice: "is more than". */
export function recordOperatorLabel(operator: RecordFilterOperator): string {
  return OPERATORS[operator]
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

function numberFormat(field: RecordField | undefined): ValueFormat {
  // A threshold reads in full: "$2,500", not "$2.5K".
  const format =
    field?.format ?? (field?.type === 'money' ? 'currency' : 'number')
  if (format === 'compactCurrency') return 'currency'
  if (format === 'compact') return 'number'
  return format
}

function number(value: number, field: RecordField | undefined): string {
  return formatValue(value, numberFormat(field))
}

// Plain dates format in UTC, so today is read in the viewer's zone and
// carried over, or the year rule would compare against UTC's year.
function plainNow(options: DescribeRecordFilterOptions) {
  return plainDateInstant(plainDateOf(options.now, options.timeZone))
}

function date(value: string, options: DescribeRecordFilterOptions): string {
  const shared = {
    now: options.now,
    locale: options.locale,
    dateStyle: 'medium',
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

const capitalise = (text: string) =>
  text.charAt(0).toUpperCase() + text.slice(1)

function describeDate(
  filter: RecordFilter,
  name: string,
  options: DescribeRecordFilterOptions
): RecordFilterDescription | null {
  const dated = (value: string, detail?: string) => ({
    label: `${name}: ${value}`,
    value,
    ...(detail && detail !== value && { detail })
  })
  switch (filter.operator) {
    case 'on':
      return dated(date(filter.value, options))
    case 'before':
    case 'after':
      return dated(
        `${capitalise(filter.operator)} ${date(filter.value, options)}`
      )
    case 'between':
      return typeof filter.value[0] === 'string'
        ? dated(dateRange(filter.value as [string, string], options))
        : null
    case 'within': {
      try {
        const { label, detail } = describeDateRange(filter.value, options)
        return dated(label, detail)
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
    const described = describeDate(filter, name, options)
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
      const paths = field ? recordOptionPaths(field) : new Map()
      const labels = filter.values.map((value) => paths.get(value) ?? value)
      const last = filter.operator === 'has-all' ? 'and' : 'or'
      const described = phrase(
        filter.operator === 'has-all' ? 'has' : OPERATORS[filter.operator],
        list(labels, last)
      )
      return labels.length > SHOWN_VALUES
        ? { ...described, detail: list(labels, last, Infinity) }
        : described
    }
    case 'contains':
    case 'not-contains':
      return phrase(OPERATORS[filter.operator], `“${filter.value}”`)
    case 'eq':
      return phrase('is', number(filter.value, field))
    case 'neq':
    case 'lt':
    case 'gt': {
      const words = OPERATORS[filter.operator].replace(/^is /, '')
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
      return phrase(OPERATORS[filter.operator], filter.value)
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
