'use client'

import { ChartPlot } from '../plot/ChartPlot'
import { barChart } from './definition'
import type { BarChartProps } from './types'

export function BarChart(props: BarChartProps) {
  return (
    <ChartPlot chart={barChart} props={props} className={props.className} />
  )
}
BarChart.displayName = 'BarChart'

export { barChart } from './definition'
export { barChartTable } from './table'
export { barYExtent } from './bars'
export type { BarChartInterval, BarChartProps } from './types'
