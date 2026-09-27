import type { PlotRow } from '@oztix/roadie-core/dashboard'
import type { ValueFormat } from '@oztix/roadie-core/dataviz'

export type StackedBarsMode = 'count' | 'share'
export type StackedBarsOrientation = 'horizontal' | 'vertical'

export type StackedBarsProps = {
  /** Rows of plain values, one per category and segment. */
  data: PlotRow[]
  /** Field that names each bar. */
  x: string
  /** Field for the segment size. */
  y: string
  /** Field that names each segment. Past 6, the smallest roll into Other. */
  series: string
  /** Segments that tell the story, in the highlight. The rest are context. */
  highlight?: string | string[]
  /** @default 'categorical', or the pair or trio set at 2 or 3 segments */
  palette?: 'categorical' | 'pair' | 'trio'
  /** @default 'number' */
  format?: ValueFormat
  /** The headline sentence. It becomes the plot's accessible name. */
  takeaway?: string
  /** `share` stacks every bar to 100%. @default 'count' */
  mode?: 'count' | 'share'
  /** @default 'horizontal' */
  orientation?: 'horizontal' | 'vertical'
  className?: string
}
