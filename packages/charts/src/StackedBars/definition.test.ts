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

  it('draws no legend for a single series', () => {
    expect(
      stackedBars.legend(
        {
          data: [
            { band: '18 to 24', gender: 'All', sold: 40 },
            { band: '25 to 34', gender: 'All', sold: 60 }
          ],
          x: 'band',
          y: 'sold',
          series: 'gender'
        },
        paint,
        frame
      )
    ).toEqual([])
  })

  it.each([
    ['horizontal', 0],
    ['vertical', 0],
    ['horizontal', null],
    ['vertical', null]
  ] as const)(
    'keeps an ordered category with nothing in it, as an empty %s slot (%s)',
    (orientation, nothing) => {
      const bands = ['18 to 24', '25 to 34', '35 to 44']
      const svg = svgOf({
        data: bands.flatMap((band, i) => [
          { band, type: 'GA', sold: i === 1 ? nothing : 10 },
          { band, type: 'VIP', sold: i === 1 ? nothing : 5 }
        ]),
        x: 'band',
        y: 'sold',
        series: 'type',
        orientation
      })
      const across = orientation === 'vertical' ? 'x' : 'y'
      const drawnAt = bands.map((band) => {
        const tag = svg.match(new RegExp(`<text[^>]*>${band}<`))?.[0] ?? ''
        return Number(tag.match(new RegExp(` ${across}="([\\d.]+)"`))?.[1])
      })
      expect(drawnAt.every(Number.isFinite)).toBe(true)
      expect(drawnAt).toEqual([...drawnAt].sort((a, b) => a - b))
    }
  )

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
    ).toBe('GA is the largest type in every month')
    expect(
      stackedBars.summary({ ...presaleExample, takeaway: undefined })
    ).toBe('General is the largest phase overall')
    expect(
      stackedBars.describe(
        { x: 'Aug', y: 60, series: 'VIP', index: 1 },
        ticketMixExample
      )
    ).toBe('Aug, VIP, 60 sold')
    expect(
      stackedBars.describe(
        { x: 'Kazoo Hollow Room', y: 820, series: 'Presale', index: 0 },
        presaleExample
      )
    ).toBe('Kazoo Hollow Room, Presale, 820 sold, 56% of the bar')
  })

  it.each([0, null])(
    'names the leader only across bands with values (%s in one)',
    (nothing) => {
      const data = ['18 to 24', '25 to 34', '35 to 44'].flatMap((band, i) => [
        { band, type: 'GA', sales: i === 1 ? nothing : 10 },
        { band, type: 'VIP', sales: i === 1 ? nothing : 5 }
      ])
      expect(
        stackedBars.summary({ data, x: 'band', y: 'sales', series: 'type' })
      ).toBe('GA is the largest type in every band with data')
    }
  )

  it('lists every segment of the bar in the tooltip', () => {
    const tooltip = stackedBars.tooltip(
      [{ x: 'Kazoo Hollow Room', y: 820, series: 'Presale', index: 0 }],
      presaleExample,
      paint
    )
    expect(tooltip.title).toBe('Kazoo Hollow Room')
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
      total: 774
    })
  })

  it('shows zeros the bars leave out', () => {
    const table = stackedBarsTable(ticketMixExample)
    expect(table.rows.map((row) => row['Early bird'])).toEqual([300, 0, 0])
  })

  it('lists a category with no values, in data order, with empty cells', () => {
    const table = stackedBarsTable({
      data: [
        { band: '18 to 24', type: 'GA', sales: 10 },
        { band: '25 to 34', type: 'GA', sales: null },
        { band: '35 to 44', type: 'GA', sales: 4 }
      ],
      x: 'band',
      y: 'sales',
      series: 'type'
    })
    expect(table.rows).toEqual([
      { band: '18 to 24', GA: 10, total: 10 },
      { band: '25 to 34' },
      { band: '35 to 44', GA: 4, total: 4 }
    ])
  })

  it('keeps a column for a series that is zero everywhere', () => {
    const table = stackedBarsTable({
      data: [
        { c: 'A', s: 'Sold', v: 4 },
        { c: 'A', s: 'Comps', v: 0 },
        { c: 'B', s: 'Sold', v: 6 },
        { c: 'B', s: 'Comps', v: 0 }
      ],
      x: 'c',
      y: 'v',
      series: 's'
    })
    expect(table.columns.map((c) => c.header)).toEqual([
      'C',
      'Sold',
      'Comps',
      'Total'
    ])
    expect(table.rows).toEqual([
      { c: 'A', Sold: 4, Comps: 0, total: 4 },
      { c: 'B', Sold: 6, Comps: 0, total: 6 }
    ])
  })

  it('keeps a series named Total apart from the total', () => {
    const table = stackedBarsTable({
      data: [
        { c: 'A', s: 'Total', v: 5 },
        { c: 'A', s: 'Other', v: 2 }
      ],
      x: 'c',
      y: 'v',
      series: 's'
    })
    expect(table.columns.map((c) => c.header)).toEqual([
      'C',
      'Total',
      'Other',
      'Total'
    ])
    const keys = table.columns.map((c) => c.key)
    expect(new Set(keys).size).toBe(keys.length)
    expect(table.rows[0]).toMatchObject({ Total: 5, Other: 2, total: 7 })
  })

  it('shows shares as percents in share mode', () => {
    expect(stackedBarsTable(presaleExample).columns[1]).toMatchObject({
      format: 'percent'
    })
  })

  it('gives a zero-total row all zero shares, not NaN', () => {
    const table = stackedBarsTable({
      data: [
        { c: 'A', s: 'Sold', v: 0 },
        { c: 'A', s: 'Comps', v: 0 }
      ],
      x: 'c',
      y: 'v',
      series: 's',
      mode: 'share'
    })
    expect(table.rows[0]).toMatchObject({ Sold: 0, Comps: 0, total: 0 })
  })
})

