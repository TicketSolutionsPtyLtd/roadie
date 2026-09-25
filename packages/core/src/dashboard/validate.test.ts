import { describe, expect, it } from 'vitest'

import { CHART_LABEL_LIMITS, COPY_LIMITS } from './layout'
import { validateDashboard } from './validate'

const stat = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  kind: 'stat',
  size: 'stat',
  label: 'Tickets sold',
  value: 1842,
  ...extra
})
const spec = (cards: unknown[]) => ({
  version: 1,
  title: 'Show',
  sections: [{ title: 'At a glance', cards }]
})
const four = [stat('a'), stat('b'), stat('c'), stat('d')]
const paths = (input: unknown) =>
  validateDashboard(input).problems.map((p) => p.path)

describe('validateDashboard', () => {
  it('passes a clean description', () => {
    const result = validateDashboard(spec(four))
    expect(result.ok).toBe(true)
    expect(result.problems).toEqual([])
  })

  it('never throws on junk', () => {
    for (const junk of [null, 42, 'x', { version: 2 }, { sections: 'no' }])
      expect(validateDashboard(junk).ok).toBe(false)
  })

  it('reports schema problems with paths', () => {
    expect(paths(spec([{ ...stat('a'), kind: 'pie' }]))).toContain(
      'sections[0].cards[0].kind'
    )
  })

  it('reports duplicate ids', () => {
    const result = validateDashboard(
      spec([stat('a'), stat('a'), stat('b'), stat('c')])
    )
    expect(result.ok).toBe(false)
    expect(result.problems).toContainEqual(
      expect.objectContaining({
        path: 'sections[0].cards[1].id',
        severity: 'error'
      })
    )
  })

  it('checks sizes per kind', () => {
    expect(paths(spec([stat('a', { size: 'lg' })]))).toContain(
      'sections[0].cards[0].size'
    )
    expect(
      paths(
        spec([
          { id: 'n', kind: 'note', size: 'stat', label: 'Note', body: 'Text' }
        ])
      )
    ).toContain('sections[0].cards[0].size')
  })

  it('warns about row gaps', () => {
    const result = validateDashboard(spec([stat('a'), stat('b'), stat('c')]))
    expect(result.ok).toBe(true)
    expect(result.problems[0]).toMatchObject({
      path: 'sections[0]',
      severity: 'warning'
    })
    expect(result.problems[0]!.message).toMatch(/desktop/)
  })

  it('rejects a headline with both value and takeaway', () => {
    const chart = {
      id: 'p',
      kind: 'chart',
      size: 'full',
      label: 'Sales pace',
      value: 1,
      takeaway: 'Ahead of similar shows',
      plot: { kind: 'static', src: '/p.svg', alt: 'Pace' },
      table: { columns: [{ key: 'a', header: 'A', kind: 'number' }], rows: [] },
      source: 'Oztix sales.'
    }
    expect(paths(spec([chart]))).toContain('sections[0].cards[0].takeaway')
  })

  it('limits visual columns to two', () => {
    const table = {
      id: 't',
      kind: 'table',
      size: 'full',
      label: 'Upcoming shows',
      takeaway: 'Two shows are behind',
      source: 'Oztix sales.',
      columns: ['a', 'b', 'c'].map((key) => ({
        key,
        header: key,
        kind: 'sparkline'
      })),
      rows: []
    }
    expect(paths(spec([table]))).toContain('sections[0].cards[0].columns')
  })

  it('warns when copy will truncate at its size', () => {
    const result = validateDashboard(
      spec([
        stat('a', { label: 'Tickets sold across every venue' }),
        stat('b'),
        stat('c'),
        stat('d')
      ])
    )
    expect(result.problems).toContainEqual(
      expect.objectContaining({
        path: 'sections[0].cards[0].label',
        severity: 'warning'
      })
    )
  })

  it('warns when a chart label exceeds the chart limit but not COPY_LIMITS', () => {
    const label = 'Sales pace vs similar shows'
    expect(label.length).toBeLessThanOrEqual(COPY_LIMITS.md.label)
    expect(label.length).toBeGreaterThan(CHART_LABEL_LIMITS.md)
    const chart = {
      id: 'p',
      kind: 'chart',
      size: 'md',
      label,
      plot: { kind: 'static', src: '/p.svg', alt: 'Pace' },
      table: { columns: [{ key: 'a', header: 'A', kind: 'number' }], rows: [] },
      source: 'Oztix sales.'
    }
    const result = validateDashboard(spec([chart]))
    expect(result.problems).toContainEqual(
      expect.objectContaining({
        path: 'sections[0].cards[0].label',
        severity: 'warning'
      })
    )
  })

  it('flags dashes and title case in copy', () => {
    const cards = [
      stat('a', { context: 'This week — up' }),
      stat('b', { label: 'Tickets Sold Today' }),
      stat('c'),
      stat('d')
    ]
    expect(paths(spec(cards))).toEqual(
      expect.arrayContaining([
        'sections[0].cards[0].context',
        'sections[0].cards[1].label'
      ])
    )
  })
})

