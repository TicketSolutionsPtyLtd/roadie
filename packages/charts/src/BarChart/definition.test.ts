import { createChartScene } from '@tanstack/charts'
import { renderChartSvg as renderSceneSvg } from '@tanstack/charts/svg'
import { describe, expect, it } from 'vitest'

import { plotFrame } from '../plot/frame'
import { hexPaint } from '../plot/paint'
import { barYExtent } from './bars'
import { barChart } from './definition'
import {
  comparisonExample,
  dailyOrdersExample,
  onSaleExample,
  scanRateExample
} from './examples'
import { barChartTable } from './table'
import type { BarChartProps } from './types'

const paint = hexPaint('light')
const sceneOf = (props: BarChartProps, frame = plotFrame(220, 'default')) =>
  createChartScene(barChart.build(props, paint, frame), {
    width: 640,
    height: frame.height
  })
const svgOf = (props: BarChartProps, frame = plotFrame(220, 'default')) =>
  renderSceneSvg(sceneOf(props, frame), {
    ariaLabel: barChart.summary(props)
  })

describe('barChart', () => {
  it('draws one bar per x under the series-1 key', () => {
    const svg = svgOf(dailyOrdersExample)
    expect(svg).toMatch(/data-ts-key="series-1(:[^"]*)?"/)
    expect(svg.match(/<path[^>]*data-ts-key="series-1:[^"]*"/g)).toHaveLength(
      dailyOrdersExample.data.length
    )
  })

  it('draws the second measure as a labelled line', () => {
    const svg = svgOf(scanRateExample)
    expect(svg).toMatch(/data-ts-key="line(:[^"]*)?"/)
    expect(svg).toMatch(/data-ts-key="label-line[^"]*"[^>]*>Inside 69%</)
  })

  it('cases the line in the surface paint beneath it', () => {
    const svg = svgOf(scanRateExample)
    const underlay = svg.search(/<path[^>]*data-ts-key="line-underlay:/)
    const line = svg.search(/<path[^>]*data-ts-key="line:/)
    expect(underlay).toBeGreaterThan(-1)
    expect(underlay).toBeLessThan(line)
    expect(svg).toMatch(
      new RegExp(
        `data-ts-key="line-underlay:[^"]*"[^>]*stroke="${paint.surface}"`
      )
    )
  })

  it('runs a percent line against the whole', () => {
    const lineTop = (props: BarChartProps) => sceneOf(props).scales.line?.domain
    expect(lineTop(scanRateExample)).toEqual([0, 1])
    expect(
      lineTop({
        ...scanRateExample,
        line: { y: 'inside', label: 'Inside', format: 'number' }
      })
    ).not.toEqual([0, 1])
  })

  it('focuses only the bars, one stop per x', () => {
    const scene = sceneOf(scanRateExample)
    expect(new Set(scene.points.map((p) => p.markId))).toEqual(
      new Set(['series-1'])
    )
    expect(scene.points).toHaveLength(scanRateExample.data.length)
  })

  it('annotates the on-sale', () => {
    const svg = svgOf(onSaleExample)
    expect(svg).toMatch(/data-ts-key="annotation-rules(:[^"]*)?"/)
    expect(svg).toContain('>General on-sale<')
  })

  it('labels hours as times and days as dates', () => {
    expect(svgOf(onSaleExample)).toContain('>09:00<')
    expect(svgOf(dailyOrdersExample)).toContain('>3 Oct<')
  })

  it('thins the time ticks on a phone', () => {
    const ticks = (band: 'narrow' | 'default') =>
      svgOf(onSaleExample, plotFrame(220, band)).match(
        /data-ts-key="x-tick-label:/g
      )?.length
    expect(ticks('default')).toBe(5)
    expect(ticks('narrow')).toBe(3)
  })

  it('honours a shared y domain', () => {
    expect(
      svgOf(dailyOrdersExample, plotFrame(160, 'default', [0, 1000]))
    ).toContain('>1,000<')
  })

  it('compacts the axis and line label past 10,000', () => {
    const svg = svgOf({
      data: [
        { d: '2026-10-01', v: 12_000, w: 24_000 },
        { d: '2026-10-02', v: 25_000, w: 24_500 }
      ],
      x: 'd',
      y: 'v',
      line: { y: 'w', label: 'Total' }
    })
    expect(svg).toContain('>25k<')
    expect(svg).toContain('>Total 24.5k<')
  })

  it('draws zero-height bars without NaN', () => {
    const svg = svgOf({
      data: [
        { d: '2026-10-01', v: 0 },
        { d: '2026-10-02', v: 0 }
      ],
      x: 'd',
      y: 'v'
    })
    expect(svg).not.toContain('NaN')
  })

  it('keeps category order for text x values', () => {
    const svg = svgOf({
      data: [
        { release: 'Early bird', minutes: 4 },
        { release: 'Release 1', minutes: 38 },
        { release: 'Release 2', minutes: 190 }
      ],
      x: 'release',
      y: 'minutes'
    })
    const early = svg.indexOf('>Early bird<')
    expect(early).toBeGreaterThan(-1)
    expect(svg.indexOf('>Release 2<')).toBeGreaterThan(early)
  })

  it('names the plot by the takeaway, or the peak', () => {
    expect(barChart.summary(onSaleExample)).toBe(onSaleExample.takeaway)
    expect(barChart.summary({ ...onSaleExample, takeaway: undefined })).toBe(
      'Orders peaked at 1,840 on Mon 3 Aug 2026, 9:00am'
    )
    expect(
      barChart.summary({ ...dailyOrdersExample, takeaway: undefined })
    ).toBe('Orders peaked at 21 on Fri 9 Oct 2026')
    expect(barChart.summary({ data: [], x: 'd', y: 'v' })).toBe('V by day')
  })

  it('asks for the empty state when no bar has a value', () => {
    expect(
      barChart.emptyMessage({
        data: [{ d: '2026-10-01', v: null }],
        x: 'd',
        y: 'v'
      })
    ).toBe('Nothing to show for this period yet')
    expect(barChart.emptyMessage(dailyOrdersExample)).toBeUndefined()
  })

  it('has no legend', () => {
    expect(
      barChart.legend(scanRateExample, paint, plotFrame(220, 'narrow'))
    ).toEqual([])
  })

  it('speaks a bar with its time', () => {
    expect(
      barChart.describe(
        { x: '2026-08-03T09:00', y: 1840, series: 'Orders', index: 0 },
        onSaleExample
      )
    ).toBe('Monday, 3 August 2026, 9:00am, 1,840 orders')
  })

  it('speaks the second measure with the bar', () => {
    expect(
      barChart.describe(
        { x: '2026-11-14T18:00', y: 300, series: 'Scans', index: 4 },
        scanRateExample
      )
    ).toBe('Saturday, 14 November 2026, 6:00pm, 300 scans, inside 37%')
  })

  it('shows both measures in the tooltip', () => {
    expect(
      barChart.tooltip(
        [{ x: '2026-11-14T18:00', y: 300, series: 'Scans', index: 4 }],
        scanRateExample,
        paint
      )
    ).toEqual({
      title: 'Sat 14 Nov 2026, 6:00pm',
      rows: [
        {
          label: 'Scans',
          value: '300',
          color: paint.categorical[0],
          shape: 'swatch'
        },
        { label: 'Inside', value: '37%', color: paint.value, shape: 'line' }
      ]
    })
  })
})

