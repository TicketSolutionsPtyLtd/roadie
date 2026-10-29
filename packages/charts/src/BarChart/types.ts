import type { PlotAnnotation, PlotRow } from '@oztix/roadie-core/dashboard'
import type {
  ValueFormat,
  ValueFormatOptions
} from '@oztix/roadie-core/dataviz'
import type { AbsoluteRange } from '@oztix/roadie-core/datetime'

export type BarChartInterval = 'hour' | 'day' | 'week'

export type BarChartProps = {
  /** Rows of plain values. Dates are ISO strings in venue wall time. */
  data: PlotRow[]
  /** Field along the bottom, usually an ISO date or time. */
  x: string
  /** Field for the bar height. Bars always start at zero. */
  y: string
  /** @default 'number' */
  format?: ValueFormat
  /** Fixed decimal places for number, percent, points, and currency, from none to four. Axis ticks stay short. @default 2 for currency */
  decimals?: number
  /** Drops the decimals from a whole value: $1,200 instead of $1,200.00. */
  trimZeros?: boolean
  /** The headline sentence. It becomes the plot's accessible name. */
  takeaway?: string
  /** Dated markers with labels of 20 characters at most. */
  annotations?: PlotAnnotation[]
  /** How long each bar covers. Sets the tick and spoken formats. @default 'day' */
  interval?: 'hour' | 'day' | 'week'
  /** A second measure on its own axis, labelled at its end. */
  line?: { y: string; label: string; format?: ValueFormat } & ValueFormatOptions
  /** Lets a drag across dated x select a range, inclusive and in venue wall time. */
  onRangeSelect?: (range: AbsoluteRange) => void
  className?: string
}