const chartCard = (plot: Record<string, unknown>, extra = {}) => ({
  id: 'pace',
  kind: 'chart',
  size: 'full',
  label: 'Sales pace',
  source: 'Oztix sales.',
  plot,
  ...extra
})
const rows = [
  { day: '2026-10-01', sold: 120, channel: 'Email' },
  { day: '2026-10-02', sold: 184, channel: 'Social' }
]

describe('validateDashboard with chart plots', () => {
  it('passes a line plot with no table', () => {
    const result = validateDashboard(
      spec([chartCard({ kind: 'line', data: rows, x: 'day', y: 'sold' })])
    )
    expect(result.problems).toEqual([])
    expect(result.ok).toBe(true)
  })

  it('names a field no row has', () => {
    expect(
      paths(
        spec([chartCard({ kind: 'line', data: rows, x: 'day', y: 'orders' })])
      )
    ).toContain('sections[0].cards[0].plot.y')
  })

  it('checks nested fields such as the band', () => {
    expect(
      paths(
        spec([
          chartCard({
            kind: 'line',
            data: rows,
            x: 'day',
            y: 'sold',
            band: { low: 'low', high: 'high' }
          })
        ])
      )
    ).toEqual(
      expect.arrayContaining([
        'sections[0].cards[0].plot.band.low',
        'sections[0].cards[0].plot.band.high'
      ])
    )
  })

  it('needs a table for a static plot', () => {
    expect(
      paths(spec([chartCard({ kind: 'static', src: '/a.svg', alt: 'Pace' })]))
    ).toContain('sections[0].cards[0].table')
  })

  it('rejects bins and binWidth together', () => {
    expect(
      paths(
        spec([
          chartCard({
            kind: 'histogram',
            data: [{ lead: 3 }],
            x: 'lead',
            bins: 10,
            binWidth: 7
          })
        ])
      )
    ).toContain('sections[0].cards[0].plot.bins')
  })

  it('warns when series will roll into Other', () => {
    const many = Array.from({ length: 8 }, (_, i) => ({
      day: '2026-10-01',
      sold: i,
      show: `Show ${i}`
    }))
    const result = validateDashboard(
      spec([
        chartCard({
          kind: 'line',
          data: many,
          x: 'day',
          y: 'sold',
          series: 'show'
        })
      ])
    )
    expect(result.problems).toContainEqual(
      expect.objectContaining({
        path: 'sections[0].cards[0].plot.series',
        severity: 'warning'
      })
    )
  })

  it('checks annotation copy', () => {
    expect(
      paths(
        spec([
          chartCard({
            kind: 'line',
            data: rows,
            x: 'day',
            y: 'sold',
            annotations: [{ at: '2026-10-02', label: 'Line-up - drop' }]
          })
        ])
      )
    ).toContain('sections[0].cards[0].plot.annotations[0].label')
  })
})

