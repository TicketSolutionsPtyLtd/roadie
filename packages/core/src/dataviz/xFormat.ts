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

/** Wall time on a UTC clock, so the time of day reads as written. */
const clockAt = (ms: number, timeStyle: 'medium' | 'numeric') =>
  formatTimeOfDay({ epochMilliseconds: ms }, { timeZone: 'UTC', timeStyle }) ??
  ''

// A night runs to 6am, as the date and time foundations count a late show.
/** The hour an `eventTime` day starts: a night runs to 6am. */
export const EVENT_DAY_START_HOUR = END_OF_NIGHT_HOUR

const NIGHT_END = END_OF_NIGHT_HOUR * HOUR

// The day and the clock read the same rounded instant, so they never disagree.
function eventTime(hours: number, style: XFormatStyle) {
  const ms = Math.round(hours * HOUR)
  const day = `Day ${Math.floor((ms - NIGHT_END) / DAY) + 1}`
  if (style === 'label') return `${day}, ${clockAt(ms, 'medium')}`
  return (ms - NIGHT_END) % DAY === 0 ? day : clockAt(ms, 'numeric')
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
