import type { ChartPlot, DashboardCard } from '@oztix/roadie-core/dashboard'

import { barChartTable } from '../BarChart/table'
import type { ChartTable } from '../Chart'
import { funnelTable } from '../Funnel/table'
import { heatmapTable } from '../Heatmap/table'
import { histogramTable } from '../Histogram/table'
import { lineChartTable } from '../LineChart/table'
import { rankedBarsTable } from '../RankedBars/table'
import { scatterTable } from '../Scatter/table'
import { smallMultiplesTable } from '../SmallMultiples/table'
import { stackedBarsTable } from '../StackedBars/table'

/** The Table view rows for any chart plot in a dashboard description. */
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

/**
 * The table behind a dashboard card, such as for a Download CSV action: a
 * chart card's Table view or a table card's rows. Other cards have none.
 */
export function cardTable(card: DashboardCard): ChartTable | undefined {
  switch (card.kind) {
    case 'chart':
      return (
        card.table ??
        (card.plot.kind === 'static' ? undefined : plotTable(card.plot))
      )
    case 'table':
      return { columns: card.columns, rows: card.rows }
    default:
      return undefined
  }
}
