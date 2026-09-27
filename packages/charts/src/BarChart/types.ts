import type { PlotAnnotation, PlotRow } from '@oztix/roadie-core/dashboard'
import type { ValueFormat } from '@oztix/roadie-core/dataviz'

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
  /** The headline sentence. It becomes the plot's accessible name. */
  takeaway?: string
  /** Dated markers with labels of 20 characters at most. */
  annotations?: PlotAnnotation[]
  /** How long each bar covers. Sets the tick and spoken formats. @default 'day' */
  interval?: 'hour' | 'day' | 'week'
  /** A second measure on its own axis, labelled at its end. */
  line?: { y: string; label: string; format?: ValueFormat }
  className?: string
}
