import { barX, defineChart, lineY } from '@tanstack/charts'
import { scaleBand } from '@tanstack/charts/scales/band'
import { scaleLinear } from '@tanstack/charts/scales/linear'

import { seriesMarkId } from './series'
import type { ChartDefinition, PlotDatum } from './types'

export type TestProps = { points: readonly PlotDatum[]; takeaway?: string }

export const testChart: ChartDefinition<TestProps> = {
  kind: 'line',
  build: ({ points }, paint, frame) =>
    defineChart({
      marks: ['A', 'B'].map((series, i) =>
        lineY(
          points.filter((p) => p.series === series),
          {
            id: seriesMarkId(i + 1),
            x: 'x',
            y: 'y',
            z: 'series',
            stroke: paint.categorical[i]!
          }
        )
      ),
      scales: {
        x: {
          scale: scaleLinear().domain([0, 3]),
          axis: { tickLabels: { fontSize: frame.fontSize } }
        },
        y: {
          scale: scaleLinear().domain(frame.yDomain ?? [0, 10]),
          axis: { tickLabels: { fontSize: frame.fontSize } }
        }
      },
      focus: 'group-x'
    }),
  table: ({ points }) => ({
    columns: [{ key: 'x', header: 'X', kind: 'text' }],
    rows: points.map((p) => ({ x: String(p.x) }))
  }),
  summary: ({ takeaway }) => takeaway ?? 'Two test series',
  emptyMessage: ({ points }) =>
    points.length < 2 ? 'Not enough data yet to show a trend' : undefined,
  legend: () => [],
  describe: (datum) => `${datum.x}, ${datum.y} orders`,
  tooltip: (data) => ({
    title: String(data[0]?.x ?? ''),
    rows: data.map((d) => ({ label: d.series, value: String(d.y) }))
  })
}

export const testPoints: PlotDatum[] = [0, 1, 2, 3].flatMap((x) => [
  { x, y: x + 1, series: 'A', index: x * 2 },
  { x, y: x + 5, series: 'B', index: x * 2 + 1 }
])

// Two bars at one place in one series, which the engine throws on at layout.
export const brokenChart: ChartDefinition<TestProps> = {
  ...testChart,
  build: () =>
    defineChart({
      marks: [
        barX(
          [
            { value: 1, name: 'A', series: 'S' },
            { value: 2, name: 'A', series: 'S' }
          ],
          { id: 'series-1', x: 'value', y: 'name', z: 'series' }
        )
      ],
      scales: {
        x: { scale: scaleLinear().domain([0, 2]) },
        y: { scale: scaleBand<string>().domain(['A']) }
      }
    })
}
