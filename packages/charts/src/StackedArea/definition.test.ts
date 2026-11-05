import { createChartScene } from '@tanstack/charts'
import { renderChartSvg as renderSceneSvg } from '@tanstack/charts/svg'
import { describe, expect, it } from 'vitest'

import { textWidth } from '../plot/endLabels'
import { plotFrame } from '../plot/frame'
import { hexPaint } from '../plot/paint'
import { stackedArea } from './definition'
import { scansByGateExample } from './examples'
import { stackLayers } from './stack'
import { stackedAreaTable } from './table'
import type { StackedAreaProps } from './types'

const paint = hexPaint('light')
const frame = plotFrame(220, 'default')
const svgOf = (props: StackedAreaProps) =>
  renderSceneSvg(
    createChartScene(stackedArea.build(props, paint, frame), {
      width: 640,
      height: 220
    }),
    { ariaLabel: 'x' }
  )
const keyOf = (id: string) => new RegExp(`data-ts-key="${id}(:[^"]*)?"`)

const small: StackedAreaProps = {
  data: [
    { at: '2026-11-14T19:00', gate: 'VIP', scans: 0 },
    { at: '2026-11-14T19:00', gate: 'Main', scans: 50 },
    { at: '2026-11-14T19:00', gate: 'North', scans: 20 },
    { at: '2026-11-14T19:15', gate: 'VIP', scans: 4 },
    { at: '2026-11-14T19:15', gate: 'Main', scans: 60 },
    { at: '2026-11-14T19:15', gate: 'North', scans: 25 }
  ],
  x: 'at',
  y: 'scans',
  series: 'gate'
}
const at = (time: string) => Date.parse(`2026-11-14T${time}Z`)

