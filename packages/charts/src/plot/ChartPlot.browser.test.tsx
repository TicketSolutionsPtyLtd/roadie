import { areaY, cell, defineChart, lineY } from '@tanstack/charts'
import { scaleLinear } from '@tanstack/charts/scales/linear'
import { cleanup, render } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { commands, userEvent } from 'vitest/browser'

import roadieCss from '../../vitest.browser.css?inline'
import { Chart } from '../Chart'
import { useStylesheet } from '../testUtils'
import { ChartPlot } from './ChartPlot'
import { seriesMarkId } from './series'
import { type TestProps, testChart, testPoints } from './testChart'
import type { ChartDefinition } from './types'

let removeStylesheet = () => {}
beforeAll(() => {
  removeStylesheet = useStylesheet(roadieCss)
})
afterAll(() => removeStylesheet())
afterEach(() => cleanup())

const sizes = [
  ['sm', 160],
  ['md', 220],
  ['lg', 260]
] as const

async function focusPlot(container: HTMLElement) {
  container.querySelector<SVGElement>('svg.ts-chart')!.focus()
  const live = container.querySelector('[data-slot=chart-plot-announcement]')!
  await expect.poll(() => live.textContent).not.toBe('')
  return live
}

function renderInCard(
  size: 'sm' | 'md' | 'lg' = 'md',
  width = 560,
  chart: ChartDefinition<TestProps> = testChart
) {
  return render(
    <div style={{ width }}>
      <Chart label='Test' source='Oztix sales.' size={size}>
        <ChartPlot chart={chart} props={{ points: testPoints }} />
      </Chart>
    </div>
  )
}

const heatmapLikeChart: ChartDefinition<TestProps> = {
  ...testChart,
  build: ({ points }, paint) =>
    defineChart({
      marks: [
        cell(
          [
            { x: 0, y: 0, bucket: 'low' },
            { x: 1, y: 0, bucket: 'high' }
          ],
          { id: 'cells', x: 'x', y: 'y', color: 'bucket' }
        ),
        areaY(
          points.filter((p) => p.series === 'A'),
          { id: seriesMarkId(1), x: 'x', y: 'y', fill: paint.categorical[0]! }
        )
      ],
      scales: {
        x: { scale: scaleLinear().domain([0, 3]) },
        y: { scale: scaleLinear().domain([0, 10]) }
      },
      color: { domain: ['low', 'high'], range: ['#111111', '#eeeeee'] }
    })
}

const areaChart: ChartDefinition<TestProps> = {
  ...testChart,
  build: ({ points }, paint) =>
    defineChart({
      marks: [
        areaY(
          points.filter((p) => p.series === 'A'),
          { id: seriesMarkId(1), x: 'x', y: 'y', fill: paint.categorical[0]! }
        ),
        lineY(
          points.filter((p) => p.series === 'B'),
          { id: seriesMarkId(2), x: 'x', y: 'y', stroke: paint.categorical[1]! }
        )
      ],
      scales: {
        x: { scale: scaleLinear().domain([0, 3]) },
        y: { scale: scaleLinear().domain([0, 10]) }
      }
    })
}

