import { type RelativeRange, canonicalDateRange } from '../datetime/ranges'
import { isRecordOperator, recordOperatorSpec } from './operators'
import type { RecordFilter, RecordSort } from './types'

const NUMBER = /^-?\d+(?:\.\d+)?(?:e[+-]?\d+)?$/i
const ROLLING = /^(next|past)-(\d+)-(hour|day|week|month)$/
const PERIOD =
  /^(day|week|month|quarter|year)\.(-?\d+)((?:\.fiscal)?)((?:\.to-date)?)$/

// Meilisearch, inside quotes, pairs each backslash with the next character and
// then unescapes only \", so an odd run of backslashes before a quote or at
// the end has no faithful encoding there.
const ODD_BACKSLASHES = /(?:^|[^\\])(?:\\\\)*\\(?:"|$)/

/** Whether text holds a backslash a search index can't read back. */
export function hasUnquotableBackslash(text: string): boolean {
  return ODD_BACKSLASHES.test(text)
}

export function escapeItem(text: string): string {
  return text.replace(/%/g, '%25').replace(/,/g, '%2C')
}

export function escapeKey(text: string): string {
  return escapeItem(text).replace(/:/g, '%3A').replace(/^-/, '%2D')
}

export function unescape(text: string): string {
  return text.replace(/%(25|2C|3A|2D)/gi, (_, code: string) =>
    String.fromCharCode(parseInt(code, 16))
  )
}

export function joinItems(items: readonly string[]): string {
  return items.map(escapeItem).join(',')
}

export function splitItems(text: string): string[] {
  return text === '' ? [] : text.split(',').map(unescape)
}

// In its one form, so the same meaning always writes the same text.
function encodeRange(value: RelativeRange): string {
  const range = canonicalDateRange(value)
  if (typeof range === 'string') return range
  if ('direction' in range) {
    return `${range.direction}-${range.amount}-${range.unit}`
  }
  return [
    range.period,
    range.offset,
    range.fiscal && 'fiscal',
    range.toDate && 'to-date'
  ]
    .filter((part) => part !== undefined && part !== false)
    .join('.')
}

export function decodeRange(text: string): RelativeRange | string {
  let m = ROLLING.exec(text)
  if (m) {
    return {
      direction: m[1] as 'next' | 'past',
      amount: Number(m[2]),
      unit: m[3] as 'hour' | 'day' | 'week' | 'month'
    }
  }
  m = PERIOD.exec(text)
  if (m) {
    return {
      period: m[1] as 'day' | 'week' | 'month' | 'quarter' | 'year',
      offset: Number(m[2]),
      ...(m[3] && { fiscal: true }),
      ...(m[4] && { toDate: true })
    }
  }
  return text
}

/** One chip as `field:operator[:value]`. */
export function encodeFilter(filter: RecordFilter): string {
  const head = `${escapeKey(filter.field)}:${filter.operator}`
  // A stored or hand-written filter may carry a stray value, which reads as none.
  if (
    !isRecordOperator(filter.operator) ||
    recordOperatorSpec(filter.operator).value === 'none'
  )
    return head
  if ('values' in filter) return `${head}:${joinItems(filter.values)}`
  if (!('value' in filter) || filter.value == null) return head
  const { value } = filter
  if (Array.isArray(value)) return `${head}:${joinItems(value.map(String))}`
  if (typeof value === 'object') return `${head}:${encodeRange(value)}`
  return `${head}:${value}`
}

export function toNumber(text: string): number {
  return NUMBER.test(text) ? Number(text) : NaN
}

export function encodeSort(sort: readonly RecordSort[]): string {
  return sort
    .map(
      ({ field, direction }) =>
        `${direction === 'descending' ? '-' : ''}${escapeKey(field)}`
    )
    .join(',')
}

export function decodeSort(text: string): RecordSort[] {
  return text
    .split(',')
    .filter(Boolean)
    .map((part) => {
      const descending = part.startsWith('-')
      return {
        field: unescape(descending ? part.slice(1) : part),
        direction: descending ? 'descending' : 'ascending'
      }
    })
}
