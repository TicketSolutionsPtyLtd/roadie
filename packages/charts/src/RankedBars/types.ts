import type { PlotRow } from '@oztix/roadie-core/dashboard'
import type { ValueFormat } from '@oztix/roadie-core/dataviz'

export type RankedBarsReference = {
  /** Field holding the comparison value for each bar. */
  field: string
  /** Names the tick in the legend, tooltip and table. */
  label: string
}

export type RankedBarsProps = {
  /** Rows of plain values, one per category. */
  data: PlotRow[]
  /** Field that names each bar. */
  x: string
  /** Field for the bar length. Bars always start at zero. */
  y: string
  /** Categories that tell the story, in the highlight. The rest are context. */
  highlight?: string | string[]
  /** @default 'number', or 'percent' with share */
  format?: ValueFormat
  /** The headline sentence. It becomes the plot's accessible name. */
  takeaway?: string
  /** Bars shown before the rest roll into Other. @default 8 */
  limit?: number
  /** A comparison tick per bar, such as similar shows. */
  reference?: RankedBarsReference
  /** Shows each bar as a percent of the total. */
  share?: boolean
  className?: string
}