describe('ChartPlot in a card', () => {
  it.each(sizes)('fills the %s plot area', (size, height) => {
    const { container } = renderInCard(size)
    const plot = container.querySelector('[data-slot=chart-plot]')!
    const svg = container.querySelector('svg.ts-chart')!
    expect(Math.round(svg.getBoundingClientRect().height)).toBe(height)
    expect(Math.round(svg.getBoundingClientRect().width)).toBe(
      Math.round(plot.getBoundingClientRect().width)
    )
  })

  it('reaches every x value with the arrow keys and speaks each one', async () => {
    const { container } = renderInCard()
    const live = await focusPlot(container)
    const spoken = new Set<string>()
    for (let i = 0; i < 4; i++) {
      spoken.add(live.textContent ?? '')
      await userEvent.keyboard('{ArrowRight}')
    }
    expect(spoken.size).toBe(4)
    expect(
      container.querySelectorAll('[data-slot=chart-plot-tooltip] dt')
    ).toHaveLength(2)
  })

  it('moves between series with up and down', async () => {
    const { container } = renderInCard()
    const live = await focusPlot(container)
    const heard = [live.textContent]
    await userEvent.keyboard('{ArrowUp}')
    heard.push(live.textContent)
    await userEvent.keyboard('{ArrowDown}')
    await userEvent.keyboard('{ArrowDown}')
    heard.push(live.textContent)
    expect(new Set(heard).size).toBeGreaterThan(1)
    expect(heard.every((text) => text?.startsWith('0,'))).toBe(true)
  })

  it('goes from the top series to the one below it', async () => {
    const { container } = renderInCard()
    const live = await focusPlot(container)
    expect(live.textContent).toBe('0, 5 orders')
    await userEvent.keyboard('{ArrowUp}')
    expect(live.textContent).toBe('0, 5 orders')
    await userEvent.keyboard('{ArrowDown}')
    expect(live.textContent).toBe('0, 1 orders')
  })

  it('stays on the chosen series when moving along x', async () => {
    const { container } = renderInCard()
    const live = await focusPlot(container)
    await userEvent.keyboard('{ArrowDown}')
    await userEvent.keyboard('{ArrowRight}')
    expect(live.textContent).toBe('1, 2 orders')
    await userEvent.keyboard('{ArrowRight}')
    expect(live.textContent).toBe('2, 3 orders')
    await userEvent.keyboard('{ArrowLeft}')
    expect(live.textContent).toBe('1, 2 orders')
  })

  it('places the tooltip on the focused point in CSS pixels', async () => {
    const { container } = renderInCard('md', 420)
    await focusPlot(container)
    await userEvent.keyboard('{End}')
    const host = container
      .querySelector('[data-slot=chart-plot-host]')!
      .getBoundingClientRect()
    const dot = container
      .querySelector(
        `circle[data-ts-key^='${seriesMarkId(2)}:'][data-ts-key$=':number:3']`
      )!
      .getBoundingClientRect()
    const tooltip = container.querySelector<HTMLElement>(
      '[data-slot=chart-plot-tooltip]'
    )!
    expect(parseFloat(tooltip.style.left)).toBeCloseTo(
      (dot.left + dot.right) / 2 - host.left,
      0
    )
    expect(parseFloat(tooltip.style.top)).toBeCloseTo(
      (dot.top + dot.bottom) / 2 - host.top,
      0
    )
  })

  it('keeps every label at 11px or more on a phone', () => {
    const { container } = renderInCard('sm', 320)
    for (const text of container.querySelectorAll('svg.ts-chart text'))
      expect(
        parseFloat(getComputedStyle(text).fontSize)
      ).toBeGreaterThanOrEqual(11)
  })

  it('keeps the card height when switching to the table', async () => {
    const { container, getByRole } = renderInCard()
    const card = container.querySelector('[data-slot=data-card]')!
    const before = card.getBoundingClientRect().height
    await userEvent.click(getByRole('tab', { name: 'Table' }))
    expect(
      Math.abs(card.getBoundingClientRect().height - before)
    ).toBeLessThanOrEqual(0.5)
  })
})

describe('ChartPlot under forced colours', () => {
  it('swaps series fills for textures and dashes the lines after the first', async (context) => {
    const { container } = renderInCard('md', 560, areaChart)
    const area = container.querySelector(
      `path[data-ts-key^='${seriesMarkId(1)}:']`
    )!
    const line = container.querySelector(
      `path[data-ts-key^='${seriesMarkId(2)}:']`
    )!
    expect(getComputedStyle(area).fill).not.toContain('texture')

    await commands.forcedColors(true)
    try {
      if (!matchMedia('(forced-colors: active)').matches) {
        context.skip()
        return
      }
      // The scoped id from useChartPatterns, not the unscoped roadie-texture-1
      // fallback — proves var(--chart-texture-1) resolving to url(#…) works.
      expect(getComputedStyle(area).fill).toMatch(/texture-1/)
      expect(getComputedStyle(line).fill).toBe('none')
      expect(getComputedStyle(line).strokeDasharray).toMatch(
        /^6(px)?,? 3(px)?$/
      )
    } finally {
      await commands.forcedColors(false)
    }
  })

  it('keeps cell colours untextured while other marks still texture', async (context) => {
    const { container } = renderInCard('md', 560, heatmapLikeChart)
    const cells = container.querySelectorAll<SVGRectElement>(
      "rect[data-ts-key^='cells:']"
    )
    const series = container.querySelector(
      `path[data-ts-key^='${seriesMarkId(1)}:']`
    )!
    expect(cells.length).toBe(2)

    await commands.forcedColors(true)
    try {
      if (!matchMedia('(forced-colors: active)').matches) {
        context.skip()
        return
      }
      const fills = Array.from(cells, (cell) => getComputedStyle(cell).fill)
      expect(fills.every((fill) => !fill.includes('url('))).toBe(true)
      expect(new Set(fills).size).toBe(2)
      expect(getComputedStyle(series).fill).toMatch(/texture-1/)
    } finally {
      await commands.forcedColors(false)
    }
  })
})
