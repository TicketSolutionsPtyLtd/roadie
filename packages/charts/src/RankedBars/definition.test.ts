import { createChartScene } from '@tanstack/charts'
import { renderChartSvg as renderSceneSvg } from '@tanstack/charts/svg'
import { describe, expect, it } from 'vitest'

import { textRoom } from '../plot/endLabels'
import { plotFrame } from '../plot/frame'
import { hexPaint } from '../plot/paint'
import { rankedBars } from './definition'
import { attendanceExample, channelExample, suburbExample } from './examples'
import { rankedBarsTable } from './table'
import type { RankedBarsProps } from './types'

const paint = hexPaint('light')
const sceneOf = (props: RankedBarsProps) =>
  createChartScene(rankedBars.build(props, paint, plotFrame(260, 'default')), {
    width: 560,
    height: 260
  })
const svgOf = (props: RankedBarsProps) =>
  renderSceneSvg(sceneOf(props), { ariaLabel: rankedBars.summary(props) })

const fillsOf = (svg: string) =>
  [...svg.matchAll(/<rect[^>]*fill="([^"]+)"/g)].map((m) => m[1])

describe('rankedBars', () => {
  it('paints the highlighted bar and leaves the rest as context', () => {
    const svg = svgOf(channelExample)
    expect(svg).toContain(`fill="${paint.highlight}"`)
    expect(svg).toContain(`fill="${paint.context}"`)
    expect(svg).toContain(`fill="${paint.other}"`)
  })

  it('paints every bar in the first palette colour with no highlight', () => {
    const fills = fillsOf(svgOf({ ...channelExample, highlight: undefined }))
    expect(fills).toContain(paint.categorical[0])
    expect(fills).not.toContain(paint.highlight)
    expect(fills).not.toContain(paint.context)
  })

  it('writes shares at the bar ends', () => {
    expect(svgOf(suburbExample)).toMatch(
      /data-ts-key="label-values[^"]*"[^>]*>\d+%</
    )
  })

  it('compacts bar labels past 10,000', () => {
    const svg = svgOf({
      data: [
        { c: 'A', v: 24_000 },
        { c: 'B', v: 9_500 }
      ],
      x: 'c',
      y: 'v'
    })
    expect(svg).toContain('>24k<')
    expect(svg).toContain('>9,500<')
    expect(svg).not.toContain('>24,000<')
  })

  it('draws a reference tick per bar', () => {
    expect(
      svgOf(attendanceExample).match(/data-ts-key="reference:[^"]*"/g)
    ).toHaveLength(3)
  })

  it('draws the reference as a share of the same total in share mode', () => {
    const props: RankedBarsProps = {
      data: [
        { c: 'A', v: 3, r: 3 },
        { c: 'B', v: 1, r: 1 }
      ],
      x: 'c',
      y: 'v',
      share: true,
      reference: { field: 'r', label: 'Last year' }
    }
    const bar = sceneOf(props).points.find((p) => p.markId === 'series-1')!
    const svg = svgOf(props)
    expect(svg).toMatch(/data-ts-key="reference:[^"]*"/)
    expect(bar.xValue).toBe(0.75)
  })

  it('focuses only the bars, in rank order', () => {
    const points = sceneOf(attendanceExample).points
    expect(new Set(points.map((p) => p.markId))).toEqual(new Set(['series-1']))
    expect(points.map((p) => p.yValue)).toEqual([
      'Friday',
      'Saturday',
      'Sunday matinee'
    ])
  })

  it('gives highlighted, context and Other bars their own marks', () => {
    const points = sceneOf(channelExample).points
    const markOf = (name: string) =>
      points.filter((p) => p.yValue === name).map((p) => p.markId)
    expect(points).toHaveLength(8)
    expect(markOf('Email')).toEqual(['series-1'])
    expect(markOf('Instagram')).toEqual(['series-2'])
    expect(markOf('Facebook')).toEqual(['series-2'])
    expect(markOf('Other')).toEqual(['series-other'])
  })

  it('keeps every named bar in one mark with no highlight', () => {
    const points = sceneOf({ ...channelExample, highlight: undefined }).points
    expect(new Set(points.map((p) => p.markId))).toEqual(
      new Set(['series-1', 'series-other'])
    )
  })

  it('runs its categories down the y axis', () => {
    expect(rankedBars.categoryAxis?.(channelExample)).toBe('y')
  })

  it('lets the longest bar reach the value label margin', () => {
    const props: RankedBarsProps = {
      data: [
        { c: 'A', v: 612 },
        { c: 'B', v: 100 }
      ],
      x: 'c',
      y: 'v'
    }
    const [, x, width] =
      /<rect data-ts-key="series-1:[^"]*:A"[^>]*x="([\d.]+)"[^>]*width="([\d.]+)"/.exec(
        svgOf(props)
      )!
    const labelRoom = textRoom(['612'], plotFrame(260, 'default'), 12)
    expect(Number(x) + Number(width)).toBeCloseTo(560 - labelRoom, 0)
  })

  it('plots all-zero data with no NaN', () => {
    expect(
      svgOf({
        data: [
          { c: 'A', v: 0 },
          { c: 'B', v: 0 }
        ],
        x: 'c',
        y: 'v',
        share: true
      })
    ).not.toMatch(/NaN|Infinity/)
  })

  it('keys the reference in the legend', () => {
    expect(
      rankedBars.legend(attendanceExample, paint, plotFrame(220, 'default'))
    ).toEqual([
      expect.objectContaining({ label: 'Similar shows', shape: 'line' })
    ])
    expect(
      rankedBars.legend(channelExample, paint, plotFrame(220, 'default'))
    ).toEqual([])
  })

  it('names the plot by its leader when there is no takeaway', () => {
    expect(rankedBars.summary({ ...channelExample, takeaway: undefined })).toBe(
      'Email leads with 612 orders, ahead of Instagram with 388'
    )
  })

  it('names an empty plot by its fields', () => {
    expect(rankedBars.summary({ data: [], x: 'channel', y: 'orders' })).toBe(
      'Orders by channel'
    )
  })

  it('asks for the empty state with nothing to rank', () => {
    expect(rankedBars.emptyMessage({ data: [], x: 'c', y: 'v' })).toBe(
      'Nothing to rank yet'
    )
    expect(rankedBars.emptyMessage(channelExample)).toBeUndefined()
  })

  it('speaks a bar with its share', () => {
    expect(
      rankedBars.describe(
        { x: 'West End', y: 161, series: 'Buyers', index: 1 },
        suburbExample
      )
    ).toMatch(/^West End, 161 buyers, \d+% of the total$/)
  })

  it('speaks a bar with its reference', () => {
    expect(
      rankedBars.describe(
        { x: 'Friday', y: 0.94, series: 'Attended', index: 0 },
        attendanceExample
      )
    ).toBe('Friday, 94% attended, similar shows 90%')
  })

  it('speaks the rolled up Other bar', () => {
    expect(
      rankedBars.describe(
        { x: 'Other', y: 63, series: 'Orders', index: -1 },
        channelExample
      )
    ).toBe('Other, 63 orders')
  })

  it('lists value, share and reference in the tooltip', () => {
    const tip = rankedBars.tooltip(
      [{ x: 'Friday', y: 0.94, series: 'Attended', index: 0 }],
      attendanceExample,
      paint
    )
    expect(tip.title).toBe('Friday')
    expect(tip.rows.map((r) => [r.label, r.value])).toEqual([
      ['Attended', '94%'],
      ['Similar shows', '90%']
    ])
    expect(
      rankedBars
        .tooltip(
          [{ x: 'West End', y: 161, series: 'Buyers', index: 1 }],
          suburbExample,
          paint
        )
        .rows.map((r) => r.label)
    ).toEqual(['Buyers', 'Share'])
  })
})

