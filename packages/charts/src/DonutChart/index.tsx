'use client'

import { ChartPlot } from '../plot/ChartPlot'
import { donutChart } from './definition'
import type { DonutChartProps } from './types'

export function DonutChart(props: DonutChartProps) {
  return (
    <ChartPlot chart={donutChart} props={props} className={props.className} />
  )
}
DonutChart.displayName = 'DonutChart'

export type { DonutChartProps } from './types'
