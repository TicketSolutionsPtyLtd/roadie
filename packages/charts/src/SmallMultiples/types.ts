import type { PlotRow } from '@oztix/roadie-core/dashboard'

import type { BarChartProps } from '../BarChart'
import type { LineChartProps } from '../LineChart'

export type SmallMultiplesChart =
  | ({ kind: 'line' } & Omit<LineChartProps, 'data' | 'className'>)
  | ({ kind: 'bar' } & Omit<BarChartProps, 'data' | 'className'>)

export type SmallMultiplesProps = {
  /** Rows for every panel. */
  data: PlotRow[]
  /** Field that splits rows into panels, such as the gate. */
  by: string
  /** The chart each panel draws, with its props. */
  chart: SmallMultiplesChart
  /** Panels share one value scale so they compare. @default true */
  shared?: boolean
  /** The headline sentence. It becomes the card's summary. */
  takeaway?: string
  className?: string
}
