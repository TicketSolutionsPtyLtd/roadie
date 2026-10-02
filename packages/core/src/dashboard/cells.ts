import { formatValue } from '../dataviz/format'
import type { TableColumn } from './schema'

export const STATUS_INTENTS = [
  'neutral',
  'brand',
  'accent',
  'danger',
  'success',
  'warning',
  'info'
] as const

export type StatusIntent = (typeof STATUS_INTENTS)[number]

/** How a status column shows one key. */
export type TableStatus = {
  intent: StatusIntent
  /** Defaults to the key, humanised. */
  label?: string
  /** Sorts by this instead of the label. */
  order?: number
}

export type ResolvedStatus = {
  intent: StatusIntent
  label: string
  order?: number
}

/**
 * `on_sale`, `sold-out` and `partlyRefunded` read as "On sale", "Sold out" and
 * "Partly refunded". Acronyms lose their capitals, so `VIP_only` reads "Vip
 * only": give such a key a `label`.
 */
export function humaniseStatus(key: string) {
  const words = key
    .replace(/([a-z\d])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
    .toLowerCase()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

/** The intent and label a status column shows for a key. An unknown key shows as neutral, in its raw text. */
export function columnStatus(
  column: Pick<TableColumn, 'status'>,
  key: string
): ResolvedStatus {
  const option =
    column.status && Object.hasOwn(column.status, key)
      ? column.status[key]
      : undefined
  if (!option) return { intent: 'neutral', label: key }
  return {
    intent: option.intent,
    label: option.label ?? humaniseStatus(key),
    ...(option.order !== undefined && { order: option.order })
  }
}

/** A cell as the plain text its table shows, such as for a CSV. */
export function cellText(column: TableColumn, value: unknown): string {
  if (value === null || value === undefined) return ''
  if (column.kind === 'status') return columnStatus(column, String(value)).label
  if (column.kind === 'text' || typeof value === 'string') return String(value)
  if (Array.isArray(value)) {
    const last: unknown = value.at(-1)
    return typeof last === 'number' ? formatValue(last, column.format) : ''
  }
  if (typeof value !== 'number') return String(value)
  if (column.kind !== 'meter') return formatValue(value, column.format)
  const max = column.max ?? 1
  return max === 1
    ? formatValue(value, column.format ?? 'percent')
    : `${formatValue(value, column.format)} of ${formatValue(max, column.format)}`
}
