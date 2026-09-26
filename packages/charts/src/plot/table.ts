import type { PlotCell, PlotX, TableColumn } from '@oztix/roadie-core/dashboard'
import type { ValueFormat } from '@oztix/roadie-core/dataviz'

import { formatTimeTitle, hasTimeOfDay, parseX } from './time'
import { fullFormat } from './values'

export function fieldLabel(field: string) {
  const words = field
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .trim()
    .toLowerCase()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

// Text even for a numeric x, so DataTable keeps the chart's order and alignment
export const xColumn = (field: string): TableColumn => ({
  key: field,
  header: fieldLabel(field),
  kind: 'text'
})

export const valueColumn = (
  key: string,
  header: string,
  format?: ValueFormat
): TableColumn => ({ key, header, kind: 'number', format: fullFormat(format) })

export function xCell(value: PlotCell | PlotX, isTime: boolean) {
  if (value === null) return ''
  if (!isTime) return value
  const ms = parseX(value)
  return ms === null ? String(value) : formatTimeTitle(ms, hasTimeOfDay(value))
}
