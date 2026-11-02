import { render, screen } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { CHART_PLOT_KINDS, type ChartPlot } from '@oztix/roadie-core/dashboard'

import { onSaleExample } from '../BarChart/examples'
import { ticketTypeExample } from '../DonutChart/examples'
import { checkoutExample } from '../Funnel/examples'
import { whenFansBuyExample } from '../Heatmap/examples'
import { leadTimeExample } from '../Histogram/examples'
import { paceExample } from '../LineChart/examples'
import { channelExample } from '../RankedBars/examples'
import { portfolioExample } from '../Scatter/examples'
import { gatesExample } from '../SmallMultiples/examples'
import { scansByGateExample } from '../StackedArea/examples'
import { ticketMixExample } from '../StackedBars/examples'
import { plotTable } from '../tables/cardTable'
import { PlotView } from './plots'

const plots: ChartPlot[] = [
  { kind: 'line', ...paceExample },
  { kind: 'bar', ...onSaleExample },
  { kind: 'ranked-bars', ...channelExample },
  { kind: 'donut', ...ticketTypeExample },
  { kind: 'stacked-bars', ...ticketMixExample },
  { kind: 'stacked-area', ...scansByGateExample },
  { kind: 'histogram', ...leadTimeExample },
  { kind: 'funnel', ...checkoutExample },
  { kind: 'heatmap', ...whenFansBuyExample },
  { kind: 'scatter', ...portfolioExample },
  { kind: 'small-multiples', ...gatesExample }
]

// A donut card draws once DonutChart lands.
const drawn = plots.filter((plot) => plot.kind !== 'donut')

describe('every plot kind is wired', () => {
  it('covers the whole kind list', () => {
    expect(plots.map((p) => p.kind).sort()).toEqual(
      [...CHART_PLOT_KINDS].sort()
    )
  })

  it.each(drawn.map((p) => [p.kind, p] as const))(
    '%s renders a named plot',
    (_, plot) => {
      render(<PlotView plot={plot} />)
      expect(screen.getAllByRole('img').length).toBeGreaterThan(0)
    }
  )

  it.each(plots.map((p) => [p.kind, p] as const))(
    '%s derives a table on the server',
    (_, plot) => {
      const table = plotTable(plot)
      expect(table.columns.length).toBeGreaterThan(0)
      expect(table.rows.length).toBeGreaterThan(0)
    }
  )

  it('says a donut card cannot be drawn yet', () => {
    render(<PlotView plot={{ kind: 'donut', ...ticketTypeExample }} />)
    expect(screen.getByText("This chart couldn't be drawn")).toBeInTheDocument()
  })

  it('renders every kind with renderToString', () => {
    for (const plot of drawn)
      expect(renderToString(<PlotView plot={plot} />)).toContain('role="img"')
  })
})
