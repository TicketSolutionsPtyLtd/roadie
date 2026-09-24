import { describe, expect, it } from 'vitest'

import {
  ANNOTATION_LABEL_LIMIT,
  CHART_PLOT_KINDS,
  chartPlotSchema,
  plotSchema
} from './plots'

const days = [
  { day: '2026-10-01', sold: 120, similar: 110 },
  { day: '2026-10-02', sold: 184, similar: 150 }
]

const valid = {
  line: { kind: 'line', data: days, x: 'day', y: 'sold', target: 0.85 },
  bar: {
    kind: 'bar',
    data: days,
    x: 'day',
    y: 'sold',
    interval: 'day',
    line: { y: 'similar', label: 'Similar shows' }
  },
  'ranked-bars': {
    kind: 'ranked-bars',
    data: [{ channel: 'Email', orders: 420 }],
    x: 'channel',
    y: 'orders',
    limit: 6,
    share: true
  },
  'stacked-bars': {
    kind: 'stacked-bars',
    data: [{ show: 'Fri', type: 'GA', sold: 900 }],
    x: 'show',
    y: 'sold',
    series: 'type',
    mode: 'share'
  },
  histogram: {
    kind: 'histogram',
    data: [{ lead: 12 }, { lead: 30 }],
    x: 'lead',
    binWidth: 7,
    median: true
  },
  funnel: {
    kind: 'funnel',
    steps: [
      { label: 'Viewed event', value: 12000 },
      { label: 'Bought', value: 1464 }
    ]
  },
  heatmap: {
    kind: 'heatmap',
    data: [{ weekday: 'Mon', hour: '7pm', orders: 42 }],
    rows: 'weekday',
    columns: 'hour',
    value: 'orders'
  },
  scatter: {
    kind: 'scatter',
    data: [{ show: 'A', pace: 112, sold: 0.61 }],
    x: 'pace',
    y: 'sold',
    label: 'show',
    xFormat: 'index',
    format: 'percent',
    quadrants: {
      x: 100,
      y: 0.5,
      labels: {
        topLeft: 'Sold, slowing',
        topRight: 'On a roll',
        bottomLeft: 'Needs a push',
        bottomRight: 'Catching up'
      }
    }
  },
  'small-multiples': {
    kind: 'small-multiples',
    data: [{ gate: 'North', time: '2026-11-14T18:00', scans: 120 }],
    by: 'gate',
    chart: { kind: 'bar', x: 'time', y: 'scans', interval: 'hour' }
  }
} as const

describe('chart plot schemas', () => {
  it('has one example per kind', () => {
    expect(Object.keys(valid).sort()).toEqual([...CHART_PLOT_KINDS].sort())
  })

  it.each(Object.entries(valid))('accepts a %s plot', (_, plot) => {
    expect(chartPlotSchema.safeParse(plot).success).toBe(true)
    expect(plotSchema.safeParse(plot).success).toBe(true)
  })

  it('still accepts a static plot', () => {
    expect(
      plotSchema.safeParse({ kind: 'static', src: '/a.svg', alt: 'Pace' })
        .success
    ).toBe(true)
  })

  it('rejects colour props', () => {
    expect(
      chartPlotSchema.safeParse({ ...valid.line, color: '#ff0000' }).success
    ).toBe(false)
  })

  it('rejects pies', () => {
    expect(plotSchema.safeParse({ kind: 'pie', data: [] }).success).toBe(false)
  })

  it('rejects annotations on charts without time along the bottom', () => {
    expect(
      chartPlotSchema.safeParse({
        ...valid['ranked-bars'],
        annotations: [{ at: 'Email', label: 'Launch' }]
      }).success
    ).toBe(false)
  })

  it('caps annotation labels', () => {
    const label = 'x'.repeat(ANNOTATION_LABEL_LIMIT + 1)
    expect(
      chartPlotSchema.safeParse({
        ...valid.line,
        annotations: [{ at: '2026-10-02', label }]
      }).success
    ).toBe(false)
  })

  it('only nests line and bar charts in small multiples', () => {
    expect(
      chartPlotSchema.safeParse({
        ...valid['small-multiples'],
        chart: { kind: 'funnel', steps: valid.funnel.steps }
      }).success
    ).toBe(false)
  })

  it('needs at least two funnel steps', () => {
    expect(
      chartPlotSchema.safeParse({
        kind: 'funnel',
        steps: [{ label: 'Bought', value: 10 }]
      }).success
    ).toBe(false)
  })
})
