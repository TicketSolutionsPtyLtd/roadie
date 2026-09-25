import { createChartScene } from '@tanstack/charts'
import { renderChartSvg as renderSceneSvg } from '@tanstack/charts/svg'
import { describe, expect, it } from 'vitest'

import { plotFrame } from '../plot/frame'
import { hexPaint } from '../plot/paint'
import { scatter } from './definition'
import { portfolioExample } from './examples'
import { scatterTable } from './table'
import type { ScatterProps } from './types'

const paint = hexPaint('light')
const sceneOf = (props: ScatterProps) =>
  createChartScene(scatter.build(props, paint, plotFrame(260, 'default')), {
    width: 640,
    height: 260
  })
const svgOf = (props: ScatterProps) =>
  renderSceneSvg(sceneOf(props), { ariaLabel: 'x' })
const svg = svgOf(portfolioExample)

// The hidden focus layer repeats every dot's key.
const fillOf = (markup: string, id: string) =>
  [
    ...markup
      .split('data-ts-key="default-focus')[0]!
      .matchAll(new RegExp(`data-ts-key="${id}:[^"]*"[^>]*fill="([^"]+)"`, 'g'))
  ].map((m) => m[1])

describe('scatter', () => {
  it('paints highlighted points in the highlight and the rest as context', () => {
    expect(fillOf(svg, 'series-highlight')).toEqual([
      paint.highlight,
      paint.highlight
    ])
    expect(fillOf(svg, 'series-context')).toEqual(Array(4).fill(paint.context))
  })

  it('paints every point in the first colour without a highlight', () => {
    const plain = svgOf({ ...portfolioExample, highlight: undefined })
    expect(fillOf(plain, 'series-1')).toEqual(
      Array(6).fill(paint.categorical[0])
    )
    expect(plain).not.toMatch(/data-ts-key="label-points(:|")/)
  })

  it('labels only highlighted points', () => {
    const labels = [
      ...svg.matchAll(/data-ts-key="label-points:[^"]*"[^>]*>([^<]*)</g)
    ].map((m) => m[1])
    expect(labels.sort()).toEqual(['Genesis Owusu', 'Julia Jacklin'])
  })

  it('draws the quadrant lines and names each quadrant', () => {
    expect(svg).toMatch(/data-ts-key="quadrant-x(:[^"]*)?"/)
    expect(svg).toMatch(/data-ts-key="quadrant-y(:[^"]*)?"/)
    for (const name of [
      'Sold, slowing',
      'On a roll',
      'Needs a push',
      'Catching up'
    ])
      expect(svg).toContain(`>${name}<`)
  })

  it('focuses only the points, all in one walk', () => {
    const points = sceneOf(portfolioExample).points
    expect(new Set(points.map((p) => p.markId))).toEqual(
      new Set(['series-highlight', 'series-context'])
    )
    expect(points).toHaveLength(6)
    expect(new Set(points.map((p) => p.group)).size).toBe(1)
  })

  it('sizes points by radius from the size field', () => {
    const radii = [...svg.matchAll(/<circle[^>]*\sr="([\d.]+)"/g)].map((m) =>
      Number(m[1])
    )
    expect(Math.max(...radii)).toBe(12)
  })

  it('keeps the quadrant lines inside the domain', () => {
    const far = svgOf({
      ...portfolioExample,
      quadrants: { ...portfolioExample.quadrants!, x: 200 }
    })
    expect(far).toMatch(/data-ts-key="quadrant-x(:[^"]*)?"/)
    expect(far).not.toContain('NaN')
  })

  it('names the plot by its quadrants, and speaks a point', () => {
    expect(scatter.summary({ ...portfolioExample, takeaway: undefined })).toBe(
      '3 of 6 shows are on a roll'
    )
    expect(
      scatter.describe(
        { x: 78, y: 0.4, series: 'Julia Jacklin', index: 4 },
        portfolioExample
      )
    ).toBe('Julia Jacklin, pace 78, sold 40%, needs a push')
  })

  it('names the plot by its fields without quadrants', () => {
    expect(
      scatter.summary({
        ...portfolioExample,
        takeaway: undefined,
        quadrants: undefined
      })
    ).toBe('Sold against pace for 6 shows')
  })

  it('shows the size in the tooltip', () => {
    expect(
      scatter.tooltip(
        [{ x: 78, y: 0.4, series: 'Julia Jacklin', index: 4 }],
        portfolioExample,
        paint
      )
    ).toEqual({
      title: 'Julia Jacklin',
      rows: [
        { label: 'Pace', value: '78' },
        {
          label: 'Sold',
          value: '40%',
          color: paint.highlight,
          shape: 'swatch'
        },
        { label: 'Capacity', value: '800' }
      ]
    })
  })

  it('has no legend', () => {
    expect(
      scatter.legend(portfolioExample, paint, plotFrame(260, 'narrow'))
    ).toEqual([])
  })

  it('asks for the empty state with fewer than two points', () => {
    expect(
      scatter.emptyMessage({ data: [{ a: 1, b: 2 }], x: 'a', y: 'b' })
    ).toBe('Not enough data yet to compare')
    expect(scatter.emptyMessage(portfolioExample)).toBeUndefined()
  })

  it('draws identical points without NaN', () => {
    expect(
      svgOf({
        data: [
          { a: 0, b: 0 },
          { a: 0, b: 0 }
        ],
        x: 'a',
        y: 'b'
      })
    ).not.toContain('NaN')
  })
})

describe('scatterTable', () => {
  it('lists every point with both measures and its size', () => {
    const table = scatterTable(portfolioExample)
    expect(table.columns.map((c) => c.header)).toEqual([
      'Show',
      'Pace',
      'Sold',
      'Capacity'
    ])
    expect(table.rows).toHaveLength(6)
    expect(table.rows[4]).toEqual({
      show: 'Julia Jacklin',
      pace: 78,
      sold: 0.4,
      capacity: 800
    })
  })
})
