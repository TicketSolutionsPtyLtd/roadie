'use client'

import { ChartPlot } from '../plot/ChartPlot'
import { lineChart } from './definition'
import type { LineChartProps } from './types'

export function LineChart(props: LineChartProps) {
  return (
    <ChartPlot chart={lineChart} props={props} className={props.className} />
  )
}
LineChart.displayName = 'LineChart'

export type { LineChartPalette, LineChartProps } from './types'
