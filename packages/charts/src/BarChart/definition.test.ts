import { createChartScene } from '@tanstack/charts'
import { renderChartSvg as renderSceneSvg } from '@tanstack/charts/svg'
import { describe, expect, it } from 'vitest'

import { plotFrame } from '../plot/frame'
import { hexPaint } from '../plot/paint'
import { barChart } from './definition'
import { dailyOrdersExample, onSaleExample, scanRateExample } from './examples'
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
    expect(svgOf(onSaleExample)).toContain('>9am<')
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
      'Orders peaked at 1,840 at 9am on Mon 3 Aug'
    )
    expect(
      barChart.summary({ ...dailyOrdersExample, takeaway: undefined })
    ).toBe('Orders peaked at 21 on Fri 9 Oct')
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
    ).toBe('Monday 3 August, 9am, 1,840 orders')
  })

  it('speaks the second measure with the bar', () => {
    expect(
      barChart.describe(
        { x: '2026-11-14T18:00', y: 300, series: 'Scans', index: 4 },
        scanRateExample
      )
    ).toBe('Saturday 14 November, 6pm, 300 scans, inside 37%')
  })

  it('shows both measures in the tooltip', () => {
    expect(
      barChart.tooltip(
        [{ x: '2026-11-14T18:00', y: 300, series: 'Scans', index: 4 }],
        scanRateExample,
        paint
      )
    ).toEqual({
      title: 'Sat 14 Nov, 6pm',
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
      time: 'Sat 14 Nov, 5pm',
      scans: 69,
      inside: 0.03
    })
  })
})
