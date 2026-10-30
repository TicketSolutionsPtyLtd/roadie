import { formatValue, formatValueInCurrency } from '../dataviz/format'
import {
  type FormatOptions,
  type Instantish,
  formatDateRange,
  formatDateTime
} from '../datetime/format'
import { isPlainDate, plainDateOf } from '../datetime/plainDate'
import { recordFieldOptions } from './fields'
import { epochSpan, isEmptyValue, read, rowZone } from './match'
import type { RecordField } from './types'

export type FormatRecordValueOptions = {
  /** The viewer's zone: timestamps read in it, and event times without a venue zone. */
  timeZone: string
  /** For the year rule; defaults to the current time. */
  now?: Instantish
}

// A table formats a field for every row, so its labels are built once.
const labelCache = new WeakMap<RecordField, Map<string, string>>()

function labelsOf(field: RecordField) {
  let labels = labelCache.get(field)
  if (!labels) {
    labels = new Map(
      recordFieldOptions(field).map((option) => [option.value, option.label])
    )
    labelCache.set(field, labels)
  }
  return labels
}

const list = (value: unknown) => (Array.isArray(value) ? value : [value])

function money(value: number, field: RecordField, row: object) {
  const code = field.currency ?? read(row, field.currencyKey)
  return formatValueInCurrency(
    value,
    field.format ?? 'currency',
    typeof code === 'string' ? code : undefined,
    field
  )
}

const UTC_MIDNIGHT = 'T00:00:00Z'

/** A range's end as a plain date, read in the row's zone when it's an instant. */
function plainEnd(
  row: object,
  field: RecordField,
  end: unknown,
  options: FormatRecordValueOptions
): string | null {
  if (typeof end === 'string' && isPlainDate(end)) return end
  const zone = rowZone(row, field, options.timeZone)
  const span = epochSpan(end, zone)
  return span ? plainDateOf(new Date(span[0]), zone) : null
}

function date(
  row: object,
  field: RecordField,
  options: FormatRecordValueOptions
) {
  const start = read(row, field.key)
  const end = read(row, field.end)
  const hasEnd = !isEmptyValue(end)
  if (typeof start === 'string' && isPlainDate(start)) {
    const opts = { timeZone: 'UTC', now: options.now }
    const endDate = hasEnd ? plainEnd(row, field, end, options) : null
    const to = endDate ? new Date(endDate + UTC_MIDNIGHT) : null
    return formatDateRange(new Date(start + UTC_MIDNIGHT), to, opts)
  }
  const zone = rowZone(row, field, options.timeZone)
  const from = epochSpan(start, zone)
  if (!from) return typeof start === 'string' ? start : null
  const to = hasEnd ? epochSpan(end, zone) : null
  const opts: FormatOptions = {
    timeZone: zone,
    now: options.now,
    timeStyle: 'short',
    dateStyle: (field.moment ?? 'timestamp') === 'timestamp' ? 'medium' : 'long'
  }
  return to
    ? formatDateRange(new Date(from[0]), new Date(to[0]), opts)
    : formatDateTime(new Date(from[0]), opts)
}

/**
 * A record's value as the text its field shows: option and status labels,
 * numbers and money in their format, booleans as Yes or No, and dates in the
 * house formats, event and access times in the venue's zone. Null when the
 * row holds nothing. Text a field can't read, like "To be announced" in a
 * date, comes back as given.
 */
export function formatRecordValue(
  row: object,
  field: RecordField,
  options: FormatRecordValueOptions
): string | null {
  const value = read(row, field.key)
  if (isEmptyValue(value)) return null
  switch (field.type) {
    case 'date':
      return Array.isArray(value)
        ? value
            .map(
              (item) =>
                date(
                  { ...row, [field.key]: item },
                  { ...field, end: undefined },
                  options
                ) ?? ''
            )
            .filter(Boolean)
            .join(', ') || null
        : date(row, field, options)
    case 'number':
    case 'money':
      if (typeof value !== 'number') return String(value)
      return field.type === 'money'
        ? money(value, field, row)
        : formatValue(value, field.format, field)
    case 'boolean':
      return typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)
    case 'option':
    case 'location': {
      const labels = labelsOf(field)
      return list(value)
        .map((item) => labels.get(String(item)) ?? String(item))
        .join(', ')
    }
    case 'text':
      return list(value).map(String).join(', ')
  }
}
