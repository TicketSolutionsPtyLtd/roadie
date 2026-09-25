import { createChartScene } from '@tanstack/charts'
import { renderChartSvg as renderSceneSvg } from '@tanstack/charts/svg'
import { describe, expect, it } from 'vitest'

import { plotFrame } from '../plot/frame'
import { hexPaint } from '../plot/paint'
import { OTHER } from '../plot/series'
import { lineChart } from './definition'
import { paceExample, salesByTypeExample } from './examples'
import { lineYExtent, toLinePoints } from './points'
import { lineChartTable } from './table'
import type { LineChartProps } from './types'

const paint = hexPaint('light')
const frame = plotFrame(260, 'default')
const svgOf = (props: LineChartProps) =>
  renderSceneSvg(
    createChartScene(lineChart.build(props, paint, frame), {
      width: 640,
      height: 260
    }),
    { ariaLabel: lineChart.summary(props) }
  )

const keyOf = (id: string) => new RegExp(`data-ts-key="${id}(:[^"]*)?"`)

const strokeOf = (svg: string, id: string) =>
  new RegExp(`data-ts-key="${id}:[^"]*"[^>]*stroke="([^"]+)"`).exec(svg)?.[1]

const forecastDays = (values: number[]) =>
  values.map((sold, i) => ({
    day: `2026-10-${String(i + 1).padStart(2, '0')}`,
    sold,
    low: i >= 2 ? sold - 1 : null,
    high: i >= 2 ? sold + 1 : null
  }))

const plainForecast: LineChartProps = {
  data: forecastDays([4, 5, 6, 7, 8]),
  x: 'day',
  y: 'sold',
  forecast: { from: '2026-10-03', low: 'low', high: 'high' },
  today: '2026-10-03'
}

const multiForecast: LineChartProps = {
  data: ['GA', 'VIP'].flatMap((type, s) =>
    forecastDays([4, 5, 6, 7, 8].map((v) => v * (s + 1))).map((row) => ({
      ...row,
      type
    }))
  ),
  x: 'day',
  y: 'sold',
  series: 'type',
  forecast: { from: '2026-10-03', low: 'low', high: 'high' }
}

const days = (values: (number | null)[]) =>
  values.map((sold, i) => ({
    day: `2026-10-${String(i + 1).padStart(2, '0')}`,
    sold
  }))

