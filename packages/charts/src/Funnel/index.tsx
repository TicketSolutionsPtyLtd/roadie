'use client'

import { ChartPlot } from '../plot/ChartPlot'
import { funnel } from './definition'
import type { FunnelProps } from './types'

export function Funnel(props: FunnelProps) {
  return <ChartPlot chart={funnel} props={props} className={props.className} />
}
Funnel.displayName = 'Funnel'

export type { FunnelProps, FunnelStep } from './types'
