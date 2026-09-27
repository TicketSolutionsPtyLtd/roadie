'use client'

import { ChartPlot } from '../plot/ChartPlot'
import { histogram } from './definition'
import type { HistogramProps } from './types'

export function Histogram(props: HistogramProps) {
  return (
    <ChartPlot chart={histogram} props={props} className={props.className} />
  )
}
Histogram.displayName = 'Histogram'

export type { HistogramProps } from './types'