describe('lineChart', () => {
  it('draws every reading aid of the pace chart', () => {
    const svg = svgOf(paceExample)
    for (const id of [
      'band',
      'median',
      'cone',
      'forecast-1',
      'series-1',
      'target',
      'today',
      'label-today',
      'label-end',
      'annotation-rules'
    ])
      expect(svg).toMatch(keyOf(id))
  })

  it('keeps focus on the data, not the reading aids', () => {
    const scene = createChartScene(lineChart.build(paceExample, paint, frame), {
      width: 640,
      height: 260
    })
    expect(new Set(scene.points.map((p) => p.markId))).toEqual(
      new Set(['series-1', 'forecast-1'])
    )
    expect(new Set(scene.points.map((p) => p.group))).toEqual(new Set(['Sold']))
  })

  it('lists the point where the forecast starts once in the tooltip', () => {
    const start = { x: 1, y: 0.61, series: 'Sold', index: 30 }
    expect(
      lineChart.tooltip([start, { ...start }], paceExample, paint).rows
    ).toHaveLength(1)
  })

  it('draws the story line at 2px in the highlight', () => {
    const svg = svgOf({ ...paceExample, highlight: 'Sold' })
    expect(svg).toMatch(
      new RegExp(
        `data-ts-key="series-1(:[^"]*)?"[^>]*stroke="${paint.highlight}"[^>]*stroke-width="2"`
      )
    )
  })

  it('sorts rows by x and keeps gaps as gaps', () => {
    const points = toLinePoints({
      data: [...days([1, null, 3])].reverse(),
      x: 'day',
      y: 'sold'
    })
    expect(points.map((p) => p.y)).toEqual([1, null, 3])
    expect(svgOf({ data: days([1, null, 3, 4]), x: 'day', y: 'sold' })).toMatch(
      /series-1:[^"]*segment:1/
    )
  })

  it('adds up a cumulative line', () => {
    expect(
      toLinePoints({
        data: days([1, 2, 3]),
        x: 'day',
        y: 'sold',
        cumulative: true
      }).map((p) => p.y)
    ).toEqual([1, 3, 6])
  })

  it('rolls series past six into Other', () => {
    const data = Array.from({ length: 9 }, (_, s) =>
      days([s, s + 1]).map((r) => ({ ...r, show: `Show ${s}` }))
    ).flat()
    const names = new Set(
      toLinePoints({ data, x: 'day', y: 'sold', series: 'show' }).map(
        (p) => p.series
      )
    )
    expect(names.size).toBe(6)
    expect(names).toContain(OTHER)
  })

  it('asks for the empty state with fewer than two points', () => {
    expect(
      lineChart.emptyMessage({ data: days([4]), x: 'day', y: 'sold' })
    ).toBe('Not enough data yet to show a trend')
    expect(
      lineChart.emptyMessage({ data: days([null, null]), x: 'day', y: 'sold' })
    ).toBeDefined()
    expect(
      lineChart.emptyMessage({ data: days([1, 2]), x: 'day', y: 'sold' })
    ).toBeUndefined()
  })

  it('plots all-zero data on a 0 to 1 axis with no NaN', () => {
    expect(svgOf({ data: days([0, 0, 0]), x: 'day', y: 'sold' })).not.toMatch(
      /NaN|Infinity/
    )
  })

  it('uses compact axis and end labels past 10,000', () => {
    const svg = svgOf({ data: days([12_000, 24_000]), x: 'day', y: 'sold' })
    expect(svg).toContain('>25k<')
    expect(svg).toContain('>24k<')
    expect(svg).not.toContain('>24,000<')
  })

  it('names the plot with the takeaway, or a trend sentence', () => {
    expect(lineChart.summary(paceExample)).toBe(paceExample.takeaway)
    expect(
      lineChart.summary({ data: days([120, 1464]), x: 'day', y: 'sold' })
    ).toBe('Sold rose from 120 to 1,464 between 1 Oct and 2 Oct')
  })

  it('labels series ends and falls back to a legend when they do not fit', () => {
    expect(lineChart.legend(salesByTypeExample, paint, frame)).toEqual([])
    expect(
      lineChart
        .legend(salesByTypeExample, paint, plotFrame(160, 'narrow'))
        .map((i) => i.label)
    ).toEqual(['GA', 'VIP', 'Early bird'])
  })

  it('dots a plain series forecast in its own colour', () => {
    const svg = svgOf(plainForecast)
    const stroke = strokeOf(svg, 'series-1')
    expect(stroke).toBe(paint.categorical[0])
    expect(strokeOf(svg, 'forecast-1')).toBe(stroke)
    expect(svg).toMatch(keyOf('cone'))
    expect(svg).toMatch(
      new RegExp(`data-ts-key="today:[^"]*"[^>]*fill="${stroke}"`)
    )
  })

  it('dots the forecast of every series, with one cone', () => {
    const svg = svgOf(multiForecast)
    for (const slot of [1, 2])
      expect(strokeOf(svg, `forecast-${slot}`)).toBe(
        strokeOf(svg, `series-${slot}`)
      )
    expect(svg.match(/data-ts-key="cone"/g)).toHaveLength(1)
  })

  it('keeps forecast values out of the solid line', () => {
    const scene = createChartScene(
      lineChart.build(multiForecast, paint, frame),
      { width: 640, height: 260 }
    )
    const solidXs = scene.points
      .filter((p) => p.markId === 'series-2')
      .map((p) => Number(p.xValue))
    expect(Math.max(...solidXs)).toBe(Date.UTC(2026, 9, 3))
  })

  it('makes room for the forecast cone', () => {
    expect(
      lineYExtent({ ...plainForecast, data: forecastDays([4, 5, 8]) })
    ).toEqual([0, 10])
  })

  it('keeps focus on the line when it is filled', () => {
    const scene = createChartScene(
      lineChart.build(
        { data: days([1, 2, 3]), x: 'day', y: 'sold', area: true },
        paint,
        frame
      ),
      { width: 640, height: 260 }
    )
    expect(new Set(scene.points.map((p) => p.markId))).toEqual(
      new Set(['series-1'])
    )
  })

  it('cues a forecast in the tooltip and in words', () => {
    const point = { x: Date.UTC(2026, 9, 5), y: 8, series: 'Sold', index: 4 }
    expect(
      lineChart.tooltip([point], plainForecast, paint).rows[0]
    ).toMatchObject({
      label: 'Sold forecast'
    })
    expect(lineChart.describe(point, plainForecast)).toBe(
      'Monday 5 October, 8 sold, forecast'
    )
  })

  it('says the series name as written', () => {
    expect(
      lineChart.describe(
        { x: Date.UTC(2026, 2, 10), y: 92, series: 'GA', index: 0 },
        salesByTypeExample
      )
    ).toBe('Tuesday 10 March, 92 orders, GA')
  })

  it('speaks a point in plain words', () => {
    expect(
      lineChart.describe(
        { x: Date.UTC(2026, 2, 10), y: 184, series: 'Orders', index: 0 },
        {
          data: [{ day: '2026-03-10', orders: 184 }],
          x: 'day',
          y: 'orders'
        }
      )
    ).toBe('Tuesday 10 March, 184 orders')
  })

  it('honours a shared y domain', () => {
    const svg = renderSceneSvg(
      createChartScene(
        lineChart.build(
          { data: days([1, 2]), x: 'day', y: 'sold' },
          paint,
          plotFrame(160, 'default', [0, 100])
        ),
        { width: 400, height: 160 }
      ),
      { ariaLabel: 'x' }
    )
    expect(svg).toContain('>100<')
  })
})

describe('lineChartTable', () => {
  it('has the x column, each series and the band', () => {
    const table = lineChartTable(paceExample)
    expect(table.columns.map((c) => c.header)).toEqual([
      'Day',
      'Sold',
      'Forecast',
      'Similar shows',
      'Similar shows range'
    ])
    expect(table.rows[0]).toMatchObject({
      day: 'Sun 16 Aug',
      bandMedian: 0.14,
      bandRange: '7% to 22%'
    })
  })

  it('leaves the cells blank where the forecast or the actuals do not apply', () => {
    const table = lineChartTable({
      ...plainForecast,
      data: plainForecast.data.map((row, i) =>
        i === 3 ? { ...row, sold: null } : row
      )
    })
    expect(table.rows.map((row) => [row.sold, row.Forecast])).toEqual([
      [4, ''],
      [5, ''],
      [6, ''],
      ['', null],
      ['', 8]
    ])
  })

  it('keeps full values', () => {
    const table = lineChartTable({
      data: days([12_345, 24_000]),
      x: 'day',
      y: 'sold',
      format: 'compact'
    })
    expect(table.columns[1]).toMatchObject({ key: 'sold', format: 'number' })
    expect(table.rows[0]!.sold).toBe(12_345)
  })

  it('has a forecast column for every forecasting series', () => {
    const table = lineChartTable(multiForecast)
    expect(table.columns.map((c) => c.header)).toEqual([
      'Day',
      'GA',
      'VIP',
      'GA forecast',
      'VIP forecast'
    ])
    expect(table.rows[4]).toMatchObject({
      'GA forecast': 8,
      'VIP forecast': 16
    })
    expect(table.rows[4]!.VIP).toBe('')
  })

  it('has one column per series', () => {
    expect(
      lineChartTable(salesByTypeExample).columns.map((c) => c.header)
    ).toEqual(['Day', 'GA', 'VIP', 'Early bird'])
  })
})
