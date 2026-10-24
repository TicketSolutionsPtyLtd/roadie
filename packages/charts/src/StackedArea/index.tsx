'use client'

import { ChartPlot } from '../plot/ChartPlot'
import { stackedArea } from './definition'
import type { StackedAreaProps } from './types'

export function StackedArea(props: StackedAreaProps) {
  return (
    <ChartPlot
      chart={stackedArea}
      props={props}
      onRangeSelect={props.onRangeSelect}
      className={props.className}
    />
  )
}
StackedArea.displayName = 'StackedArea'

export type { StackedAreaProps } from './types'
