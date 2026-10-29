import type { PlotCell, PlotX, TableColumn } from '@oztix/roadie-core/dashboard'
import { type XFormat, formatX } from '@oztix/roadie-core/dataviz'

import { formatTimeCell, hasTimeOfDay, parseX } from './time'
import { type ValueStyle, fullFormat } from './values'

// Two or more capitals, with an optional plural s: AUD, URLs.
const ACRONYM = /^[A-Z]{2,}s?$/

export function fieldLabel(field: string) {
  const words = field
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    // A capital run ends before Upper+lower (ticketsADay), except a plural s.
    .replace(/([A-Z])(?=[A-Z](?!s(?:[^a-z]|$))[a-z])/g, '$1 ')
    .trim()
    .split(/\s+/)
    .map((word) => (ACRONYM.test(word) ? word : word.toLowerCase()))
    .join(' ')
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
  { format, decimals, trimZeros }: ValueStyle = {}
): TableColumn => ({
  key,
  header,
  kind: 'number',
  format: fullFormat(format),
  ...(decimals !== undefined && { decimals }),
  ...(trimZeros !== undefined && { trimZeros })
})

export function xCell(
  value: PlotCell | PlotX,
  isTime: boolean,
  xFormat?: XFormat
) {
  if (value === null) return ''
  if (!isTime)
    return xFormat && typeof value === 'number'
      ? formatX(value, xFormat)
      : value
  const ms = parseX(value)
  return ms === null ? String(value) : formatTimeCell(ms, hasTimeOfDay(value))
}