describe('validateDashboard checks every chart plot kind', () => {
  it('line: valid passes, invalid names the missing field', () => {
    expect(
      validateDashboard(
        spec([chartCard({ kind: 'line', data: rows, x: 'day', y: 'sold' })])
      ).ok
    ).toBe(true)
    expect(
      paths(
        spec([chartCard({ kind: 'line', data: rows, x: 'day', y: 'orders' })])
      )
    ).toContain('sections[0].cards[0].plot.y')
  })

  it('bar: valid passes, invalid names the missing field', () => {
    expect(
      validateDashboard(
        spec([chartCard({ kind: 'bar', data: rows, x: 'day', y: 'sold' })])
      ).ok
    ).toBe(true)
    expect(
      paths(
        spec([
          chartCard({
            kind: 'bar',
            data: rows,
            x: 'day',
            y: 'sold',
            line: { y: 'similar', label: 'Similar shows' }
          })
        ])
      )
    ).toContain('sections[0].cards[0].plot.line.y')
  })

  it('ranked-bars: valid passes, invalid names the missing field', () => {
    const rankedRows = [
      { channel: 'Email', orders: 420 },
      { channel: 'Social', orders: 210 }
    ]
    expect(
      validateDashboard(
        spec([
          chartCard({
            kind: 'ranked-bars',
            data: rankedRows,
            x: 'channel',
            y: 'orders'
          })
        ])
      ).ok
    ).toBe(true)
    expect(
      paths(
        spec([
          chartCard({
            kind: 'ranked-bars',
            data: rankedRows,
            x: 'channel',
            y: 'orders',
            reference: { field: 'target', label: 'Target' }
          })
        ])
      )
    ).toContain('sections[0].cards[0].plot.reference.field')
  })

  it('stacked-bars: valid passes, invalid names the missing field', () => {
    const stackedRows = [
      { show: 'Fri', type: 'GA', sold: 900 },
      { show: 'Sat', type: 'VIP', sold: 400 }
    ]
    expect(
      validateDashboard(
        spec([
          chartCard({
            kind: 'stacked-bars',
            data: stackedRows,
            x: 'show',
            y: 'sold',
            series: 'type'
          })
        ])
      ).ok
    ).toBe(true)
    expect(
      paths(
        spec([
          chartCard({
            kind: 'stacked-bars',
            data: stackedRows,
            x: 'show',
            y: 'sold',
            series: 'category'
          })
        ])
      )
    ).toContain('sections[0].cards[0].plot.series')
  })

  it('histogram: valid passes, invalid rejects bins and binWidth together', () => {
    const leadRows = [{ lead: 3 }, { lead: 12 }]
    expect(
      validateDashboard(
        spec([
          chartCard({ kind: 'histogram', data: leadRows, x: 'lead', bins: 5 })
        ])
      ).ok
    ).toBe(true)
    expect(
      paths(
        spec([
          chartCard({
            kind: 'histogram',
            data: leadRows,
            x: 'lead',
            bins: 10,
            binWidth: 7
          })
        ])
      )
    ).toContain('sections[0].cards[0].plot.bins')
  })

  it('funnel: valid passes, invalid flags copy in the takeaway', () => {
    const steps = [
      { label: 'Visited', value: 1000 },
      { label: 'Purchased', value: 400 }
    ]
    expect(
      validateDashboard(spec([chartCard({ kind: 'funnel', steps })])).ok
    ).toBe(true)
    expect(
      paths(
        spec([
          chartCard({
            kind: 'funnel',
            steps,
            takeaway: 'Conversion Rate Drop'
          })
        ])
      )
    ).toContain('sections[0].cards[0].plot.takeaway')
  })

  it('heatmap: valid passes, invalid names the missing field', () => {
    const heatmapRows = [
      { day: 'Mon', hour: '10am', sales: 4 },
      { day: 'Tue', hour: '11am', sales: 8 }
    ]
    expect(
      validateDashboard(
        spec([
          chartCard({
            kind: 'heatmap',
            data: heatmapRows,
            rows: 'day',
            columns: 'hour',
            value: 'sales'
          })
        ])
      ).ok
    ).toBe(true)
    expect(
      paths(
        spec([
          chartCard({
            kind: 'heatmap',
            data: heatmapRows,
            rows: 'day',
            columns: 'hour',
            value: 'total'
          })
        ])
      )
    ).toContain('sections[0].cards[0].plot.value')
  })

  it('scatter: valid passes, invalid names the missing field', () => {
    const scatterRows = [
      { price: 45, sold: 120 },
      { price: 60, sold: 90 }
    ]
    expect(
      validateDashboard(
        spec([
          chartCard({
            kind: 'scatter',
            data: scatterRows,
            x: 'price',
            y: 'sold'
          })
        ])
      ).ok
    ).toBe(true)
    expect(
      paths(
        spec([
          chartCard({
            kind: 'scatter',
            data: scatterRows,
            x: 'price',
            y: 'sold',
            size: 'orders'
          })
        ])
      )
    ).toContain('sections[0].cards[0].plot.size')
  })

  it('small-multiples: valid passes, invalid names the missing field', () => {
    const venueRows = [
      { venue: 'The Lantern Room', day: '2026-10-01', sold: 120 },
      { venue: 'Harbourside Hall', day: '2026-10-02', sold: 90 }
    ]
    expect(
      validateDashboard(
        spec([
          chartCard({
            kind: 'small-multiples',
            data: venueRows,
            by: 'venue',
            chart: { kind: 'line', x: 'day', y: 'sold' }
          })
        ])
      ).ok
    ).toBe(true)
    expect(
      paths(
        spec([
          chartCard({
            kind: 'small-multiples',
            data: venueRows,
            by: 'venue',
            chart: { kind: 'line', x: 'day', y: 'orders' }
          })
        ])
      )
    ).toContain('sections[0].cards[0].plot.chart.y')
  })

  it('static: valid passes with a table, invalid needs a table', () => {
    expect(
      validateDashboard(
        spec([
          chartCard(
            { kind: 'static', src: '/a.svg', alt: 'Pace' },
            {
              table: {
                columns: [{ key: 'a', header: 'A', kind: 'number' }],
                rows: []
              }
            }
          )
        ])
      ).ok
    ).toBe(true)
    expect(
      paths(spec([chartCard({ kind: 'static', src: '/a.svg', alt: 'Pace' })]))
    ).toContain('sections[0].cards[0].table')
  })
})

