import type { ReactElement } from 'react'

import type {
  ChartPlot,
  Plot,
  StaticPlot,
  StaticPlotImage
} from '@oztix/roadie-core/dashboard'

import { BarChart } from '../BarChart'
import { barChartTable } from '../BarChart/table'
import type { ChartTable } from '../Chart'
import { Funnel } from '../Funnel'
import { funnelTable } from '../Funnel/table'
import { Heatmap } from '../Heatmap'
import { heatmapTable } from '../Heatmap/table'
import { Histogram } from '../Histogram'
import { histogramTable } from '../Histogram/table'
import { LineChart } from '../LineChart'
import { lineChartTable } from '../LineChart/table'
import { RankedBars } from '../RankedBars'
import { rankedBarsTable } from '../RankedBars/table'
import { Scatter } from '../Scatter'
import { scatterTable } from '../Scatter/table'
import { SmallMultiples } from '../SmallMultiples'
import { smallMultiplesTable } from '../SmallMultiples/table'
import { StackedBars } from '../StackedBars'
import { stackedBarsTable } from '../StackedBars/table'

export function plotTable(plot: ChartPlot): ChartTable {
  switch (plot.kind) {
    case 'line':
      return lineChartTable(plot)
    case 'bar':
      return barChartTable(plot)
    case 'ranked-bars':
      return rankedBarsTable(plot)
    case 'stacked-bars':
      return stackedBarsTable(plot)
    case 'histogram':
      return histogramTable(plot)
    case 'funnel':
      return funnelTable(plot)
    case 'heatmap':
      return heatmapTable(plot)
    case 'scatter':
      return scatterTable(plot)
    case 'small-multiples':
      return smallMultiplesTable(plot)
  }
}

function ThemedImage({ image, alt }: { image: StaticPlotImage; alt: string }) {
  return (
    <>
      <img
        data-theme-image={image.srcDark ? 'light' : undefined}
        src={image.src}
        alt={alt}
      />
      {image.srcDark && (
        <img data-theme-image='dark' src={image.srcDark} alt={alt} />
      )}
    </>
  )
}

function StaticPlotView({ plot }: { plot: StaticPlot }) {
  const bands = [
    ['narrow', plot.narrow],
    ['default', plot],
    ['wide', plot.wide]
  ] as const
  return (
    <div data-slot='chart-static-plot'>
      {bands.map(
        ([band, image]) =>
          image && (
            <div key={band} data-plot-band={band}>
              <ThemedImage image={image} alt={plot.alt} />
            </div>
          )
      )}
    </div>
  )
}

function withoutKind<T extends { kind: string }>({ kind: _kind, ...props }: T) {
  return props
}

// The explicit return type makes a new plot kind without a case fail the build.
function ChartPlotView({ plot }: { plot: ChartPlot }): ReactElement {
  switch (plot.kind) {
    case 'line':
      return <LineChart {...withoutKind(plot)} />
    case 'bar':
      return <BarChart {...withoutKind(plot)} />
    case 'ranked-bars':
      return <RankedBars {...withoutKind(plot)} />
    case 'stacked-bars':
      return <StackedBars {...withoutKind(plot)} />
    case 'histogram':
      return <Histogram {...withoutKind(plot)} />
    case 'funnel':
      return <Funnel {...withoutKind(plot)} />
    case 'heatmap':
      return <Heatmap {...withoutKind(plot)} />
    case 'scatter':
      return <Scatter {...withoutKind(plot)} />
    case 'small-multiples':
      return <SmallMultiples {...withoutKind(plot)} />
  }
}

export function PlotView({
  plot,
  takeaway
}: {
  plot: Plot
  takeaway?: string
}) {
  if (plot.kind === 'static') return <StaticPlotView plot={plot} />
  return (
    <ChartPlotView plot={{ ...plot, takeaway: plot.takeaway ?? takeaway }} />
  )
}
