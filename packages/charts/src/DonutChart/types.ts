import type { PlotRow } from '@oztix/roadie-core/dashboard'
import type {
  ValueFormat,
  ValueFormatOptions
} from '@oztix/roadie-core/dataviz'

export type DonutChartProps = ValueFormatOptions & {
  /** Rows of plain values, one per part. Rows that share a name add up. */
  data: PlotRow[]
  /** Field that names each part. */
  x: string
  /** Field for each part's value. Negative and missing values are left out. */
  y: string
  /** How the centre total, tooltip, legend and table read. Slice labels are always percentages. @default 'number' */
  format?: ValueFormat
  /** The headline sentence. It becomes the plot's accessible name. */
  takeaway?: string
  /** The centre's label under the total, such as "Tickets". @default the `y` field's label */
  total?: string
  /** Parts that tell the story, in the highlight. The rest are context. */
  highlight?: string | string[]
  className?: string
}