describe('barChart comparison', () => {
  const day = (i: number) => ({
    x: comparisonExample.data[i]!.day as string,
    y: comparisonExample.data[i]!.orders as number,
    series: 'Orders',
    index: i
  })

  it('marks every bar with a context tick, cased in the surface, over the bar', () => {
    const svg = svgOf(comparisonExample)
    expect(svg.match(/<line[^>]*data-ts-key="comparison:[^"]*"/g)).toHaveLength(
      comparisonExample.data.length
    )
    expect(svg).toMatch(
      new RegExp(`data-ts-key="comparison:[^"]*"[^>]*stroke="${paint.context}"`)
    )
    expect(svg).toMatch(
      new RegExp(
        `data-ts-key="comparison-underlay:[^"]*"[^>]*stroke="${paint.surface}"`
      )
    )
    const bars = svg.search(/<path[^>]*data-ts-key="series-1:/)
    const underlay = svg.search(/data-ts-key="comparison-underlay:/)
    expect(bars).toBeLessThan(underlay)
    expect(underlay).toBeLessThan(svg.search(/data-ts-key="comparison:/))
  })

  it('keeps focus on the bars', () => {
    expect(
      new Set(sceneOf(comparisonExample).points.map((p) => p.markId))
    ).toEqual(new Set(['series-1']))
  })

  it('counts the comparison in the y domain and keeps bars at zero', () => {
    const higher = {
      ...comparisonExample,
      data: comparisonExample.data.map((row) => ({ ...row, lastPeriod: 90 }))
    }
    expect(barYExtent(higher)).toEqual([0, expect.any(Number)])
    expect(barYExtent(higher)[1]).toBeGreaterThanOrEqual(90)
  })

  it('keys the bars and the comparison', () => {
    expect(
      barChart
        .legend(comparisonExample, paint, plotFrame(220, 'default'))
        .map((i) => [i.label, i.shape, i.color])
    ).toEqual([
      ['Orders', 'swatch', paint.categorical[0]],
      ['Previous period', 'line', paint.context]
    ])
  })

  it.each([
    ['its label', comparisonExample, 'Previous period'],
    [
      'the field when it has no label',
      { ...comparisonExample, comparison: { y: 'lastPeriod' } },
      'Last period'
    ]
  ])('names the comparison by %s in the tooltip', (_, props, name) => {
    expect(barChart.tooltip([day(2)], props, paint).rows).toEqual([
      expect.objectContaining({ label: 'Orders', value: '9' }),
      { label: name, value: '10', color: paint.context, shape: 'line' }
    ])
  })

  it('speaks the comparison with the bar', () => {
    expect(barChart.describe(day(2), comparisonExample)).toBe(
      'Sunday, 27 September 2026, 9 orders, previous period 10'
    )
  })

  it('leaves a bar with no comparison value unmarked and unspoken', () => {
    const gap = {
      ...comparisonExample,
      data: comparisonExample.data.map((row, i) =>
        i === 2 ? { ...row, lastPeriod: null } : row
      )
    }
    expect(
      svgOf(gap).match(/<line[^>]*data-ts-key="comparison:/g)
    ).toHaveLength(comparisonExample.data.length - 1)
    expect(barChart.tooltip([day(2)], gap, paint).rows).toEqual([
      expect.objectContaining({ label: 'Orders', value: '9' })
    ])
    expect(barChart.describe(day(2), gap)).toBe(
      'Sunday, 27 September 2026, 9 orders'
    )
  })

  it('tabulates the comparison after the bars', () => {
    const table = barChartTable(comparisonExample)
    expect(table.columns.map((c) => c.header)).toEqual([
      'Day',
      'Orders',
      'Previous period'
    ])
    expect(table.rows[2]).toMatchObject({ orders: 9, lastPeriod: 10 })
  })
})

describe('barChartTable', () => {
  it('lists every bar with full values and the line measure', () => {
    const table = barChartTable(scanRateExample)
    expect(table.columns.map((c) => c.header)).toEqual([
      'Time',
      'Scans',
      'Inside'
    ])
    expect(table.columns[2]).toMatchObject({ key: 'inside', format: 'percent' })
    expect(table.rows).toHaveLength(scanRateExample.data.length)
    expect(table.rows[0]).toEqual({
      time: 'Sat 14 Nov 2026 17:00',
      scans: 69,
      inside: 0.03
    })
  })
})

describe('barChart annotations', () => {
  const annotated = (at: string | number) => ({
    ...onSaleExample,
    annotations: [{ at, label: 'On sale' }]
  })
  const annotationCount = (at: string | number) =>
    svgOf(annotated(at)).match(/<text[^>]*data-ts-key="label-annotations/g)
      ?.length ?? 0

  it('draws an ISO time with an offset on its bar', () => {
    expect(() => sceneOf(annotated('2026-08-03T09:00:00+10:00'))).not.toThrow()
    expect(annotationCount('2026-08-03T09:00:00+10:00')).toBe(1)
  })

  it('drops a date on hourly data and a number outside the data', () => {
    for (const at of ['2026-08-04', 7]) {
      expect(() => sceneOf(annotated(at))).not.toThrow()
      expect(annotationCount(at)).toBe(0)
    }
  })
})
