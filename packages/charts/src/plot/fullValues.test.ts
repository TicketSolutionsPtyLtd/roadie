import { describe, expect, it } from 'vitest'

import { barChart } from '../BarChart/definition'
import { funnel } from '../Funnel/definition'
import { heatmap } from '../Heatmap/definition'
import { lineChart } from '../LineChart/definition'
import { rankedBars } from '../RankedBars/definition'
import { scatter } from '../Scatter/definition'
import { stackedBars } from '../StackedBars/definition'
import { hexPaint } from './paint'
import type { ChartDefinition, PlotDatum } from './types'

const paint = hexPaint('light')
const rows = [
  { day: '2026-10-01', name: 'A', orders: 24_000, spend: 24_000 },
  { day: '2026-10-02', name: 'B', orders: 12_000, spend: 12_000 }
]
const datum: PlotDatum = { x: 'A', y: 24_000, series: 'Orders', index: 0 }

function check<P>(chart: ChartDefinition<P>, props: P, at: PlotDatum) {
  const spoken = chart.describe(at, props)
  const tip = chart.tooltip([at], props, paint)
  const shown = [spoken, ...tip.rows.map((r) => r.value)].join(' | ')
  expect(shown).toContain('24,000')
  expect(shown).not.toMatch(/24k/)
  expect(chart.summary(props)).not.toMatch(/\d+k\b/)
}

describe('speech, summaries and tooltips keep full values', () => {
  it.each([
    [
      'line',
      () =>
        check(
          lineChart,
          { data: rows, x: 'day', y: 'orders', format: 'compact' },
          { ...datum, x: Date.UTC(2026, 9, 1) }
        )
    ],
    [
      'bar',
      () =>
        check(
          barChart,
          { data: rows, x: 'day', y: 'orders', format: 'compact' },
          { ...datum, x: '2026-10-01' }
        )
    ],
    [
      'ranked bars',
      () =>
        check(
          rankedBars,
          { data: rows, x: 'name', y: 'orders', format: 'compact' },
          datum
        )
    ],
    [
      'stacked bars',
      () =>
        check(
          stackedBars,
          {
            data: rows,
            x: 'name',
            y: 'orders',
            series: 'name',
            format: 'compact'
          },
          { ...datum, series: 'A' }
        )
    ],
    [
      'funnel',
      () =>
        check(
          funnel,
          {
            steps: [
              { label: 'A', value: 24_000 },
              { label: 'B', value: 12_000 }
            ],
            format: 'compact'
          },
          datum
        )
    ],
    [
      'heatmap',
      () =>
        check(
          heatmap,
          {
            data: rows,
            rows: 'name',
            columns: 'day',
            value: 'orders',
            format: 'compact'
          },
          { ...datum, x: '2026-10-01', series: 'A' }
        )
    ],
    [
      'scatter',
      () =>
        check(
          scatter,
          {
            data: rows,
            x: 'spend',
            y: 'orders',
            label: 'name',
            format: 'compact',
            xFormat: 'compact'
          },
          datum
        )
    ]
  ])('%s', (_, run) => run())
})
