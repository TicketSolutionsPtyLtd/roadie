import { createChartScene } from '@tanstack/charts'
import { renderChartSvg as renderSceneSvg } from '@tanstack/charts/svg'
import { describe, expect, it } from 'vitest'

import { plotFrame } from '../plot/frame'
import { cssPaint, hexPaint } from '../plot/paint'
import { stackedBars } from './definition'
import { presaleExample, resaleExample, ticketMixExample } from './examples'
import { stackedBarsTable } from './table'
import type { StackedBarsProps } from './types'

const paint = hexPaint('light')
const frame = plotFrame(220, 'default')
const sceneOf = (props: StackedBarsProps) =>
  createChartScene(stackedBars.build(props, paint, frame), {
    width: 560,
    height: 220
  })
const svgOf = (props: StackedBarsProps) =>
  renderSceneSvg(sceneOf(props), { ariaLabel: 'x' })

const keyOf = (id: string) => new RegExp(`data-ts-key="${id}(:[^"]*)?"`)

const bigSales: StackedBarsProps = {
  data: [
    { show: 'A', type: 'GA', sold: 18_000 },
    { show: 'A', type: 'VIP', sold: 6_000 }
  ],
  x: 'show',
  y: 'sold',
  series: 'type'
}

describe('stackedBars', () => {
  it('draws one mark per segment so each gets its own texture key', () => {
    const svg = svgOf(ticketMixExample)
    for (const id of ['series-1', 'series-2', 'series-3'])
      expect(svg).toMatch(keyOf(id))
  })

  it('focuses only data segments, skipping empty ones', () => {
    const points = sceneOf(ticketMixExample).points
    expect(points).toHaveLength(7)
    expect(new Set(points.map((p) => p.markId))).toEqual(
      new Set(['series-1', 'series-2', 'series-3'])
    )
  })

  it('uses the trio set for three segments and the pair set for two', () => {
    expect(svgOf(ticketMixExample)).toContain(`fill="${paint.trio[2]}"`)
    expect(
      stackedBars.legend(resaleExample, cssPaint, frame).map((i) => i.color)
    ).toEqual(cssPaint.pair)
  })

  it('paints the highlight and puts the rest in context', () => {
    expect(
      stackedBars.legend(presaleExample, paint, frame).map((i) => i.color)
    ).toEqual([paint.highlight, paint.context])
  })

  it('keys every segment in the legend with swatches', () => {
    expect(stackedBars.legend(ticketMixExample, paint, frame)).toEqual([
      expect.objectContaining({ label: 'GA', shape: 'swatch' }),
      expect.objectContaining({ label: 'VIP', shape: 'swatch' }),
      expect.objectContaining({ label: 'Early bird', shape: 'swatch' })
    ])
  })

  it('labels the share axis in percent', () => {
    expect(svgOf(presaleExample)).toContain('>100%<')
  })

  it('compacts the count axis past 10,000', () => {
    const svg = svgOf(bigSales)
    expect(svg).toContain('>25k<')
    expect(svg).not.toContain('>25,000<')
  })

  it('shares a value domain handed down by small multiples', () => {
    const scene = createChartScene(
      stackedBars.build(ticketMixExample, paint, {
        ...frame,
        yDomain: [0, 4000]
      }),
      { width: 560, height: 220 }
    )
    expect(renderSceneSvg(scene, { ariaLabel: 'x' })).toContain('>4,000<')
  })

  it('draws vertical bars when asked', () => {
    expect(svgOf(resaleExample)).toContain('ts-chart__bar-y')
    expect(svgOf(ticketMixExample)).toContain('ts-chart__bar-x')
  })

  it('leaves a zero segment out of a share bar', () => {
    const svg = svgOf({
      ...bigSales,
      mode: 'share',
      data: [
        { show: 'A', type: 'GA', sold: 0 },
        { show: 'A', type: 'VIP', sold: 6_000 }
      ]
    })
    expect(svg).toMatch(keyOf('series-1'))
    expect(svg).not.toMatch(keyOf('series-2'))
    expect(svg).not.toContain('NaN')
  })

  it('names the plot, and speaks a segment', () => {
    expect(
      stackedBars.summary({ ...ticketMixExample, takeaway: undefined })
    ).toBe('GA is the largest part of sold in every month')
    expect(
      stackedBars.summary({ ...presaleExample, takeaway: undefined })
    ).toBe('General is the largest part of sold overall')
    expect(
      stackedBars.describe(
        { x: 'Aug', y: 60, series: 'VIP', index: 1 },
        ticketMixExample
      )
    ).toBe('Aug, VIP, 60 sold')
    expect(
      stackedBars.describe(
        { x: 'The Lantern Room', y: 820, series: 'Presale', index: 0 },
        presaleExample
      )
    ).toBe('The Lantern Room, Presale, 820 sold, 56% of the bar')
  })

  it('lists every segment of the bar in the tooltip', () => {
    const tooltip = stackedBars.tooltip(
      [{ x: 'The Lantern Room', y: 820, series: 'Presale', index: 0 }],
      presaleExample,
      paint
    )
    expect(tooltip.title).toBe('The Lantern Room')
    expect(tooltip.rows).toEqual([
      expect.objectContaining({ label: 'Presale', value: '56% (820)' }),
      expect.objectContaining({ label: 'General', value: '44% (644)' })
    ])
  })

  it('asks for the empty state with nothing to stack', () => {
    const empty = { data: [], x: 'c', y: 'v', series: 's' }
    expect(stackedBars.emptyMessage(empty)).toBe('Nothing to show yet')
    expect(stackedBars.summary(empty)).toBe('V by s')
  })
})

describe('stackedBarsTable', () => {
  it('has one column per segment and a total', () => {
    const table = stackedBarsTable(ticketMixExample)
    expect(table.columns.map((c) => c.header)).toEqual([
      'Month',
      'GA',
      'VIP',
      'Early bird',
      'Total'
    ])
    expect(table.rows[0]).toMatchObject({
      GA: 414,
      VIP: 60,
      'Early bird': 300,
      Total: 774
    })
  })

  it('shows shares as percents in share mode', () => {
    expect(stackedBarsTable(presaleExample).columns[1]).toMatchObject({
      format: 'percent'
    })
  })
})