describe('stackedArea', () => {
  it('draws a band and a top line for every layer', () => {
    const svg = svgOf(scansByGateExample)
    for (const slot of [1, 2, 3, 4]) {
      expect(svg).toMatch(keyOf(`series-${slot}`))
      expect(svg).toMatch(keyOf(`series-${slot}-area`))
    }
  })

  it('ticks a time x as clock times', () => {
    expect(svgOf(small)).toMatch(/>19:00</)
  })

  it('opens the tooltip with the total, then each layer from the top down', () => {
    const point = { x: at('19:00'), y: 50, series: 'Main', index: 1 }
    const { title, rows } = stackedArea.tooltip([point], small, paint)
    expect(title).toBe('Sat 14 Nov 2026, 7:00pm')
    expect(rows.map((r) => [r.label, r.value])).toEqual([
      ['Total', '70'],
      ['North', '20'],
      ['Main', '50']
    ])
    expect(rows[0]!.shape).toBe('none')
  })

  it('lists the legend from the top of the stack down', () => {
    expect(
      stackedArea.legend(small, paint, frame).map((item) => item.label)
    ).toEqual(['VIP', 'North', 'Main'])
  })

  it('says each point in words with its layer', () => {
    expect(
      stackedArea.describe(
        { x: at('19:15'), y: 60, series: 'Main', index: 4 },
        small
      )
    ).toBe('Saturday, 14 November 2026, 7:15pm, 60 scans, Main')
  })

  it('names the largest layer when there is no takeaway', () => {
    expect(stackedArea.summary(small)).toBe('Main is the largest gate overall')
    expect(stackedArea.summary(scansByGateExample)).toBe(
      scansByGateExample.takeaway
    )
  })

  it('asks for more data with fewer than two times', () => {
    expect(
      stackedArea.emptyMessage({ ...small, data: small.data.slice(0, 3) })
    ).toBe('Not enough data yet to show a trend')
    expect(stackedArea.emptyMessage(small)).toBeUndefined()
  })

  it('tabulates every layer and the total at each time', () => {
    const table = stackedAreaTable(small)
    expect(table.columns.map((c) => c.header)).toEqual([
      'At',
      'Main',
      'North',
      'VIP',
      'Total'
    ])
    expect(table.rows[0]).toMatchObject({
      at: 'Sat 14 Nov 2026 19:00',
      Main: 50,
      VIP: 0,
      total: 70
    })
  })

  it('keeps a column for every layer the plot rolls into Other', () => {
    const gates = Array.from({ length: 8 }, (_, i) => `Gate ${i + 1}`)
    const table = stackedAreaTable({
      ...small,
      data: gates.flatMap((gate, i) =>
        ['19:00', '19:15'].map((time) => ({
          at: `2026-11-14T${time}`,
          gate,
          scans: 10 - i
        }))
      )
    })
    expect(table.columns.map((c) => c.header)).toEqual([
      'At',
      ...gates,
      'Total'
    ])
    expect(table.rows[0]).toMatchObject({ 'Gate 8': 3, total: 52 })
  })

  it('stacks every time to 100% in share mode', () => {
    const share = { ...small, mode: 'share' as const }
    const tops = stackLayers(share).filter((l) => l.series === 'VIP')
    for (const top of tops) expect(top.end).toBeCloseTo(1)
    expect(svgOf(share)).toMatch(/>100%</)
  })

  it('tops the share axis at 100% when the shares sum a hair over 1', () => {
    const data = ['19:00', '19:15'].flatMap((time) =>
      [5, 1, 1, 1, 1].map((scans, i) => ({
        at: `2026-11-14T${time}`,
        gate: `Gate ${i + 1}`,
        scans
      }))
    )
    const svg = svgOf({ ...small, data, mode: 'share' })
    const ticks = [...svg.matchAll(/y-tick-label:number:([\d.]+)/g)]
    expect(Math.max(...ticks.map((t) => Number(t[1])))).toBe(1)
  })

  it('gives each layer its share and count in share mode', () => {
    const point = { x: at('19:00'), y: 50, series: 'Main', index: 1 }
    const share = { ...small, mode: 'share' as const }
    expect(
      stackedArea.tooltip([point], share, paint).rows.map((r) => r.value)
    ).toEqual(['70', '29% (20)', '71% (50)'])
    expect(stackedArea.describe(point, share)).toMatch(/, 71% of the total$/)
  })

  it('tabulates shares in share mode, with the total as a count', () => {
    const table = stackedAreaTable({ ...small, mode: 'share' })
    expect(table.columns.find((c) => c.key === 'Main')).toMatchObject({
      format: 'percent'
    })
    expect(table.rows[0]).toMatchObject({ total: 70 })
    expect(table.rows[0]!.Main).toBeCloseTo(50 / 70)
  })

  it('marks today with a dot on the top of the stack, read as the total', () => {
    const svg = svgOf({ ...small, today: '2026-11-14T19:00' })
    expect(svg).toMatch(keyOf('today'))
    expect(svg).toMatch(/>Today 70</)
  })

  it('puts today on the top of a share stack in value ink, read as the count', () => {
    const svg = svgOf({ ...small, mode: 'share', today: '2026-11-14T19:00' })
    const top = svg.match(/y-tick-label:number:1"[^>]* y="([\d.]+)"/)?.[1]
    const dot = svg.match(
      /data-ts-key="today:[^"]*" fill="([^"]+)"[^>]* cy="([\d.]+)"/
    )
    expect(top).toBeDefined()
    expect(dot?.[2]).toBe(top)
    expect(dot?.[1]).toBe(paint.value)
    expect(svg).toMatch(/>Today 70</)
  })

  it('keeps the today label inside the plot at the last time', () => {
    const svg = svgOf({ ...small, today: '2026-11-14T19:15' })
    const label = Number(
      /data-ts-key="label-today[^"]*"[^>]*\sx="([\d.]+)"/.exec(svg)?.[1]
    )
    expect(label + textWidth('Today 89', frame) / 2).toBeLessThanOrEqual(640)
  })

  it('draws annotations along the time axis, from the top of the plot', () => {
    const svg = svgOf({
      ...small,
      mode: 'share',
      annotations: [{ at: '2026-11-14T19:00', label: 'Doors' }]
    })
    const y = (key: string) =>
      Number(
        new RegExp(`data-ts-key="${key}[^"]*"[^>]* y="([\\d.]+)"`).exec(
          svg
        )?.[1]
      )
    expect(svg).toMatch(keyOf('annotation-rules'))
    expect(y('label-annotations:') - y('y-tick-label:number:1')).toBeLessThan(
      frame.fontSize
    )
    expect(svg).toContain('>Doors<')
  })
})

describe('stackedArea decimal places', () => {
  const tenths: StackedAreaProps = { ...small, decimals: 1 }
  const point = { x: at('19:00'), y: 50, series: 'Main', index: 1 }

  it('reads values to the decimal places on the plot, in the tooltip, aloud and in the table', () => {
    expect(svgOf({ ...tenths, today: '2026-11-14T19:00' })).toMatch(
      />Today 70.0</
    )
    expect(
      stackedArea.tooltip([point], tenths, paint).rows.map((r) => r.value)
    ).toEqual(['70.0', '20.0', '50.0'])
    expect(stackedArea.describe(point, tenths)).toBe(
      'Saturday, 14 November 2026, 7:00pm, 50.0 scans, Main'
    )
    const table = stackedAreaTable(tenths)
    expect(table.columns.find((c) => c.key === 'Main')).toMatchObject({
      decimals: 1
    })
    expect(table.columns.at(-1)).toMatchObject({ header: 'Total', decimals: 1 })
  })

  it('reads shares to the decimal places in share mode', () => {
    const share = { ...tenths, mode: 'share' as const }
    expect(
      stackedArea.tooltip([point], share, paint).rows.map((r) => r.value)
    ).toEqual(['70.0', '28.6% (20.0)', '71.4% (50.0)'])
    expect(stackedArea.describe(point, share)).toMatch(/, 71.4% of the total$/)
    expect(
      stackedAreaTable(share).columns.find((c) => c.key === 'Main')
    ).toMatchObject({ format: 'percent', decimals: 1 })
  })
})
