import type { PlotRow } from '@oztix/roadie-core/dashboard'
import type { ValueFormat } from '@oztix/roadie-core/dataviz'

export type HistogramProps = {
  /** Rows of plain values, one per order or buyer. */
  data: PlotRow[]
  /** Numeric field to bin, such as days before the show. */
  x: string
  /** Format of the binned values. Counts are always whole numbers. @default 'number' */
  format?: ValueFormat
  /** The headline sentence. It becomes the plot's accessible name. */
  takeaway?: string
  /**
   * About how many bins. Edges land on round numbers, so this is a target and
   * the chart may draw fewer. Use this or binWidth.
   */
  bins?: number
  /** How wide each bin is, in the field's units. Use this or bins. */
  binWidth?: number
  /** Draws a labelled dashed line at the median. */
  median?: boolean
  className?: string
}
