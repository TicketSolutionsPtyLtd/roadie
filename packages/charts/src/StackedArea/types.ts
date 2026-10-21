import type { PlotRow } from '@oztix/roadie-core/dashboard'
import type { ValueFormat, XFormat } from '@oztix/roadie-core/dataviz'

export type StackedAreaProps = {
  /** Rows of plain values, one per time and series. Dates are ISO strings in venue wall time. */
  data: PlotRow[]
  /** Field along the bottom: an ISO date or a number. */
  x: string
  /** Field for the value each series adds to the stack. */
  y: string
  /** Field that names each layer. Past 6, the smallest roll into Other. */
  series: string
  /** Layers that tell the story, drawn in the highlight. The rest are context. */
  highlight?: string | string[]
  /** @default 'categorical', or the pair or trio set at 2 or 3 layers */
  palette?: 'categorical' | 'pair' | 'trio'
  /** @default 'number' */
  format?: ValueFormat
  /** How a numeric x reads, as on LineChart. @default 'number' */
  xFormat?: XFormat
  /** The headline sentence. It becomes the plot's accessible name. */
  takeaway?: string
  className?: string
}
