'use client'

import { ChartPlot } from '../plot/ChartPlot'
import { rankedBars } from './definition'
import type { RankedBarsProps } from './types'

export function RankedBars(props: RankedBarsProps) {
  return (
    <ChartPlot chart={rankedBars} props={props} className={props.className} />
  )
}
RankedBars.displayName = 'RankedBars'

export { rankedBars } from './definition'
export { rankedBarsTable } from './table'
export type { RankedBarsProps, RankedBarsReference } from './types'