describe('validateDashboard checks annotations against the data', () => {
  const hourly = [
    { time: '2026-08-03T09:00', orders: 1840 },
    { time: '2026-08-03T10:00', orders: 920 }
  ]
  const problemsAt = (plot: Record<string, unknown>) =>
    validateDashboard(spec([chartCard(plot)])).problems.filter((p) =>
      p.path.endsWith('.at')
    )

  it('accepts an ISO time with an offset inside the bars', () => {
    expect(
      problemsAt({
        kind: 'bar',
        data: hourly,
        x: 'time',
        y: 'orders',
        interval: 'hour',
        annotations: [{ at: '2026-08-03T10:30:00+10:00', label: 'Presale' }]
      })
    ).toEqual([])
  })

  it('warns on a date outside hourly data', () => {
    expect(
      problemsAt({
        kind: 'bar',
        data: hourly,
        x: 'time',
        y: 'orders',
        interval: 'hour',
        annotations: [{ at: '2026-08-04', label: 'Presale' }]
      })
    ).toEqual([
      expect.objectContaining({
        path: 'sections[0].cards[0].plot.annotations[0].at',
        severity: 'warning'
      })
    ])
  })

  it('warns on a line annotation past the last point', () => {
    expect(
      problemsAt({
        kind: 'line',
        data: rows,
        x: 'day',
        y: 'sold',
        annotations: [{ at: '2026-10-09', label: 'Line-up drop' }]
      })
    ).toHaveLength(1)
  })

  it('warns on a category that no bar has', () => {
    expect(
      problemsAt({
        kind: 'bar',
        data: rows,
        x: 'channel',
        y: 'sold',
        annotations: [{ at: 'Radio', label: 'New ad' }]
      })
    ).toHaveLength(1)
  })

  it('checks the annotations of a small multiples chart', () => {
    const result = validateDashboard(
      spec([
        chartCard({
          kind: 'small-multiples',
          data: rows.map((row) => ({ ...row, gate: 'North' })),
          by: 'gate',
          chart: {
            kind: 'line',
            x: 'day',
            y: 'sold',
            annotations: [{ at: 'soon', label: 'Doors - open' }]
          }
        })
      ])
    )
    expect(result.problems.map((p) => p.path)).toEqual(
      expect.arrayContaining([
        'sections[0].cards[0].plot.chart.annotations[0].at',
        'sections[0].cards[0].plot.chart.annotations[0].label'
      ])
    )
  })
})

