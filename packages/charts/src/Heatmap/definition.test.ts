import { cell, createChartScene, defineChart } from '@tanstack/charts'
import { scaleBand } from '@tanstack/charts/scales/band'
import { renderChartSvg as renderSceneSvg } from '@tanstack/charts/svg'
import { describe, expect, it } from 'vitest'

import { plotFrame } from '../plot/frame'
import { hexPaint } from '../plot/paint'
import { heatmap } from './definition'
import { sectionPaceExample, whenFansBuyExample } from './examples'
import { heatmapTable } from './table'

const paint = hexPaint('light')

const render = (props: Parameters<typeof heatmap.build>[0]) =>
  renderSceneSvg(
    createChartScene(heatmap.build(props, paint, plotFrame(260, 'default')), {
      width: 640,
      height: 260
    }),
    { ariaLabel: 'x' }
  )

it('paints cells through the pinned colour scale', () => {
  const definition = defineChart({
    marks: [
      cell(
        [
          { c: 'a', r: 'x', b: 'heat-0' },
          { c: 'b', r: 'x', b: 'heat-8' }
        ],
        { id: 'cells', x: 'c', y: 'r', color: 'b' }
      )
    ],
    scales: {
      x: { scale: scaleBand<string>().domain(['a', 'b']) },
      y: { scale: scaleBand<string>().domain(['x']) }
    },
    color: { domain: ['heat-0', 'heat-8'], range: ['#111111', '#eeeeee'] }
  })
  const svg = renderSceneSvg(
    createChartScene(definition, { width: 200, height: 100 }),
    { ariaLabel: 'x' }
  )
  expect(svg).toContain('fill="#111111"')
  expect(svg).toContain('fill="#eeeeee"')
})

describe('heatmap', () => {
  const svg = render(whenFansBuyExample)

  it('draws a cell for every value, in the heat steps', () => {
    expect(svg.match(/data-ts-key="cells:[^"]*"/g)).toHaveLength(35)
    expect(svg).toContain(`fill="${paint.heat[8]}"`)
  })

  it('paints diverging values from the diverging scale', () => {
    const diverging = render(sectionPaceExample)
    expect(diverging).toContain(`fill="${paint.diverging[0]}"`)
    expect(diverging).not.toContain(`fill="${paint.heat[8]}"`)
  })

  it('makes every cell, and only cells, focusable', () => {
    const scene = createChartScene(
      heatmap.build(whenFansBuyExample, paint, plotFrame(260, 'default')),
      { width: 640, height: 260 }
    )
    expect(scene.points).toHaveLength(35)
    expect(new Set(scene.points.map((p) => p.markId))).toEqual(
      new Set(['cells'])
    )
  })

  it('sets every tick label in the frame font size', () => {
    const frame = plotFrame(260, 'narrow')
    const narrow = renderSceneSvg(
      createChartScene(heatmap.build(whenFansBuyExample, paint, frame), {
        width: 320,
        height: 260
      }),
      { ariaLabel: 'x' }
    )
    const sizes = [...narrow.matchAll(/font-size="([\d.]+)"/g)].map((m) =>
      Number(m[1])
    )
    expect(sizes.length).toBeGreaterThan(0)
    expect(sizes.every((size) => size === frame.fontSize)).toBe(true)
  })

  it('keys the low and high ends in the legend', () => {
    expect(
      heatmap
        .legend(whenFansBuyExample, paint, plotFrame(220, 'default'))
        .map((i) => i.label)
    ).toEqual(['Fewer', 'More'])
    expect(
      heatmap
        .legend(sectionPaceExample, paint, plotFrame(220, 'default'))
        .map((i) => i.label)
    ).toEqual(['Behind', 'Ahead'])
  })

  it('names the plot by its peak, and speaks a cell', () => {
    expect(
      heatmap.summary({ ...whenFansBuyExample, takeaway: undefined })
    ).toBe('Orders peak on Fri at 6pm, with 42')
    expect(
      heatmap.describe(
        { x: '6pm', y: 42, series: 'Fri', index: 0 },
        whenFansBuyExample
      )
    ).toBe('Fri, 6pm, 42 orders')
  })

  it('puts the cell value and its colour in the tooltip', () => {
    const content = heatmap.tooltip(
      [{ x: '6pm', y: 42, series: 'Fri', index: 23 }],
      whenFansBuyExample,
      paint
    )
    expect(content).toEqual({
      title: 'Fri, 6pm',
      rows: [
        { label: 'Orders', value: '42', color: paint.heat[8], shape: 'swatch' }
      ]
    })
  })

  it('asks for the empty state with no values', () => {
    const empty = { data: [], rows: 'r', columns: 'c', value: 'v' }
    expect(heatmap.emptyMessage(empty)).toBe('Nothing to show yet')
    expect(heatmap.summary(empty)).toBe('V by r and c')
    expect(heatmap.emptyMessage(whenFansBuyExample)).toBeUndefined()
  })
})

describe('heatmapTable', () => {
  it('puts rows down the side and columns across, with every value', () => {
    const table = heatmapTable(whenFansBuyExample)
    expect(table.columns.map((c) => c.header)).toEqual([
      'Weekday',
      '9am',
      '12pm',
      '3pm',
      '6pm',
      '9pm'
    ])
    expect(table.rows).toHaveLength(7)
    expect(table.rows[4]).toMatchObject({ weekday: 'Fri', '6pm': 42 })
  })

  it('leaves a missing cell empty', () => {
    const table = heatmapTable({
      data: [
        { r: 'a', c: 'x', v: 1 },
        { r: 'b', c: 'y', v: 2 }
      ],
      rows: 'r',
      columns: 'c',
      value: 'v'
    })
    expect(table.rows).toEqual([
      { r: 'a', x: 1, y: null },
      { r: 'b', x: null, y: 2 }
    ])
  })
})

describe('heatmap with repeated cells', () => {
  it('adds up rows that land on the same cell', () => {
    const table = heatmapTable({
      data: [
        { day: 'Fri', hour: '9pm', orders: 4 },
        { day: 'Fri', hour: '9pm', orders: 3 },
        { day: 'Sat', hour: '9pm', orders: 2 }
      ],
      rows: 'day',
      columns: 'hour',
      value: 'orders'
    })
    expect(table.rows).toEqual([
      { day: 'Fri', '9pm': 7 },
      { day: 'Sat', '9pm': 2 }
    ])
  })
})

describe('heatmap summary on a diverging scale', () => {
  it('names the cells furthest ahead and behind', () => {
    expect(
      heatmap.summary({ ...sectionPaceExample, takeaway: undefined })
    ).toBe(
      'Furthest ahead is Floor at Week 1, with 12%. Furthest behind is Floor at Week 4, with -8%'
    )
  })
})