describe('rankedBarsTable', () => {
  it('lists every original row, not the rollup, largest first', () => {
    const table = rankedBarsTable(channelExample)
    expect(table.rows).toHaveLength(channelExample.data.length)
    expect(table.columns.map((c) => c.header)).toEqual(['Channel', 'Orders'])
    expect(table.rows.map((r) => r.channel)).toEqual(
      channelExample.data.map((r) => r.channel)
    )
  })

  it('adds share and reference columns', () => {
    expect(rankedBarsTable(suburbExample).columns.map((c) => c.header)).toEqual(
      ['Suburb', 'Buyers', 'Share']
    )
    expect(
      rankedBarsTable(attendanceExample).columns.map((c) => c.header)
    ).toEqual(['Show', 'Attended', 'Similar shows'])
  })

  it('fills the share column from the full total', () => {
    const rows = rankedBarsTable(suburbExample).rows
    expect(rows[0]!.share).toBeCloseTo(205 / 767, 6)
  })

  it('keeps rows with no number at the end', () => {
    const rows = rankedBarsTable({
      data: [
        { c: 'A', v: null },
        { c: 'B', v: 2 }
      ],
      x: 'c',
      y: 'v',
      share: true
    }).rows
    expect(rows).toEqual([
      { c: 'B', v: 2, share: 1 },
      { c: 'A', v: null, share: null }
    ])
  })
})

describe('rankedBars keys', () => {
  it('keys labels and ticks by bar name, so they follow their bar', () => {
    const svg = svgOf(attendanceExample)
    for (const id of ['label-values', 'reference'])
      expect(
        [...svg.matchAll(new RegExp(`data-ts-key="${id}:[^"]*"`, 'g'))].map(
          (m) => m[0].endsWith(':Sunday matinee"')
        )
      ).toContain(true)
  })
})
