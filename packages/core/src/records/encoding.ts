import type { RelativeRange } from '../datetime/ranges'
import type { RecordFilter, RecordSort } from './types'

const NUMBER = /^-?\d+(?:\.\d+)?(?:e[+-]?\d+)?$/i
const ROLLING = /^(next|past)-(\d+)-(hour|day|week|month)$/
const PERIOD =
  /^(day|week|month|quarter|year)\.(-?\d+)((?:\.fiscal)?)((?:\.to-date)?)$/

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

function encodeRange(range: RelativeRange): string {
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
  switch (filter.operator) {
    case 'is':
    case 'is-not':
    case 'has-all':
      return `${head}:${joinItems(filter.values)}`
    case 'between':
      return `${head}:${joinItems(filter.value.map(String))}`
    case 'within':
      return `${head}:${encodeRange(filter.value)}`
    case 'contains':
    case 'not-contains':
    case 'on':
    case 'before':
    case 'after':
    case 'eq':
    case 'neq':
    case 'lt':
    case 'gt':
      return `${head}:${filter.value}`
    default:
      return head
  }
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
