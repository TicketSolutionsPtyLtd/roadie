import type { ReactElement } from 'react'

import type {
  ChartPlot,
  Plot,
  StaticPlot,
  StaticPlotImage
} from '@oztix/roadie-core/dashboard'
import type { AbsoluteRange } from '@oztix/roadie-core/datetime'

import { BarChart } from '../BarChart'
import { DonutChart } from '../DonutChart'
import { Funnel } from '../Funnel'
import { Heatmap } from '../Heatmap'
import { Histogram } from '../Histogram'
import { LineChart } from '../LineChart'
import { RankedBars } from '../RankedBars'
import { Scatter } from '../Scatter'
import { SmallMultiples } from '../SmallMultiples'
import { StackedArea } from '../StackedArea'
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

function chartProps<T extends { kind: string; selectsPeriod?: boolean }>({
  kind: _kind,
  selectsPeriod: _selectsPeriod,
  ...props
}: T) {
  return props
}

type RangeSelect = { onRangeSelect?: (range: AbsoluteRange) => void }

// The explicit return type makes a new plot kind without a case fail the build.
function ChartPlotView({
  plot,
  onRangeSelect
}: { plot: ChartPlot } & RangeSelect): ReactElement {
  switch (plot.kind) {
    case 'line':
      return <LineChart {...chartProps(plot)} onRangeSelect={onRangeSelect} />
    case 'bar':
      return <BarChart {...chartProps(plot)} onRangeSelect={onRangeSelect} />
    case 'ranked-bars':
      return <RankedBars {...chartProps(plot)} />
    case 'donut':
      return <DonutChart {...chartProps(plot)} />
    case 'stacked-bars':
      return <StackedBars {...chartProps(plot)} />
    case 'stacked-area':
      return <StackedArea {...chartProps(plot)} onRangeSelect={onRangeSelect} />
    case 'histogram':
      return <Histogram {...chartProps(plot)} />
    case 'funnel':
      return <Funnel {...chartProps(plot)} />
    case 'heatmap':
      return <Heatmap {...chartProps(plot)} />
    case 'scatter':
      return <Scatter {...chartProps(plot)} />
    case 'small-multiples':
      return <SmallMultiples {...chartProps(plot)} />
  }
}

export function PlotView({
  plot,
  takeaway,
  onRangeSelect
}: {
  plot: Plot
  takeaway?: string
} & RangeSelect) {
  if (plot.kind === 'static') return <StaticPlotView plot={plot} />
  return (
    <ChartPlotView
      plot={{ ...plot, takeaway: plot.takeaway ?? takeaway }}
      onRangeSelect={onRangeSelect}
    />
  )
}
