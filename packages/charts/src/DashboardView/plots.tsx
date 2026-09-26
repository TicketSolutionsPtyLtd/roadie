import type { ReactElement } from 'react'

import type {
  ChartPlot,
  Plot,
  StaticPlot,
  StaticPlotImage
} from '@oztix/roadie-core/dashboard'

import { BarChart } from '../BarChart'
import { Funnel } from '../Funnel'
import { Heatmap } from '../Heatmap'
import { Histogram } from '../Histogram'
import { LineChart } from '../LineChart'
import { RankedBars } from '../RankedBars'
import { Scatter } from '../Scatter'
import { SmallMultiples } from '../SmallMultiples'
import { StackedBars } from '../StackedBars'

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
