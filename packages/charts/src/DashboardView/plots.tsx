import type {
  ChartPlot,
  Plot,
  StaticPlot,
  StaticPlotImage
} from '@oztix/roadie-core/dashboard'

import type { ChartTable } from '../Chart'
import { LineChart } from '../LineChart'
import { lineChartTable } from '../LineChart/table'

function withoutKind<T extends { kind: string }>(plot: T): Omit<T, 'kind'> {
  return plot
}

export function plotTable(plot: ChartPlot): ChartTable | undefined {
  switch (plot.kind) {
    case 'line':
      return lineChartTable(plot)
    default:
      return undefined
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

export function PlotView({
  plot,
  takeaway
}: {
  plot: Plot
  takeaway?: string
}) {
  switch (plot.kind) {
    case 'static':
      return <StaticPlotView plot={plot} />
    case 'line':
      return (
        <LineChart
          {...withoutKind(plot)}
          takeaway={plot.takeaway ?? takeaway}
        />
      )
    default:
      return null
  }
}
