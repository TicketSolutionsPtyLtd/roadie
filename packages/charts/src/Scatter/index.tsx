'use client'

import { ChartPlot } from '../plot/ChartPlot'
import { scatter } from './definition'
import type { ScatterProps } from './types'

export function Scatter(props: ScatterProps) {
  return <ChartPlot chart={scatter} props={props} className={props.className} />
}
Scatter.displayName = 'Scatter'

export type { ScatterProps, ScatterQuadrants } from './types'
