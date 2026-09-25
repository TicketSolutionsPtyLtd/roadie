'use client'

import { useContext, useEffect, useMemo } from 'react'

import type { PlotRow } from '@oztix/roadie-core/dashboard'
import { cn } from '@oztix/roadie-core/utils'

import { barChart } from '../BarChart/definition'
import { ChartCardContext } from '../Chart/context'
import { lineChart } from '../LineChart/definition'
import { ChartPlot } from '../plot/ChartPlot'
import { PANEL_HEIGHT, panelsOf, sharedDomain } from './panels'
import { smallMultiplesSummary } from './summary'
import { smallMultiplesTable } from './table'
import type { SmallMultiplesChart, SmallMultiplesProps } from './types'

function PanelPlot({
  chart,
  rows,
  takeaway,
  domain
}: {
  chart: SmallMultiplesChart
  rows: PlotRow[]
  takeaway: string
  domain: readonly [number, number] | undefined
}) {
  const props = useMemo(
    () => ({ ...chart, data: rows, takeaway }),
    [chart, rows, takeaway]
  )
  return props.kind === 'line' ? (
    <ChartPlot
      chart={lineChart}
      props={props}
      report={false}
      height={PANEL_HEIGHT}
      yDomain={domain}
    />
  ) : (
    <ChartPlot
      chart={barChart}
      props={props}
      report={false}
      height={PANEL_HEIGHT}
      yDomain={domain}
    />
  )
}

export function SmallMultiples(props: SmallMultiplesProps) {
  const card = useContext(ChartCardContext)
  const panels = useMemo(() => panelsOf(props), [props])
  const domain = useMemo(() => sharedDomain(props), [props])
  const summary = useMemo(() => smallMultiplesSummary(props), [props])
  const table = useMemo(() => smallMultiplesTable(props), [props])
  const report = card?.report
  useEffect(() => {
    report?.({ summary, table })
    return () => report?.(null)
  }, [report, summary, table])

  return (
    <div
      data-slot='small-multiples'
      className={cn(
        'grid grid-cols-[repeat(auto-fill,minmax(min(100%,15rem),1fr))] gap-4',
        props.className
      )}
    >
      {panels.map((panel) => (
        <figure key={panel.key} aria-label={panel.key} className='grid gap-1'>
          <figcaption className='text-xs font-semibold text-subtle'>
            {panel.key}
          </figcaption>
          <PanelPlot
            chart={props.chart}
            rows={panel.rows}
            takeaway={`${panel.key}. ${summary}`}
            domain={domain}
          />
        </figure>
      ))}
    </div>
  )
}
SmallMultiples.displayName = 'SmallMultiples'

export { renderSmallMultiplesSvg } from './static'
export { smallMultiplesTable } from './table'
export type { SmallMultiplesChart, SmallMultiplesProps } from './types'