describe('stackedBarsTable with more segments than the plot shows', () => {
  it('keeps a column for every segment the plot rolls into Other', () => {
    const data = Array.from({ length: 9 }, (_, i) => ({
      c: 'A',
      s: `S${i}`,
      v: i + 1
    }))
    const table = stackedBarsTable({ data, x: 'c', y: 'v', series: 's' })
    expect(table.columns.map((c) => c.header)).toEqual([
      'C',
      ...Array.from({ length: 9 }, (_, i) => `S${i}`),
      'Total'
    ])
    expect(table.rows[0]).toMatchObject({ S0: 1, S8: 9, total: 45 })
  })
})

describe('stackedBars summary with Other', () => {
  it('never leads with Other', () => {
    const data = [
      { c: 'A', s: 'Big', v: 10 },
      ...Array.from({ length: 8 }, (_, i) => ({
        c: 'A',
        s: `Small ${i}`,
        v: 3
      }))
    ]
    expect(stackedBars.summary({ data, x: 'c', y: 'v', series: 's' })).toBe(
      'Big is the largest s in every c'
    )
  })
})

describe('stackedBars decimal places', () => {
  const gross: StackedBarsProps = {
    data: [
      { show: 'A', type: 'GA', gross: 1200 },
      { show: 'A', type: 'VIP', gross: 600 }
    ],
    x: 'show',
    y: 'gross',
    series: 'type',
    format: 'currency',
    trailingZeroDisplay: 'stripIfInteger'
  }
  const ga = { x: 'A', y: 1200, series: 'GA', index: 0 }
  const values = (props: StackedBarsProps) =>
    stackedBars.tooltip([ga], props, paint).rows.map((r) => r.value)

  it('reads values to the decimal places in the tooltip, aloud and in the table', () => {
    expect(values(gross)).toEqual(['$1,200', '$600'])
    expect(values({ ...gross, mode: 'share' })).toEqual([
      '67% ($1,200)',
      '33% ($600)'
    ])
    expect(stackedBars.describe(ga, gross)).toBe('A, GA, $1,200 gross')
    const columns = stackedBarsTable(gross).columns
    expect(columns.find((c) => c.key === 'GA')).toMatchObject({
      trailingZeroDisplay: 'stripIfInteger'
    })
    expect(columns.at(-1)).toMatchObject({
      header: 'Total',
      trailingZeroDisplay: 'stripIfInteger'
    })
  })
})

describe('stackedBars shares to decimal places', () => {
  it('reads shares to the decimal places in share mode', () => {
    const share: StackedBarsProps = {
      data: [
        { show: 'A', type: 'GA', gross: 1200 },
        { show: 'A', type: 'VIP', gross: 600 }
      ],
      x: 'show',
      y: 'gross',
      series: 'type',
      format: 'currency',
      trailingZeroDisplay: 'stripIfInteger',
      decimals: 1,
      mode: 'share'
    }
    const ga = { x: 'A', y: 1200, series: 'GA', index: 0 }
    expect(
      stackedBars.tooltip([ga], share, paint).rows.map((r) => r.value)
    ).toEqual(['66.7% ($1,200)', '33.3% ($600)'])
    expect(stackedBars.describe(ga, share)).toMatch(/, 66\.7% of the bar$/)
    expect(
      stackedBarsTable(share).columns.find((c) => c.key === 'GA')
    ).toMatchObject({
      format: 'percent',
      decimals: 1,
      trailingZeroDisplay: 'stripIfInteger'
    })
  })
})
