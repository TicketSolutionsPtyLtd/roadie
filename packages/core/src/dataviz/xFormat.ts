import { formatDuration } from '../datetime/format'
import { type ValueFormat, formatValue } from './format'

/** How a chart reads its x: a value, or a position relative to the event. */
export type XFormat = ValueFormat | 'daysOut'

/** A tick is short; a label is read in full, in a tooltip, table, or aloud. */
export type XFormatStyle = 'label' | 'tick'

const DAY = 86_400_000

function daysOut(days: number, style: XFormatStyle) {
  if (style === 'tick') {
    const count = formatValue(Math.abs(days), 'number')
    return `${days > 0 ? '+' : ''}${count}d`
  }
  if (days === 0) return 'Event day'
  const length = formatDuration(Math.abs(days) * DAY, 'long')
  return `${length} ${days < 0 ? 'before' : 'after'}`
}

/** An x value in its format. `daysOut` is days from the event, negative before it. */
export function formatX(
  value: number,
  format: XFormat = 'number',
  style: XFormatStyle = 'label'
) {
  if (format !== 'daysOut' || !Number.isFinite(value))
    return formatValue(value, format === 'daysOut' ? 'number' : format)
  return daysOut(value, style)
}
