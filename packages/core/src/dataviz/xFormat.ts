import {
  END_OF_NIGHT_HOUR,
  formatDuration,
  formatTimeOfDay
} from '../datetime/format'
import { type ValueFormat, formatValue } from './format'

/** How a chart reads its x: a value, or a position relative to the event. */
export type XFormat = ValueFormat | 'daysOut' | 'eventTime'

/** A tick is short; a label is read in full, in a tooltip, table, or aloud. */
export type XFormatStyle = 'label' | 'tick'

const HOUR = 3_600_000
const DAY = 24 * HOUR

function daysOut(days: number, style: XFormatStyle) {
  if (style === 'tick') {
    const count = formatValue(Math.abs(days), 'number')
    return `${days > 0 ? '+' : ''}${count}d`
  }
  if (days === 0) return 'Event day'
  const length = formatDuration(Math.abs(days) * DAY, 'long')
  return `${length} ${days < 0 ? 'before' : 'after'}`
}

/** Hours from the start of the event day, held as wall time on a UTC clock. */
const clockAt = (hours: number, timeStyle: 'medium' | 'numeric') =>
  formatTimeOfDay(
    { epochMilliseconds: Math.round(hours * HOUR) },
    { timeZone: 'UTC', timeStyle }
  ) ?? ''

// A night runs to 6am, as the date and time foundations count a late show.
const eventDayStart = (hours: number) => (hours - END_OF_NIGHT_HOUR) % 24 === 0

function eventTime(hours: number, style: XFormatStyle) {
  const day = `Day ${Math.floor((hours - END_OF_NIGHT_HOUR) / 24) + 1}`
  if (style === 'tick')
    return eventDayStart(hours) ? day : clockAt(hours, 'numeric')
  return `${day}, ${clockAt(hours, 'medium')}`
}

/**
 * An x value in its format. `daysOut` is days from the event, negative before
 * it. `eventTime` is hours from midnight starting the event's first day.
 */
export function formatX(
  value: number,
  format: XFormat = 'number',
  style: XFormatStyle = 'label'
) {
  if (!Number.isFinite(value)) return formatValue(value)
  if (format === 'daysOut') return daysOut(value, style)
  if (format === 'eventTime') return eventTime(value, style)
  return formatValue(value, format)
}
