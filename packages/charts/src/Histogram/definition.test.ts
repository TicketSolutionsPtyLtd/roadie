import { createChartScene } from '@tanstack/charts'
import { renderChartSvg as renderSceneSvg } from '@tanstack/charts/svg'
import { describe, expect, it } from 'vitest'

import { plotFrame } from '../plot/frame'
import { hexPaint } from '../plot/paint'
import { binValues, histogramValues } from './bin'
import { histogram } from './definition'
import { leadTimeExample, orderSizeExample } from './examples'
import { histogramTable } from './table'
import type { HistogramProps } from './types'

const paint = hexPaint('light')
const sceneOf = (props: HistogramProps) =>
  createChartScene(histogram.build(props, paint, plotFrame(220, 'default')), {
    width: 560,
    height: 220
  })
const svgOf = (props: HistogramProps) =>
  renderSceneSvg(sceneOf(props), { ariaLabel: 'x' })
const svg = svgOf(leadTimeExample)

describe('histogram', () => {
  it('draws bins under series-1 from zero', () => {
    expect(svg).toMatch(/data-ts-key="series-1(:[^"]*)?"/)
    expect(svg).toContain('>0<')
  })

  it('draws a labelled dashed median', () => {
    expect(svg).toMatch(/data-ts-key="median(:[^"]*)?"/)
    expect(svg).toMatch(/data-ts-key="label-median[^"]*"[^>]*>Median 12</)
  })

  it('focuses only the bins, one stop each', () => {
    const points = sceneOf(leadTimeExample).points
    const bins = binValues(histogramValues(leadTimeExample), leadTimeExample)
    expect(new Set(points.map((p) => p.markId))).toEqual(new Set(['series-1']))
    expect(points).toHaveLength(bins.length)
  })

  it('leaves the median out when not asked for', () => {
    expect(svgOf({ ...leadTimeExample, median: false })).not.toMatch(
      /data-ts-key="(label-)?median/
    )
  })

  it('shortens the median label past 10,000', () => {
    const prices = svgOf({
      data: [{ spend: 20_000 }, { spend: 24_000 }, { spend: 28_000 }],
      x: 'spend',
      bins: 2,
      median: true
    })
    expect(prices).toMatch(/>Median 24k</)
  })

  it('names the plot, and speaks a bin', () => {
    expect(
      histogram.summary({ ...orderSizeExample, takeaway: undefined })
    ).toBe('The median is 2 tickets, and the most common is 2 tickets')
    expect(histogram.summary({ ...leadTimeExample, takeaway: undefined })).toBe(
      'The median is 12 days, and the most common is 0 to 6 days'
    )
    const spoken = histogram.describe(
      { x: 7, y: 120, series: 'Days', index: 1 },
      leadTimeExample
    )
    const match = /^7 to 13 days, (\d+) of (\d+)$/.exec(spoken)
    const bins = binValues(histogramValues(leadTimeExample), leadTimeExample)
    expect(match?.slice(1).map(Number)).toEqual([
      bins.find((b) => b.from === 7)!.count,
      612
    ])
  })

  it('adds a unit only when the field names something counted', () => {
    const spend = {
      data: [10, 24, 24, 40].map((spend) => ({ spend })),
      x: 'spend'
    }
    expect(histogram.summary(spend)).toMatch(/^The median is 24, and/)
    expect(histogram.summary(spend)).not.toMatch(/spends/)
    const hours = { data: [1, 2, 2, 5].map((hour) => ({ hour })), x: 'hour' }
    expect(histogram.summary(hours)).toMatch(/^The median is 2 hours/)
  })

  it('names the maximum in a last bin that closes on it', () => {
    const days = {
      data: Array.from({ length: 41 }, (_, days) => ({ days })),
      x: 'days',
      bins: 4
    }
    expect(histogramTable(days).rows.map((r) => r.range)).toEqual([
      '0 to 9',
      '10 to 19',
      '20 to 29',
      '30 to 40'
    ])
  })

  it('shows the tooltip for a bin', () => {
    const tip = histogram.tooltip(
      [{ x: 7, y: 120, series: 'Days', index: 1 }],
      leadTimeExample,
      paint
    )
    expect(tip.title).toBe('7 to 13 days')
    expect(tip.rows[0]).toMatchObject({ label: 'Count' })
  })

  it('asks for the empty state with fewer than two values', () => {
    expect(histogram.emptyMessage({ data: [{ d: 3 }], x: 'd' })).toBe(
      'Not enough data yet to show a spread'
    )
    expect(histogram.emptyMessage(leadTimeExample)).toBeUndefined()
  })

  it('survives no data at all', () => {
    const empty = { data: [], x: 'days' }
    expect(histogram.summary(empty)).toBe('Spread of days')
    expect(histogram.emptyMessage(empty)).toBe(
      'Not enough data yet to show a spread'
    )
    expect(histogramTable(empty).rows).toEqual([])
    expect(svgOf(empty)).not.toContain('NaN')
  })

  it('has no legend', () => {
    expect(
      histogram.legend(leadTimeExample, paint, plotFrame(220, 'default'))
    ).toEqual([])
  })
})

describe('histogramTable', () => {
  it('lists each range and its count', () => {
    const table = histogramTable(orderSizeExample)
    expect(table.columns.map((c) => c.header)).toEqual(['Tickets', 'Count'])
    expect(table.rows.map((r) => r.range)).toEqual([
      '1',
      '2',
      '3',
      '4',
      '5',
      '6'
    ])
  })

  it('counts every value', () => {
    const rows = histogramTable(leadTimeExample).rows
    expect(rows.reduce((s, r) => s + Number(r.count), 0)).toBe(612)
  })
})

describe('histogram bins for whole numbers', () => {
  it('speaks a one-value bin as that value', () => {
    expect(
      histogram.describe(
        { x: 1, y: 80, series: 'Tickets', index: 0 },
        orderSizeExample
      )
    ).toMatch(/^1 ticket, \d+ of 480$/)
  })

  it('labels the axis under each bar and puts the median in its bar', () => {
    const order = svgOf(orderSizeExample)
    expect(order).toMatch(/data-ts-key="x-tick-label:number:1\.5"[^>]*>1</)
    expect(order).toContain('data-ts-key="median:number:2.5')
  })
})