describe('validateDashboard checks repeated names', () => {
  const problemsOf = (plot: Record<string, unknown>) =>
    validateDashboard(spec([chartCard(plot)])).problems

  it('rejects repeated funnel step labels', () => {
    expect(
      problemsOf({
        kind: 'funnel',
        steps: [
          { label: 'Viewed', value: 100 },
          { label: 'Paid', value: 20 },
          { label: 'Paid', value: 10 }
        ]
      })
    ).toContainEqual({
      path: 'sections[0].cards[0].plot.steps',
      message: 'Step labels must differ. "Paid" repeats',
      severity: 'error'
    })
  })

  it('warns that repeated ranked names add up', () => {
    expect(
      problemsOf({
        kind: 'ranked-bars',
        data: [
          { channel: 'Email', orders: 5 },
          { channel: 'Email', orders: 3 }
        ],
        x: 'channel',
        y: 'orders'
      })
    ).toContainEqual(
      expect.objectContaining({
        path: 'sections[0].cards[0].plot.x',
        severity: 'warning'
      })
    )
  })

  it('warns that repeated bar keys add up, by wall time', () => {
    expect(
      problemsOf({
        kind: 'bar',
        data: [
          { day: '2026-10-01', orders: 5 },
          { day: '2026-10-02', orders: 2 },
          { day: '2026-10-01T00:00', orders: 3 }
        ],
        x: 'day',
        y: 'orders'
      })
    ).toContainEqual({
      path: 'sections[0].cards[0].plot.x',
      message: '"2026-10-01" appears more than once. Its rows will add up',
      severity: 'warning'
    })
  })

  it('warns that a repeated bar key keeps its first line value', () => {
    expect(
      problemsOf({
        kind: 'bar',
        data: [
          { hour: '2026-11-14 18:00', scans: 40, inside: 0.2 },
          { hour: '2026-11-14T18:00', scans: 60, inside: 0.5 }
        ],
        x: 'hour',
        y: 'scans',
        line: { y: 'inside', label: 'Inside', format: 'percent' }
      })
    ).toContainEqual({
      path: 'sections[0].cards[0].plot.x',
      message:
        '"2026-11-14 18:00" appears more than once. Its bars will add up and its line keeps the first value',
      severity: 'warning'
    })
  })

  it('warns on repeated bar keys within a small multiples panel only', () => {
    const plot = (gates: string[]) => ({
      kind: 'small-multiples',
      data: gates.map((gate) => ({ gate, hour: '2026-11-14T18:00', scans: 4 })),
      by: 'gate',
      chart: { kind: 'bar', x: 'hour', y: 'scans' }
    })
    expect(
      problemsOf(plot(['North', 'South'])).map((p) => p.path)
    ).not.toContain('sections[0].cards[0].plot.chart.x')
    expect(problemsOf(plot(['North', 'North']))).toContainEqual(
      expect.objectContaining({
        path: 'sections[0].cards[0].plot.chart.x',
        severity: 'warning'
      })
    )
  })

  it('warns that repeated heatmap cells add up', () => {
    expect(
      problemsOf({
        kind: 'heatmap',
        data: [
          { day: 'Fri', hour: '9pm', orders: 4 },
          { day: 'Fri', hour: '9pm', orders: 3 }
        ],
        rows: 'day',
        columns: 'hour',
        value: 'orders'
      })
    ).toContainEqual(
      expect.objectContaining({
        path: 'sections[0].cards[0].plot.data',
        message: 'More than one row for "Fri, 9pm". Their values will add up',
        severity: 'warning'
      })
    )
  })
})
