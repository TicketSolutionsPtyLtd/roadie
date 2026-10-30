import { createChartScene } from '@tanstack/charts'
import { renderChartSvg as renderSceneSvg } from '@tanstack/charts/svg'
import { describe, expect, it } from 'vitest'

import { plotFrame } from '../plot/frame'
import { hexPaint } from '../plot/paint'
import { donutChart } from './definition'
import { ticketTypeExample } from './examples'
import type { DonutChartProps } from './types'

const paint = hexPaint('light')
const wide = plotFrame(260, 'default', undefined, 560)

const sceneOf = (props: DonutChartProps, frame = wide) =>
  createChartScene(donutChart.build(props, paint, frame), {
    width: frame.width,
    height: frame.height
  })
const svgOf = (props: DonutChartProps, frame = wide) =>
  renderSceneSvg(sceneOf(props, frame), {
    ariaLabel: donutChart.summary(props)
  })

const arcFills = (svg: string) =>
  [...svg.matchAll(/<path data-ts-key="series-[^"]*" fill="([^"]+)"/g)].map(
    (m) => m[1]
  )
const textsOf = (svg: string, id: string) =>
  [
    ...svg.matchAll(
      new RegExp(`<text data-ts-key="${id}:[^"]*"[^>]*>([^<]*)<`, 'g')
    )
  ].map((m) => m[1])

const parts = (values: readonly number[]): DonutChartProps => ({
  data: values.map((sold, i) => ({ type: `Type ${i + 1}`, sold })),
  x: 'type',
  y: 'sold'
})

describe('donutChart', () => {
  it('paints the parts in the first five palette colours, largest first', () => {
    expect(arcFills(svgOf(ticketTypeExample)).sort()).toEqual(
      paint.categorical.slice(0, 5).toSorted()
    )
  })

  it('starts the largest part at 12 o’clock', () => {
    expect(svgOf(ticketTypeExample)).toMatch(
      /<path data-ts-key="series-1:[^"]*"[^>]* d="M-?0(?:\.\d+)?,-/
    )
  })

  it('paints Other in the Other grey', () => {
    expect(arcFills(svgOf(parts([60, 50, 40, 30, 20, 10])))).toContain(
      paint.other
    )
  })

  it('paints the highlighted part and leaves the rest as context', () => {
    const fills = arcFills(svgOf({ ...ticketTypeExample, highlight: 'VIP' }))
    expect(fills.filter((f) => f === paint.highlight)).toHaveLength(1)
    expect(fills.filter((f) => f === paint.context)).toHaveLength(4)
  })

  it('labels each slice with a whole percent, adding up to 100', () => {
    expect(textsOf(svgOf(ticketTypeExample), 'label-values')).toEqual([
      '52%',
      '22%',
      '13%',
      '9%',
      '4%'
    ])
  })

  it('drops the label of a slice under 3%', () => {
    expect(textsOf(svgOf(parts([95, 2.9, 2.1])), 'label-values')).toEqual([
      '95%'
    ])
  })

  it('writes the total and its label in the centre', () => {
    const svg = svgOf(ticketTypeExample)
    expect(textsOf(svg, 'label-total')).toEqual(['2,385'])
    expect(textsOf(svg, 'label-total-name')).toEqual(['Tickets'])
  })

  it('labels the centre with the value field when total is not set', () => {
    const svg = svgOf({ ...ticketTypeExample, total: undefined })
    expect(textsOf(svg, 'label-total-name')).toEqual(['Tickets'])
    expect(textsOf(svgOf(parts([3, 1])), 'label-total-name')).toEqual(['Sold'])
  })

  it('names the centre with total', () => {
    const svg = svgOf({ ...ticketTypeExample, total: 'Sold' })
    expect(textsOf(svg, 'label-total-name')).toEqual(['Sold'])
  })

  // Text on the ring's palette colours can't keep its contrast.
  it('leaves the centre empty when the total would spill onto the ring', () => {
    const short = plotFrame(56, 'narrow', undefined, 246)
    expect(textsOf(svgOf(ticketTypeExample, short), 'label-total')).toEqual([])
  })

  it('compacts a centre total past 10,000', () => {
    expect(textsOf(svgOf(parts([24_000, 6_000])), 'label-total')).toEqual([
      '30k'
    ])
  })

  it('draws one part as a full ring', () => {
    const svg = svgOf(parts([40]))
    expect(arcFills(svg)).toHaveLength(1)
    expect(textsOf(svg, 'label-values')).toEqual(['100%'])
  })

  it('reads a slice as its name, value and share', () => {
    expect(
      donutChart.describe(
        { x: 'GA', y: 1240, series: 'Tickets', index: 0 },
        ticketTypeExample
      )
    ).toBe('GA, 1,240 tickets, 52%')
  })

  it('shows the value and share in the tooltip', () => {
    const tooltip = donutChart.tooltip(
      [{ x: 'GA', y: 1240, series: 'Tickets', index: 0 }],
      ticketTypeExample,
      paint
    )
    expect(tooltip.title).toBe('GA')
    expect(tooltip.rows.map((r) => [r.label, r.value])).toEqual([
      ['Tickets', '1,240'],
      ['Share', '52%']
    ])
  })

  it('names every part with its value and share in the legend', () => {
    expect(
      donutChart.legend(ticketTypeExample, paint, wide).map((i) => i.label)
    ).toEqual([
      'GA 1,240 (52%)',
      'Early bird 520 (22%)',
      'VIP 310 (13%)',
      'Concession 220 (9%)',
      'Companion 95 (4%)'
    ])
  })

  it('sums up the largest part when there is no takeaway', () => {
    expect(
      donutChart.summary({ ...ticketTypeExample, takeaway: undefined })
    ).toBe('GA is 52% of 2,385 tickets')
    expect(donutChart.summary(ticketTypeExample)).toBe(
      ticketTypeExample.takeaway
    )
  })

  it('is empty without a positive value', () => {
    expect(donutChart.emptyMessage(parts([0, -3]))).toBe('Nothing to show yet')
    expect(donutChart.emptyMessage(ticketTypeExample)).toBeUndefined()
  })

  it('keeps every leader bend outside the ring when labels are pushed apart', () => {
    const svg = svgOf(parts([80, 8, 5, 4, 3]))
    const radius = Number(
      /<path data-ts-key="series-[^"]*"[^>]* d="M[^A]*A([\d.]+),/.exec(svg)![1]
    )
    const bends = [
      ...svg.matchAll(
        /<line data-ts-key="leaders:[^"]*-elbow"[^>]* x1="([\d.-]+)" y1="([\d.-]+)"/g
      )
    ].map(([, x, y]) =>
      Math.hypot(Number(x) - wide.width / 2, Number(y) - wide.height / 2)
    )
    expect(bends).toHaveLength(5)
    for (const bend of bends) expect(bend).toBeGreaterThan(radius)
  })
})
