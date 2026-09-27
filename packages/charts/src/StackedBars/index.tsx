'use client'

import { ChartPlot } from '../plot/ChartPlot'
import { stackedBars } from './definition'
import type { StackedBarsProps } from './types'

export function StackedBars(props: StackedBarsProps) {
  return (
    <ChartPlot chart={stackedBars} props={props} className={props.className} />
  )
}
StackedBars.displayName = 'StackedBars'

export type {
  StackedBarsMode,
  StackedBarsOrientation,
  StackedBarsProps
} from './types'
