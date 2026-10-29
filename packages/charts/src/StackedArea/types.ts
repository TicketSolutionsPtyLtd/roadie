import type {
  PlotAnnotation,
  PlotRow,
  PlotX
} from '@oztix/roadie-core/dashboard'
import type { ValueFormat, XFormat } from '@oztix/roadie-core/dataviz'
import type { AbsoluteRange } from '@oztix/roadie-core/datetime'

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
  /** Fixed decimal places for number, percent, points, and currency, from none to four. Shares follow it too. Axis ticks stay short. @default 2 for currency */
  decimals?: number
  /** Drops the decimals from a whole value: $1,200 instead of $1,200.00. */
  trimZeros?: boolean
  /** How a numeric x reads, as on LineChart. @default 'number' */
  xFormat?: XFormat
  /** The headline sentence. It becomes the plot's accessible name. */
  takeaway?: string
  /** `share` stacks every time to 100%. @default 'count' */
  mode?: 'count' | 'share'
  /** Dated markers with labels of 20 characters at most. */
  annotations?: PlotAnnotation[]
  /** Marks today with a labelled dot on the top of the stack, read as the total. */
  today?: PlotX
  /** Lets a drag across dated x select a range, inclusive and in venue wall time. */
  onRangeSelect?: (range: AbsoluteRange) => void
  className?: string
}
