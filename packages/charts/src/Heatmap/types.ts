import type { PlotRow } from '@oztix/roadie-core/dashboard'
import type { ValueFormat } from '@oztix/roadie-core/dataviz'

export type HeatmapScale = 'sequential' | 'diverging'

export type HeatmapProps = {
  /** Rows of plain values, one per cell. */
  data: PlotRow[]
  /** Field for the rows, such as the weekday. Rows keep their first-seen order. */
  rows: string
  /** Field for the columns, such as the hour. Columns keep their first-seen order. */
  columns: string
  /** Field for the cell value. */
  value: string
  /** `diverging` centres on zero, with ahead in cool and behind in warm. @default 'sequential' */
  scale?: 'sequential' | 'diverging'
  /** @default 'number' */
  format?: ValueFormat
  /** Fixed decimal places for number, percent, points, and currency, from none to four. Axis ticks stay short. @default 2 for currency */
  decimals?: number
  /** Drops the decimals from a whole value: $1,200 instead of $1,200.00. */
  trimZeros?: boolean
  /** The headline sentence. It becomes the plot's accessible name. */
  takeaway?: string
  className?: string
}
