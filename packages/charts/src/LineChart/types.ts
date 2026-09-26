import type {
  PlotAnnotation,
  PlotRow,
  PlotX
} from '@oztix/roadie-core/dashboard'
import type { ValueFormat } from '@oztix/roadie-core/dataviz'

export type LineChartPalette = 'categorical' | 'pair' | 'trio'

export type LineChartProps = {
  /** Rows of plain values. Dates are ISO strings in venue wall time. */
  data: PlotRow[]
  /** Field along the bottom: an ISO date or a number. */
  x: string
  /** Field for the value. */
  y: string
  /** Field that splits rows into series. Past 6, the smallest roll into Other. */
  series?: string
  /** Series that tell the story, drawn in the highlight. The rest are context. */
  highlight?: string | string[]
  /** @default 'categorical', or the pair or trio set at 2 or 3 series */
  palette?: LineChartPalette
  /** @default 'number' */
  format?: ValueFormat
  /** The headline sentence. It becomes the plot's accessible name. */
  takeaway?: string
  /** Dated markers with labels of 20 characters at most. */
  annotations?: PlotAnnotation[]
  /** Fills under a single series. */
  area?: boolean
  /** Plots the running total. */
  cumulative?: boolean
  /** A shaded range, such as similar shows, with an optional dashed median. */
  band?: { low: string; high: string; median?: string; label?: string }
  /** Where the forecast starts. Values after it are dotted, in a faint cone. */
  forecast?: { from: PlotX; low?: string; high?: string }
  /** Draws an end tick labelled with the target. */
  target?: number
  /** Marks today with a labelled dot. */
  today?: PlotX
  className?: string
}
