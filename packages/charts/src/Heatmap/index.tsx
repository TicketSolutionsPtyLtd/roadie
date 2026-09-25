'use client'

import { ChartPlot } from '../plot/ChartPlot'
import { heatmap } from './definition'
import type { HeatmapProps } from './types'

export function Heatmap(props: HeatmapProps) {
  return <ChartPlot chart={heatmap} props={props} className={props.className} />
}
Heatmap.displayName = 'Heatmap'

export { heatmap } from './definition'
export { heatmapTable } from './table'
export type { HeatmapProps, HeatmapScale } from './types'
