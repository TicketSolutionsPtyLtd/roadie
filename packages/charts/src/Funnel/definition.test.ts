import { createChartScene } from '@tanstack/charts'
import { renderChartSvg as renderSceneSvg } from '@tanstack/charts/svg'
import { describe, expect, it } from 'vitest'

import { plotFrame } from '../plot/frame'
import { hexPaint } from '../plot/paint'
import { funnel } from './definition'
import { checkoutExample, waitlistExample } from './examples'
import { funnelTable } from './table'
import type { FunnelProps } from './types'

const paint = hexPaint('light')
const sceneOf = (props: FunnelProps, band: 'narrow' | 'default' = 'default') =>
  createChartScene(funnel.build(props, paint, plotFrame(260, band)), {
    width: band === 'narrow' ? 320 : 640,
    height: 260
  })
const svgOf = (props: FunnelProps, band?: 'narrow' | 'default') =>
  renderSceneSvg(sceneOf(props, band), { ariaLabel: 'x' })

const svg = svgOf(checkoutExample)

describe('funnel', () => {
  it('draws one bar per step and a value with conversion at each end', () => {
    // The same keys also mark the hidden focus dots, so count the bars.
    expect(svg.match(/<rect data-ts-key="series-1:[^"]*"/g)).toHaveLength(4)
    expect(svg).toMatch(/>612, 62% of previous</)
  })

  it('shortens on-plot values past 10,000', () => {
    const large = svgOf({
      steps: checkoutExample.steps.map((step) => ({
        ...step,
        value: step.value * 10
      }))
    })
    expect(large).toContain('>51.8k<')
    expect(large).not.toContain('>51,800<')
  })

  it('puts the steps in order down the side', () => {
    const labels = [
      ...svg.matchAll(/>(Viewed event|Chose tickets|Started checkout|Paid)</g)
    ].map((m) => m[1])
    expect(labels).toEqual([
      'Viewed event',
      'Chose tickets',
      'Started checkout',
      'Paid'
    ])
  })

  it('focuses only the step bars', () => {
    const scene = sceneOf(checkoutExample)
    expect(new Set(scene.points.map((p) => p.markId))).toEqual(
      new Set(['series-1'])
    )
    expect(scene.points).toHaveLength(4)
  })

  it('paints the bars from the categorical palette', () => {
    expect(svg).toMatch(
      new RegExp(
        `data-ts-key="series-1:[^"]*"[^>]*fill="${paint.categorical[0]}"`
      )
    )
  })

  it('keeps only the percentage on a phone', () => {
    const narrow = svgOf(checkoutExample, 'narrow')
    expect(narrow).toContain('>62%<')
    expect(narrow).not.toContain('of previous')
    expect(narrow).toContain('>5,180<')
  })

  it('draws zero steps without NaN', () => {
    const zero = svgOf({
      steps: [
        { label: 'A', value: 5 },
        { label: 'B', value: 0 }
      ]
    })
    expect(zero).not.toContain('NaN')
  })

  it('names the plot by its end to end conversion when there is no takeaway', () => {
    expect(funnel.summary({ ...checkoutExample, takeaway: undefined })).toBe(
      '12% of viewed event reached paid. The biggest drop is at chose tickets'
    )
  })

  it('names the plot by its takeaway', () => {
    expect(funnel.summary(checkoutExample)).toBe(checkoutExample.takeaway)
  })

  it('speaks a step', () => {
    expect(
      funnel.describe(
        { x: 'Paid', y: 612, series: 'Steps', index: 3 },
        checkoutExample
      )
    ).toBe('Paid, 612, 62% of the previous step, 12% of the first')
    expect(
      funnel.describe(
        { x: 'Viewed event', y: 5180, series: 'Steps', index: 0 },
        checkoutExample
      )
    ).toBe('Viewed event, 5,180')
  })

  it('lists count, conversion and drop-off in the tooltip', () => {
    const tip = funnel.tooltip(
      [{ x: 'Chose tickets', y: 1760, series: 'Steps', index: 1 }],
      checkoutExample,
      paint
    )
    expect(tip.title).toBe('Chose tickets')
    expect(tip.rows.map((r) => [r.label, r.value])).toEqual([
      ['Count', '1,760'],
      ['Of previous', '34%'],
      ['Dropped', '3,420'],
      ['Of first', '34%']
    ])
  })

  it('has no legend', () => {
    expect(
      funnel.legend(checkoutExample, paint, plotFrame(260, 'narrow'))
    ).toEqual([])
  })

  it('asks for the empty state when no one started', () => {
    expect(
      funnel.emptyMessage({
        steps: [
          { label: 'A', value: 0 },
          { label: 'B', value: 0 }
        ]
      })
    ).toBe('No one has started this yet')
    expect(funnel.emptyMessage({ steps: [] })).toBe(
      'No one has started this yet'
    )
    expect(funnel.emptyMessage(waitlistExample)).toBeUndefined()
  })

  it('names an empty funnel without throwing', () => {
    expect(funnel.summary({ steps: [] })).toBe('Funnel')
  })
})

describe('funnelTable', () => {
  it('lists each step with conversion and drop-off', () => {
    const table = funnelTable(checkoutExample)
    expect(table.columns.map((c) => c.header)).toEqual([
      'Step',
      'Count',
      'Of previous',
      'Of first',
      'Dropped'
    ])
    expect(table.rows[0]).toMatchObject({
      step: 'Viewed event',
      count: 5180,
      ofPrevious: null
    })
    expect(table.rows[1]).toMatchObject({ dropped: 3420 })
  })
})
