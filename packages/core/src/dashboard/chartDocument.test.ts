import { describe, expect, it } from 'vitest'

import { validateChartDocument } from './chartDocument'

const sold = [
  { day: '2026-10-01', sold: 120 },
  { day: '2026-10-02', sold: 184 },
  { day: '2026-10-03', sold: 210 }
]

const doc = (extra: Record<string, unknown> = {}) => ({
  version: 1,
  kind: 'chart',
  label: 'Tickets sold',
  source: 'Oztix sales.',
  plot: { kind: 'line', data: sold, x: 'day', y: 'sold' },
  ...extra
})
const withPlot = (plot: Record<string, unknown>) => doc({ plot })
const problemAt = (input: unknown, path: string) =>
  validateChartDocument(input).problems.find((p) => p.path === path)

describe('validateChartDocument', () => {
  it('passes a clean document and returns it', () => {
    const result = validateChartDocument(doc())
    expect(result).toEqual({ ok: true, document: doc(), problems: [] })
  })

  it('never throws on junk', () => {
    for (const junk of [null, 42, 'x', {}, { version: 2 }, { plot: 'no' }])
      expect(validateChartDocument(junk).ok).toBe(false)
  })

  it('needs version 1, the chart kind, a label, a source and a plot', () => {
    for (const key of ['version', 'kind', 'label', 'source', 'plot']) {
      const input: Record<string, unknown> = doc()
      delete input[key]
      expect(problemAt(input, key)?.severity).toBe('error')
    }
    expect(problemAt(doc({ kind: 'table' }), 'kind')).toBeDefined()
  })

  it('rejects dashboard card keys a document has no use for', () => {
    expect(problemAt(doc({ size: 'md' }), '')?.message).toMatch(/size/)
  })

  it('takes a headline value with its format and delta', () => {
    const headline = {
      value: 0.42,
      format: 'percent',
      delta: { value: 0.05, format: 'percent' }
    }
    expect(validateChartDocument(doc(headline)).problems).toEqual([])
  })

  it('rejects a delta that follows a period comparison', () => {
    const delta = { value: 12, comparison: true }
    expect(problemAt(doc({ value: 1842, delta }), 'delta')?.message).toMatch(
      /comparison/
    )
  })

  it('accepts every chart plot kind, static and small multiples among them', () => {
    const plots = [
      { kind: 'bar', data: sold, x: 'day', y: 'sold' },
      { kind: 'ranked-bars', data: sold, x: 'day', y: 'sold' },
      {
        kind: 'stacked-bars',
        data: [{ day: 'Mon', sold: 1, tier: 'GA' }],
        x: 'day',
        y: 'sold',
        series: 'tier'
      },
      {
        kind: 'stacked-area',
        data: [{ day: '2026-10-01', sold: 1, tier: 'GA' }],
        x: 'day',
        y: 'sold',
        series: 'tier'
      },
      { kind: 'histogram', data: sold, x: 'sold' },
      {
        kind: 'funnel',
        steps: [
          { label: 'Viewed', value: 100 },
          { label: 'Bought', value: 20 }
        ]
      },
      {
        kind: 'heatmap',
        data: [{ day: 'Mon', hour: '9am', sold: 4 }],
        rows: 'day',
        columns: 'hour',
        value: 'sold'
      },
      { kind: 'scatter', data: sold, x: 'sold', y: 'sold' },
      {
        kind: 'small-multiples',
        data: sold.map((row) => ({ ...row, venue: 'Kazoo Hollow Room' })),
        by: 'venue',
        chart: { kind: 'line', x: 'day', y: 'sold' }
      },
      { kind: 'static', src: '/sold.svg', alt: 'Sales rise over October' }
    ]
    for (const plot of plots)
      expect(validateChartDocument(withPlot(plot)).problems).toEqual([])
  })

  it('rejects selectsPeriod, since a document has no period', () => {
    for (const kind of ['line', 'bar', 'stacked-area']) {
      const plot = {
        kind,
        data: [{ day: '2026-10-01', sold: 1, tier: 'GA' }],
        x: 'day',
        y: 'sold',
        ...(kind === 'stacked-area' ? { series: 'tier' } : {}),
        selectsPeriod: true
      }
      const problem = problemAt(withPlot(plot), 'plot.selectsPeriod')
      expect(problem).toEqual({
        path: 'plot.selectsPeriod',
        message: 'A chart document has no period for a drag to set',
        severity: 'error'
      })
    }
  })

  it('reports plot fields no row has, with document paths', () => {
    const result = validateChartDocument(
      withPlot({ kind: 'line', data: sold, x: 'day', y: 'revenue' })
    )
    expect(result.ok).toBe(false)
    expect(result.problems).toEqual([
      {
        path: 'plot.y',
        message: 'No row has a "revenue" field',
        severity: 'error'
      }
    ])
  })

  it('warns past the series cap', () => {
    const data = Array.from({ length: 8 }, (_, i) => ({
      day: '2026-10-01',
      sold: i,
      tier: `Tier ${i}`
    }))
    const plot = { kind: 'line', data, x: 'day', y: 'sold', series: 'tier' }
    expect(problemAt(withPlot(plot), 'plot.series')?.severity).toBe('warning')
    expect(validateChartDocument(withPlot(plot)).ok).toBe(true)
  })

  it('warns about an annotation outside the data', () => {
    const plot = {
      kind: 'line',
      data: sold,
      x: 'day',
      y: 'sold',
      annotations: [{ at: '2026-11-20', label: 'On sale' }]
    }
    expect(problemAt(withPlot(plot), 'plot.annotations[0].at')).toBeDefined()
  })

  it('checks the copy in the label, context and takeaways', () => {
    const input = doc({
      label: 'Tickets sold – October',
      context: 'Total Ticket Sales Today',
      takeaway: 'Sales up — again',
      plot: {
        kind: 'line',
        data: sold,
        x: 'day',
        y: 'sold',
        takeaway: 'Sales up - again'
      }
    })
    const paths = validateChartDocument(input).problems.map((p) => p.path)
    expect(paths).toEqual(['label', 'context', 'takeaway', 'plot.takeaway'])
  })

  it('takes a value or a takeaway, not both', () => {
    expect(
      problemAt(doc({ value: 1842, takeaway: 'Sales are up' }), 'takeaway')
    ).toEqual({
      path: 'takeaway',
      message: 'Use a value with a delta, or a takeaway, not both',
      severity: 'error'
    })
  })
})
