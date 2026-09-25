// Engine-free and free of 'use client', so a server can build the Table view
// for any chart without the chart engine or a client boundary.
export type { ChartTable } from '../Chart'
export { barChartTable } from '../BarChart/table'
export { funnelTable } from '../Funnel/table'
export { heatmapTable } from '../Heatmap/table'
export { histogramTable } from '../Histogram/table'
export { lineChartTable } from '../LineChart/table'
export { rankedBarsTable } from '../RankedBars/table'
export { scatterTable } from '../Scatter/table'
export { smallMultiplesTable } from '../SmallMultiples/table'
export { stackedBarsTable } from '../StackedBars/table'
